import Link from "next/link";
import Image from "next/image";

import { ensureUser } from "@/services/auth/ensure-user";
import {
  getEventBySlug,
  listTrendingEvents,
  searchEvents,
  type GammaEvent,
  type GammaMarket,
} from "@/services/polymarket/gamma";
import { cn } from "@/lib/cn";

function toDateLabel(value: string | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
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

function formatCompact(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

function formatUsdCompact(n: number | null | undefined): string {
  const compact = formatCompact(n);
  return compact === "—" ? compact : `$${compact}`;
}

const MARKET_CATEGORIES = [
  { key: "all", label: "All" },
  { key: "politics", label: "Politics" },
  { key: "crypto", label: "Crypto" },
  { key: "sports", label: "Sports" },
  { key: "science", label: "Science" },
  { key: "tech", label: "Tech" },
] as const;

type MarketCategory = (typeof MARKET_CATEGORIES)[number]["key"];

function categoryForEvent(e: GammaEvent): Exclude<MarketCategory, "all"> {
  const title = (e.title ?? "").toLowerCase();
  const tags = (e.tags ?? []).map((t) => `${t.slug}`.toLowerCase());

  const hasTag = (s: string) => tags.some((t) => t.includes(s));

  if (hasTag("polit") || /election|senate|house|president|trump|biden/.test(title))
    return "politics";
  if (hasTag("crypto") || /btc|bitcoin|eth|ethereum|crypto|solana|bnb|polygon/.test(title))
    return "crypto";
  if (hasTag("sport") || /nba|nfl|mlb|nhl|soccer|football|super bowl|world cup/.test(title))
    return "sports";
  if (hasTag("science") || /space|nasa|physics|biology|ai safety/.test(title)) return "science";
  return "tech";
}

function marketScore(m: GammaMarket): number {
  return (toNumber(m.volume) ?? 0) * 10 + (toNumber(m.liquidity) ?? 0);
}

function pickBestMarket(markets: GammaMarket[] | undefined): GammaMarket | null {
  if (!markets || markets.length === 0) return null;
  return markets.slice().sort((a, b) => marketScore(b) - marketScore(a))[0] ?? null;
}

function yesNoPrices(m: GammaMarket): { yes: number | null; no: number | null } {
  const outcomes = safeParseStringArray(m.outcomes);
  const prices = safeParseStringArray(m.outcomePrices);
  const yesIdx = outcomes.findIndex((o) => o.toLowerCase() === "yes");
  const noIdx = outcomes.findIndex((o) => o.toLowerCase() === "no");
  const yes = yesIdx !== -1 ? toNumber(prices[yesIdx]) : null;
  const no = noIdx !== -1 ? toNumber(prices[noIdx]) : null;
  return { yes, no };
}

type MarketCard = {
  event_slug: string;
  event_title: string;
  category: Exclude<MarketCategory, "all">;
  image: string | null;
  description: string | null;
  market_slug: string;
  market_question: string;
  end_date: string | null;
  volume: number | null;
  liquidity: number | null;
  yes_price: number | null;
  no_price: number | null;
};

function truncate(s: string | null | undefined, max: number): string | null {
  const text = (s ?? "").trim();
  if (!text) return null;
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function buildHref(base: string, params: Record<string, string | undefined | null>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const value = (v ?? "").trim();
    if (!value) continue;
    qs.set(k, value);
  }
  const query = qs.toString();
  return query ? `${base}?${query}` : base;
}

export default async function MarketsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  await ensureUser();
  const qRaw = searchParams?.q;
  const q = (Array.isArray(qRaw) ? qRaw[0] : qRaw)?.trim() ?? "";

  const catRaw = searchParams?.cat;
  const cat = (Array.isArray(catRaw) ? catRaw[0] : catRaw)?.trim() ?? "all";
  const category = (MARKET_CATEGORIES.some((c) => c.key === cat) ? cat : "all") as MarketCategory;

  const sortRaw = searchParams?.sort;
  const sort = (Array.isArray(sortRaw) ? sortRaw[0] : sortRaw)?.trim() ?? "volume";
  const sortKey = sort === "liquidity" ? "liquidity" : "volume";

  const limitRaw = searchParams?.limit;
  const limitStr = (Array.isArray(limitRaw) ? limitRaw[0] : limitRaw)?.trim() ?? "";
  const limitParsed = limitStr ? Number(limitStr) : 8;
  const limit = Math.max(8, Math.min(40, Number.isFinite(limitParsed) ? limitParsed : 8));

  const trendingBase = await listTrendingEvents(18).catch(() => []);
  const trending =
    trendingBase.length && trendingBase.some((e) => (e.markets ?? []).length > 0)
      ? trendingBase
      : (
          await Promise.all(
            trendingBase.slice(0, 18).map(async (e) => {
              try {
                return await getEventBySlug(e.slug);
              } catch {
                return null;
              }
            }),
          )
        ).filter((e): e is GammaEvent => Boolean(e));

  const results = q ? await searchEvents(q).catch(() => []) : [];

  return (
    <main className="min-h-screen bg-bg px-6 pb-16 pt-8 text-text">
      <div className="mx-auto max-w-6xl space-y-6">
        {q ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-3xl font-semibold tracking-tight">Search</div>
              <div className="mt-1 text-sm text-muted">
                Results for <span className="font-mono text-text/80">{q}</span>
              </div>
            </div>
          </div>
        ) : null}

        {q ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((e) => {
              const end = toDateLabel(e.endDate);
              const vol = formatUsdCompact(toNumber(e.volume24hr ?? e.volume));
              const excerpt = truncate(e.description ?? null, 140);
              return (
                <Link
                  key={e.slug}
                  href={`/markets/events/${encodeURIComponent(e.slug)}`}
                  className="group overflow-hidden rounded-3xl border border-border/15 bg-panel/55 shadow-glass transition-colors hover:bg-panel/70"
                >
                  <div className="relative aspect-[16/9] bg-panel2/40">
                    {e.image ? (
                      <Image
                        src={e.image}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-bg/70 via-bg/10 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="line-clamp-2 text-sm font-semibold text-text/90">
                        {e.title}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {end ? (
                          <>
                            Ends <span className="font-mono text-text/70">{end}</span>
                            {" · "}
                          </>
                        ) : null}
                        Vol <span className="font-mono text-text/70">{vol}</span>
                      </div>
                    </div>
                  </div>
                  {excerpt ? (
                    <div className="p-4 text-sm text-muted">{excerpt}</div>
                  ) : (
                    <div className="p-4 text-sm text-muted">—</div>
                  )}
                </Link>
              );
            })}

            {results.length === 0 ? (
              <div className="rounded-3xl border border-border/15 bg-panel/55 p-5 text-sm text-muted shadow-plush">
                No results.
              </div>
            ) : null}
          </div>
        ) : (
          (() => {
            const cards: MarketCard[] = trending
              .map((e) => {
                const best = pickBestMarket(e.markets);
                if (!best?.slug) return null;
                const { yes, no } = yesNoPrices(best);
                const end =
                  toDateLabel(best.endDateIso ?? best.endDate) ?? toDateLabel(e.endDate) ?? null;
                const categoryKey = categoryForEvent(e);
                return {
                  event_slug: e.slug,
                  event_title: e.title,
                  category: categoryKey,
                  image: best.image ?? e.image ?? null,
                  description: truncate(e.description ?? null, 160),
                  market_slug: best.slug,
                  market_question: best.question ?? best.slug,
                  end_date: end,
                  volume: toNumber(best.volume),
                  liquidity: toNumber(best.liquidity),
                  yes_price: yes,
                  no_price: no,
                };
              })
              .filter((c): c is NonNullable<typeof c> => Boolean(c));

            const filtered =
              category === "all" ? cards : cards.filter((c) => c.category === category);
            const sorted = filtered.slice().sort((a, b) => {
              const aKey = sortKey === "liquidity" ? (a.liquidity ?? 0) : (a.volume ?? 0);
              const bKey = sortKey === "liquidity" ? (b.liquidity ?? 0) : (b.volume ?? 0);
              return bKey - aKey;
            });

            const featured = sorted[0] ?? null;
            const gridMarkets = featured ? sorted.slice(1, 1 + limit) : sorted.slice(0, limit);
            const shownCount = (featured ? 1 : 0) + gridMarkets.length;
            const hasMore = sorted.length > shownCount;

            return (
              <>
                {featured ? (
                  <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                    <Link
                      href={`/markets/markets/${encodeURIComponent(featured.market_slug)}`}
                      className="group relative overflow-hidden rounded-3xl border border-border/15 bg-panel/55 shadow-glass"
                    >
                      <div className="relative h-[260px] w-full">
                        {featured.image ? (
                          <Image
                            src={featured.image}
                            alt=""
                            fill
                            unoptimized
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-r from-bg/70 via-bg/20 to-transparent" />
                        <div className="absolute left-6 top-6">
                          <span className="inline-flex items-center gap-2 rounded-full border border-border/20 bg-panel/55 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-text/80 shadow-plush">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                            Trending
                          </span>
                        </div>
                        <div className="absolute bottom-6 left-6 right-6">
                          <div className="text-xs text-muted">
                            {featured.category.charAt(0).toUpperCase() + featured.category.slice(1)}
                          </div>
                          <div className="mt-2 line-clamp-2 text-2xl font-semibold tracking-tight text-text/95">
                            {featured.market_question}
                          </div>
                        </div>
                      </div>
                    </Link>

                    <div className="rounded-3xl border border-border/15 bg-panel/55 p-6 shadow-glass">
                      <div className="text-sm text-muted">
                        {featured.description ??
                          "The race is heating up. Track the market and trade when you're ready."}
                      </div>
                      <div className="mt-4 text-xs text-muted">
                        <span className="font-mono text-text/80">
                          {formatUsdCompact(featured.volume)}
                        </span>{" "}
                        Volume
                        {featured.end_date ? (
                          <>
                            {" · "}
                            Ends <span className="font-mono text-text/70">{featured.end_date}</span>
                          </>
                        ) : null}
                      </div>

                      <div className="mt-5 space-y-2">
                        <div className="flex items-center justify-between rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3">
                          <div className="text-sm font-semibold text-text/85">Yes</div>
                          <div className="font-mono text-sm font-semibold text-accent">
                            {featured.yes_price != null
                              ? `${Math.round(featured.yes_price * 100)}c`
                              : "—"}
                          </div>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl border border-accent2/25 bg-accent2/10 px-4 py-3">
                          <div className="text-sm font-semibold text-text/85">No</div>
                          <div className="font-mono text-sm font-semibold text-accent2">
                            {featured.no_price != null
                              ? `${Math.round(featured.no_price * 100)}c`
                              : "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Link
                          href={`/markets/markets/${encodeURIComponent(featured.market_slug)}`}
                          className="inline-flex items-center justify-center rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-plush hover:brightness-105"
                        >
                          Trade Now
                        </Link>
                        <Link
                          href={`/markets/events/${encodeURIComponent(featured.event_slug)}`}
                          className="inline-flex items-center justify-center rounded-2xl border border-border/20 bg-panel2/35 px-4 py-2.5 text-sm font-semibold text-text/80 shadow-plush hover:bg-panel2/50"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {MARKET_CATEGORIES.map((c) => (
                      <Link
                        key={c.key}
                        href={buildHref("/markets", {
                          cat: c.key === "all" ? null : c.key,
                          sort: sortKey === "volume" ? null : sortKey,
                          limit: limit === 8 ? null : String(limit),
                        })}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                          category === c.key
                            ? "border-accent/35 bg-accent/15 text-text"
                            : "border-border/20 bg-panel/40 text-muted hover:bg-panel/60 hover:text-text/80",
                        )}
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                    <span>Sort by:</span>
                    <div className="rounded-full border border-border/20 bg-panel/40 px-3 py-1.5 shadow-plush">
                      <span className="font-mono text-text/80">
                        {sortKey === "liquidity" ? "Liquidity" : "Volume"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-accent/15 text-accent">
                      ≋
                    </span>
                    <div className="text-sm font-semibold text-text/85">Trending Markets</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {(["volume", "liquidity"] as const).map((k) => (
                      <Link
                        key={k}
                        href={buildHref("/markets", {
                          sort: k === "volume" ? null : k,
                          cat: category === "all" ? null : category,
                          limit: limit === 8 ? null : String(limit),
                        })}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                          sortKey === k
                            ? "border-accent/35 bg-accent/15 text-text"
                            : "border-border/20 bg-panel/40 text-muted hover:bg-panel/60 hover:text-text/80",
                        )}
                      >
                        {k === "volume" ? "Volume" : "Liquidity"}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {gridMarkets.map((m) => {
                    const href = `/markets/markets/${encodeURIComponent(m.market_slug)}`;
                    return (
                      <Link
                        key={m.market_slug}
                        href={href}
                        className="group overflow-hidden rounded-3xl border border-border/15 bg-panel/55 shadow-glass transition-colors hover:bg-panel/70"
                      >
                        <div className="relative aspect-[16/10] bg-panel2/40">
                          {m.image ? (
                            <Image
                              src={m.image}
                              alt=""
                              fill
                              unoptimized
                              className="object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : null}
                          <div className="absolute inset-0 bg-gradient-to-t from-bg/70 via-bg/10 to-transparent" />
                          <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-border/20 bg-panel/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text/80 shadow-plush">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                            Trending
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="line-clamp-2 text-sm font-semibold text-text/90">
                            {m.market_question}
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                            <span>{m.end_date ? `Ends ${m.end_date}` : "—"}</span>
                            <span className="font-mono text-text/70">
                              {formatUsdCompact(m.volume)}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-2xl border border-accent/25 bg-accent/10 px-3 py-2 text-xs font-semibold">
                              <div className="text-[10px] uppercase tracking-wider text-muted">
                                Yes
                              </div>
                              <div className="mt-1 font-mono text-accent">
                                {m.yes_price != null ? `${Math.round(m.yes_price * 100)}c` : "—"}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-accent2/25 bg-accent2/10 px-3 py-2 text-xs font-semibold">
                              <div className="text-[10px] uppercase tracking-wider text-muted">
                                No
                              </div>
                              <div className="mt-1 font-mono text-accent2">
                                {m.no_price != null ? `${Math.round(m.no_price * 100)}c` : "—"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {hasMore ? (
                  <div className="flex justify-center pt-2">
                    <Link
                      href={buildHref("/markets", {
                        cat: category === "all" ? null : category,
                        sort: sortKey === "volume" ? null : sortKey,
                        limit: String(Math.min(40, limit + 8)),
                      })}
                      className="inline-flex items-center justify-center rounded-2xl border border-border/20 bg-panel/55 px-4 py-2.5 text-sm font-semibold text-text/80 shadow-plush hover:bg-panel/70"
                    >
                      Show more markets →
                    </Link>
                  </div>
                ) : null}
              </>
            );
          })()
        )}
      </div>
    </main>
  );
}
