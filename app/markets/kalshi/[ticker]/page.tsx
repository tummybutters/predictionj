import Link from "next/link";

import { ensureUser } from "@/services/auth/ensure-user";
import { listKalshiMarketsByTickers, type KalshiMarket } from "@/services/kalshi/api";
import { KalshiMarketTerminal } from "@/components/kalshi/market-terminal";

export const runtime = "nodejs";

export default async function KalshiMarketPage({ params }: { params: { ticker: string } }) {
  await ensureUser();
  const ticker = decodeURIComponent(params.ticker ?? "").trim();
  if (!ticker) {
    return (
      <main className="min-h-screen bg-bg px-6 py-10 text-text">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border/15 bg-panel/55 p-8 shadow-glass">
          <div className="text-2xl font-semibold tracking-tight">Kalshi</div>
          <div className="mt-2 text-sm text-muted">Missing ticker.</div>
          <div className="mt-6">
            <Link href="/overview/portfolio" className="text-sm font-semibold text-accent hover:underline">
              Back to Portfolio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const marketResp = await listKalshiMarketsByTickers([ticker]).catch(() => null);
  const markets = (marketResp?.markets ?? []) as KalshiMarket[];
  const market =
    markets.find((m) => String(m?.ticker ?? "").trim() === ticker) ?? markets[0] ?? null;

  return (
    <main className="min-h-screen bg-bg px-6 pb-16 pt-8 text-text">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-3xl font-semibold tracking-tight">Trade</div>
            <div className="mt-1 text-sm text-muted">Place a Kalshi order.</div>
          </div>
          <Link href="/overview/portfolio" className="text-sm font-semibold text-accent hover:underline">
            Back to Portfolio
          </Link>
        </div>

        <KalshiMarketTerminal ticker={ticker} market={market} />
      </div>
    </main>
  );
}
