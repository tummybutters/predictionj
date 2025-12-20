import "server-only";

import crypto from "crypto";

import { logTradingAction } from "@/db/trading_mirror";
import {
  cancelKalshiOrder,
  createKalshiOrder,
  type KalshiCreateOrderRequest,
} from "@/services/kalshi/api";

function toInt(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  return null;
}

export async function createAndPostKalshiOrder(input: {
  userId: string;
  ticker: string;
  action: "buy" | "sell";
  side: "yes" | "no";
  count: number;
  type?: "limit" | "market";
  price_cents?: number | null;
  time_in_force?: KalshiCreateOrderRequest["time_in_force"];
  client_order_id?: string;
}): Promise<unknown> {
  const ticker = input.ticker.trim();
  if (!ticker) throw new Error("ticker is required.");

  const count = toInt(input.count);
  if (!count || count < 1) throw new Error("count must be an integer >= 1.");

  const type = input.type ?? "limit";
  if (type !== "limit" && type !== "market") throw new Error("type must be 'limit' or 'market'.");

  const priceCents = input.price_cents == null ? null : toInt(input.price_cents);
  if (type === "limit") {
    if (priceCents == null || priceCents < 1 || priceCents > 99) {
      throw new Error("price_cents must be an integer in [1, 99] for limit orders.");
    }
  }

  const request: KalshiCreateOrderRequest = {
    ticker,
    side: input.side,
    action: input.action,
    count,
    type,
    client_order_id: input.client_order_id ?? crypto.randomUUID(),
  };
  if (input.time_in_force) request.time_in_force = input.time_in_force;
  if (type === "limit" && priceCents != null) {
    if (input.side === "yes") request.yes_price = priceCents;
    else request.no_price = priceCents;
  }

  await logTradingAction({
    userId: input.userId,
    provider: "kalshi",
    action_type: "place_order_attempt",
    request: { request } as Record<string, unknown>,
  });

  const response = await createKalshiOrder(input.userId, request);

  await logTradingAction({
    userId: input.userId,
    provider: "kalshi",
    action_type: "place_order_success",
    request: { request } as Record<string, unknown>,
    response: { response } as Record<string, unknown>,
  });

  return response;
}

export async function cancelKalshiOrderViaApp(input: {
  userId: string;
  orderId: string;
}): Promise<unknown> {
  const orderId = input.orderId.trim();
  if (!orderId) throw new Error("orderId is required.");

  await logTradingAction({
    userId: input.userId,
    provider: "kalshi",
    action_type: "cancel_order_attempt",
    request: { order_id: orderId } as Record<string, unknown>,
  });

  const response = await cancelKalshiOrder(input.userId, orderId);

  await logTradingAction({
    userId: input.userId,
    provider: "kalshi",
    action_type: "cancel_order_success",
    request: { order_id: orderId } as Record<string, unknown>,
    response: { response } as Record<string, unknown>,
  });

  return response;
}
