import { NextResponse } from "next/server";

import { getBookByTokenId } from "@/services/polymarket/clob";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenId = (searchParams.get("token_id") ?? "").trim();

  if (!tokenId) {
    return NextResponse.json({ error: "token_id is required" }, { status: 400 });
  }

  const book = await getBookByTokenId(tokenId);
  return NextResponse.json({ book });
}
