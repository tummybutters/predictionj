"use server";

import { revalidatePath } from "next/cache";

import { syncTradingNow } from "@/services/trading/sync";

export async function syncTradingNowAction() {
  await syncTradingNow();
  revalidatePath("/overview/portfolio");
}

