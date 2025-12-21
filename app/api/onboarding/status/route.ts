import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createIfMissing } from "@/db/users";
import { getKalshiAccount } from "@/db/kalshi_accounts";
import { getPolymarketAccount } from "@/db/polymarket_accounts";
import { createSupabaseServerClient } from "@/db/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await createIfMissing(clerkUserId);

  const [poly, kalshi] = await Promise.all([
    getPolymarketAccount(user.id).catch(() => null),
    getKalshiAccount(user.id).catch(() => null),
  ]);

  const connected = Boolean(poly) || Boolean(kalshi);

  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from("truth_objects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const hasObjects = (count ?? 0) > 0;
  // Onboarding is complete once the user has seeded their truth objects.
  // Market connections are strongly encouraged but optional.
  const complete = hasObjects;

  return NextResponse.json({
    connected,
    hasObjects,
    complete,
    needsConnect: false,
    needsSeedDump: !hasObjects,
  });
}
