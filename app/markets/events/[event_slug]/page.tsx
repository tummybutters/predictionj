import Link from "next/link";

import { getEventBySlug } from "@/services/polymarket/gamma";

function toDateLabel(value: string | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function safeParseStringArray(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatCompact(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

export default async function MarketEventPage({ params }: { params: { event_slug: string } }) {
  const event = await getEventBySlug(params.event_slug);
  const resolveBy = toDateLabel(event.endDate);

  const markets = (event.markets ?? [])
    .slice()
    .sort(
      (a, b) =>
        (toNumber(b.volume) ?? 0) * 10 +
        (toNumber(b.liquidity) ?? 0) -
        ((toNumber(a.volume) ?? 0) * 10 + (toNumber(a.liquidity) ?? 0)),
    )
    .slice(0, 30);

  return (
    <main className="min-h-screen bg-bg px-6 pb-16 pt-8 text-text">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-muted">
              Markets <span className="text-muted/60">/</span> Polymarket
            </div>
            <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight">
              {event.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              {resolveBy ? (
                <span>
                  Ends <span className="font-mono text-text/75">{resolveBy}</span>
                </span>
              ) : null}
              <span className="font-mono text-muted">Event {event.slug}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/markets"
              className="inline-flex rounded-xl border border-border/20 bg-panel/45 px-4 py-2.5 text-sm font-semibold text-text/80 shadow-plush hover:bg-panel/60"
            >
              Back
            </Link>
            <Link
              href={`/journal/predictions?prefill=${encodeURIComponent(event.title)}${
                resolveBy ? `&resolve_by=${encodeURIComponent(resolveBy)}` : ""
              }`}
              className="inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-plush hover:brightness-105"
            >
              Make prediction
            </Link>
          </div>
        </div>

        {event.description ? (
          <div className="rounded-2xl border border-border/15 bg-panel/55 p-5 text-sm text-muted shadow-glass">
            {event.description}
          </div>
        ) : null}

        <div className="rounded-2xl border border-border/15 bg-panel/55 shadow-glass">
          <div className="flex items-center justify-between gap-3 border-b border-border/15 px-5 py-4">
            <div className="text-sm font-semibold text-text/85">Markets</div>
            <div className="text-xs text-muted">{markets.length} markets</div>
          </div>

          <div className="divide-y divide-border/15">
            {markets.map((m) => {
              const outcomes = safeParseStringArray(m.outcomes);
              const prices = safeParseStringArray(m.outcomePrices);
              const yesIdx = outcomes.findIndex((o) => o.toLowerCase() === "yes");
              const yesPrice =
                yesIdx !== -1 && typeof prices[yesIdx] === "string"
                  ? toNumber(prices[yesIdx])
                  : null;
              const yesLabel = yesPrice != null ? `Yes ${Math.round(yesPrice * 100)}c` : "—";
              const vol = formatCompact(toNumber(m.volume));
              const liq = formatCompact(toNumber(m.liquidity));
              return (
                <Link
                  key={m.slug}
                  href={`/markets/markets/${encodeURIComponent(m.slug)}`}
                  className="block px-5 py-4 transition-colors hover:bg-panel/60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-sm font-semibold text-text/90">
                        {m.question ?? m.slug}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span className="rounded-lg border border-border/20 bg-panel2/35 px-2 py-1 font-mono text-text/75">
                          {yesLabel}
                        </span>
                        <span>
                          Vol <span className="font-mono text-text/75">{vol}</span>
                        </span>
                        <span>
                          Liq <span className="font-mono text-text/75">{liq}</span>
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 rounded-xl border border-border/20 bg-panel2/35 px-3 py-2 text-xs font-semibold text-accent">
                      Open
                    </div>
                  </div>
                </Link>
              );
            })}

            {markets.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted">
                No markets found for this event.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
