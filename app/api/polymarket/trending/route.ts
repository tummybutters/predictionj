import { NextResponse } from "next/server";

import { listTrendingEvents } from "@/services/polymarket/gamma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Math.max(1, Math.min(20, Number(limitRaw))) : 5;

  const events = await listTrendingEvents(Number.isFinite(limit) ? limit : 5);
  return NextResponse.json({ events });
}
