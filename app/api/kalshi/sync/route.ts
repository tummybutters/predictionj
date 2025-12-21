import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createIfMissing } from "@/db/users";
import { syncKalshiForUser } from "@/services/trading/sync";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: internalUserId } = await createIfMissing(userId);

  try {
    await syncKalshiForUser(internalUserId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

