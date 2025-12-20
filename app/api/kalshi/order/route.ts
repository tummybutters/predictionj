import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createIfMissing } from "@/db/users";
import { createAndPostKalshiOrder, cancelKalshiOrderViaApp } from "@/services/kalshi/trading";
import { syncKalshiForUser } from "@/services/trading/sync";

export const runtime = "nodejs";

const TIME_IN_FORCE_VALUES = new Set(["fill_or_kill", "good_till_canceled", "immediate_or_cancel"]);

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toInt(value: unknown): number | null {
  const n = toNumber(value);
  return n == null ? null : Math.trunc(n);
}

function parsePriceCents(obj: Record<string, unknown>): number | null {
  const cents = toInt(obj.price_cents);
  if (cents != null) return cents;

  const price = toNumber(obj.price);
  if (price == null) return null;

  // Allow either [0,1] dollars or [1,99] cents.
  if (price > 0 && price < 1) return Math.round(price * 100);
  if (price >= 1 && price <= 99) return Math.round(price);
  return null;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: internalUserId } = await createIfMissing(userId);
  const body = (await req.json().catch(() => null)) as unknown;
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const ticker = String(obj.ticker ?? "").trim();
  const actionRaw = String(obj.action ?? "").trim().toLowerCase();
  const action = actionRaw === "buy" ? "buy" : actionRaw === "sell" ? "sell" : null;
  const sideRaw = String(obj.side ?? "").trim().toLowerCase();
  const side = sideRaw === "yes" ? "yes" : sideRaw === "no" ? "no" : null;
  const count = toInt(obj.count);
  const typeRaw = String(obj.type ?? "limit").trim().toLowerCase();
  const type = typeRaw === "market" ? "market" : "limit";
  const priceCents = parsePriceCents(obj);

  if (!ticker || !action || !side || !count) {
    return NextResponse.json(
      { error: "ticker, action, side, count are required" },
      { status: 400 },
    );
  }

  if (type === "limit" && priceCents == null) {
    return NextResponse.json(
      { error: "price (0..1) or price_cents (1..99) is required for limit orders" },
      { status: 400 },
    );
  }

  const tif =
    typeof obj.time_in_force === "string" && TIME_IN_FORCE_VALUES.has(obj.time_in_force)
      ? (obj.time_in_force as "fill_or_kill" | "good_till_canceled" | "immediate_or_cancel")
      : undefined;

  try {
    const resp = await createAndPostKalshiOrder({
      userId: internalUserId,
      ticker,
      action,
      side,
      count,
      type,
      price_cents: priceCents,
      time_in_force: tif,
      client_order_id: typeof obj.client_order_id === "string" ? obj.client_order_id : undefined,
    });

    await syncKalshiForUser(internalUserId).catch(() => null);

    return NextResponse.json({ ok: true, order: resp });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to place order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: internalUserId } = await createIfMissing(userId);
  const body = (await req.json().catch(() => null)) as unknown;
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const orderId = String(obj.order_id ?? "").trim();
  if (!orderId) return NextResponse.json({ error: "order_id is required" }, { status: 400 });

  try {
    const resp = await cancelKalshiOrderViaApp({ userId: internalUserId, orderId });
    await syncKalshiForUser(internalUserId).catch(() => null);
    return NextResponse.json({ ok: true, result: resp });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to cancel order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
