import { NextResponse } from "next/server";

import { searchEvents } from "@/services/polymarket/gamma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json({ events: [] });
  }

  const events = await searchEvents(q);
  return NextResponse.json({ events });
}

