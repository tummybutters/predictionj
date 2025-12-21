import "server-only";

import { cookies } from "next/headers";

import type { TradingProvider } from "@/db/trading_mirror";

export type TradingProviderPreference = TradingProvider | "auto";

const COOKIE_NAME = "pj_provider";

export function getTradingProviderPreference(): TradingProviderPreference {
  const raw = cookies().get(COOKIE_NAME)?.value ?? "auto";
  if (raw === "polymarket" || raw === "kalshi" || raw === "auto") return raw;
  return "auto";
}

