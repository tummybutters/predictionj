import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createIfMissing } from "@/db/users";
import { createAndPostPolymarketOrder } from "@/services/polymarket/trading";
import { syncPolymarketForUser } from "@/services/trading/sync";

export const runtime = "nodejs";

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: internalUserId } = await createIfMissing(userId);

  const body = (await req.json().catch(() => null)) as unknown;
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const tokenId = String(obj.token_id ?? "").trim();
  const sideRaw = String(obj.side ?? "").trim().toUpperCase();
  const side = sideRaw === "BUY" ? "BUY" : sideRaw === "SELL" ? "SELL" : null;
  const price = toNumber(obj.price);
  const size = toNumber(obj.size);
  const tickSize = typeof obj.tick_size === "string" ? obj.tick_size.trim() : undefined;

  if (!tokenId || !side || price == null || size == null) {
    return NextResponse.json(
      { error: "token_id, side, price, size are required" },
      { status: 400 },
    );
  }

  try {
    const resp = await createAndPostPolymarketOrder({
      userId: internalUserId,
      tokenId,
      side,
      price,
      size,
      tickSize,
    });

    // Refresh mirrored portfolio state after placing an order.
    await syncPolymarketForUser(internalUserId).catch(() => null);

    return NextResponse.json({ ok: true, order: resp });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to place order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
