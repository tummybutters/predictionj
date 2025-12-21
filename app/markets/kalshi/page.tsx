import Link from "next/link";
import { redirect } from "next/navigation";

import { ensureUser } from "@/services/auth/ensure-user";
import { cn } from "@/lib/cn";
import { Panel, InsetPanel } from "@/components/ui/panel";

export const runtime = "nodejs";

export default async function KalshiExplorePage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  await ensureUser();
  const raw = searchParams?.ticker;
  const ticker = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";

  if (ticker) {
    redirect(`/markets/kalshi/${encodeURIComponent(ticker)}`);
  }

  return (
    <main className="min-h-screen bg-bg px-6 pb-16 pt-8 text-text">
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <div className="text-3xl font-semibold tracking-tight">Kalshi</div>
          <div className="mt-1 text-sm text-muted">
            Enter a ticker to trade. Example:{" "}
            <span className="font-mono text-text/80">PRES-2028</span>
          </div>
        </div>

        <Panel className="p-6">
          <InsetPanel className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
              Jump to Ticker
            </div>
            <form
              action="/markets/kalshi"
              className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <input
                name="ticker"
                placeholder="Type a Kalshi market ticker…"
                className={cn(
                  "h-10 w-full flex-1 rounded-2xl border border-border/20 bg-panel/30 px-4 text-sm text-text/85 outline-none shadow-plush",
                  "placeholder:text-muted/60 focus:border-accent/35 focus:ring-2 focus:ring-accent/20",
                )}
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-plush hover:brightness-105"
              >
                Trade
              </button>
            </form>
          </InsetPanel>

          <div className="mt-4 text-sm text-muted">
            If you don’t know the ticker yet, browse Polymarket markets in Markets (Poly mode) or paste a ticker from Kalshi.
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              href="/settings"
              className="rounded-xl border border-border/20 bg-panel/45 px-4 py-2.5 text-sm font-semibold text-text/80 shadow-plush hover:bg-panel/60"
            >
              Connect Kalshi
            </Link>
            <Link
              href="/overview/portfolio"
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-plush hover:brightness-105"
            >
              View Portfolio
            </Link>
          </div>
        </Panel>
      </div>
    </main>
  );
}

