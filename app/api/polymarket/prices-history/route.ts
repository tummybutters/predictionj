import { NextResponse } from "next/server";

import { getPricesHistory } from "@/services/polymarket/clob";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenId = (searchParams.get("token_id") ?? "").trim();

  if (!tokenId) {
    return NextResponse.json({ error: "token_id is required" }, { status: 400 });
  }

  const interval = (searchParams.get("interval") ?? "").trim();
  const startTsRaw = (searchParams.get("startTs") ?? "").trim();
  const endTsRaw = (searchParams.get("endTs") ?? "").trim();

  if (interval) {
    const history = await getPricesHistory({ tokenId, interval });
    return NextResponse.json({ points: history.history });
  }

  if (startTsRaw && endTsRaw) {
    const startTs = Number(startTsRaw);
    const endTs = Number(endTsRaw);
    if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) {
      return NextResponse.json({ error: "startTs and endTs must be numbers" }, { status: 400 });
    }
    const history = await getPricesHistory({ tokenId, startTs, endTs });
    return NextResponse.json({ points: history.history });
  }

  return NextResponse.json({ error: "Provide either interval or startTs+endTs" }, { status: 400 });
}
