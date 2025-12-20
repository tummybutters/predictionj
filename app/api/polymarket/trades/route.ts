import { NextResponse } from "next/server";

import { listTradesByConditionId } from "@/services/polymarket/data-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conditionId = (searchParams.get("condition_id") ?? searchParams.get("market") ?? "").trim();
  const limitRaw = (searchParams.get("limit") ?? "").trim();
  const limit = limitRaw ? Number(limitRaw) : undefined;

  if (!conditionId) {
    return NextResponse.json({ error: "market (condition id) is required" }, { status: 400 });
  }

  const trades = await listTradesByConditionId({
    conditionId,
    limit: typeof limit === "number" && Number.isFinite(limit) ? limit : undefined,
  });

  return NextResponse.json({ trades });
}
