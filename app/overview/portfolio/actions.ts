"use server";

import { revalidatePath } from "next/cache";

import { syncTradingNowForUser } from "@/services/trading/sync";
import { ensureUser } from "@/services/auth/ensure-user";
import { getTradingProviderPreference } from "@/lib/trading/provider";

export async function syncTradingNowAction() {
  const ensured = await ensureUser();
  const pref = getTradingProviderPreference();
  await syncTradingNowForUser(ensured.user_id, { preferredProvider: pref });
  revalidatePath("/overview/portfolio");
}
