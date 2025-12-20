import { getMarketBySlug } from "@/services/polymarket/gamma";
import { PolymarketMarketTerminal } from "@/components/polymarket/market-terminal";
import { ensureUser } from "@/services/auth/ensure-user";
import { getClobBalances } from "@/services/polymarket/clob";
import { getPolymarketAccount } from "@/db/polymarket_accounts";
import { getEventBySlug, searchEvents } from "@/services/polymarket/gamma";

function toDateInputValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function safeParseStringArray(value: string | undefined): string[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    if (!parsed.every((v) => typeof v === "string")) return null;
    return parsed;
  } catch {
    return null;
  }
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export default async function MarketPage({
  params,
}: {
  params: { market_slug: string };
}) {
  const ensured = await ensureUser();

  const market = await getMarketBySlug(params.market_slug);
  const resolveBy = toDateInputValue(market.endDateIso ?? market.endDate);
  const outcomes = safeParseStringArray(market.outcomes) ?? [];
  const tokenIds = safeParseStringArray(market.clobTokenIds) ?? [];

  let cashBalance: number | null = null;
  try {
    const account = await getPolymarketAccount(ensured.user_id);
    if (account) {
      const balances = await getClobBalances(ensured.user_id);
      const usdc = balances.find(
        (b) => (b.asset_id ?? "").toLowerCase() === "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
      );
      cashBalance = usdc ? toNumber(usdc.balance) : null;
    }
  } catch {
    cashBalance = null;
  }

  const relatedMarkets = await (async () => {
    const q = (market.question ?? market.slug).split(/\s+/).slice(0, 4).join(" ").trim();
    if (!q) return [];
    try {
      const events = await searchEvents(q);
      const relatedEvents = events.filter((e) => e.slug !== market.slug).slice(0, 3);
      const full = await Promise.all(
        relatedEvents.map(async (e) => {
          try {
            return await getEventBySlug(e.slug);
          } catch {
            return null;
          }
        }),
      );

      return full
        .flatMap((e) => (e?.markets ?? []).slice(0, 1))
        .filter((m): m is NonNullable<typeof m> => Boolean(m?.slug))
        .map((m) => {
          const parsedOutcomes = safeParseStringArray(m.outcomes) ?? [];
          const parsedPrices = safeParseStringArray(m.outcomePrices) ?? [];
          const yesIdx = parsedOutcomes.findIndex((o) => o.toLowerCase() === "yes");
          const price =
            yesIdx !== -1 && typeof parsedPrices[yesIdx] === "string"
              ? toNumber(parsedPrices[yesIdx])
              : toNumber(m.bestBid);
          return { slug: m.slug, question: m.question ?? m.slug, price };
        })
        .slice(0, 3);
    } catch {
      return [];
    }
  })();

  return (
    <PolymarketMarketTerminal
      market={{
        slug: market.slug,
        question: market.question ?? "Market",
        description: market.description ?? null,
        endDate: resolveBy ?? null,
        conditionId: market.conditionId ?? null,
        outcomes,
        tokenIds,
        liquidity: market.liquidity ?? null,
        volume: market.volume ?? null,
      }}
      cashBalance={cashBalance}
      relatedMarkets={relatedMarkets}
    />
  );
}
