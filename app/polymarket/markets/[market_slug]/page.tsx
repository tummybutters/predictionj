import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getMarketBySlug } from "@/services/polymarket/gamma";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

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

function formatPercentFromPriceString(price: string): string | null {
  const n = Number(price);
  if (!Number.isFinite(n)) return null;
  return `${Math.round(n * 100)}%`;
}

export default async function PolymarketMarketPage({
  params,
}: {
  params: { market_slug: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const market = await getMarketBySlug(params.market_slug);
  const resolveBy = toDateInputValue(market.endDateIso ?? market.endDate);
  const outcomes = safeParseStringArray(market.outcomes);
  const prices = safeParseStringArray(market.outcomePrices);

  const createHref = `/predictions?prefill=${encodeURIComponent(market.question ?? market.slug)}${
    resolveBy ? `&resolve_by=${encodeURIComponent(resolveBy)}` : ""
  }`;

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">{market.question ?? "Market"}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            {resolveBy ? <span className="font-mono">Ends: {resolveBy}</span> : null}
            <span className="font-mono">
              Bid: {market.bestBid ?? "—"} · Ask: {market.bestAsk ?? "—"}
            </span>
            <span className="font-mono">Slug: {market.slug}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/polymarket">
            <Button variant="secondary" size="sm">
              Back
            </Button>
          </Link>
          <Link href={createHref}>
            <Button size="sm">Make prediction</Button>
          </Link>
        </div>
      </header>

      {market.description ? (
        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-muted">Details</div>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">
            {market.description}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="text-sm font-medium text-muted">Outcomes</div>
        </CardHeader>
        <CardContent>
          {outcomes && prices && outcomes.length === prices.length ? (
            <ul className="space-y-2 text-sm">
              {outcomes.map((o, i) => (
                <li key={`${o}-${i}`} className="flex items-center justify-between gap-3">
                  <span className="font-medium">{o}</span>
                  <span className="font-mono text-muted">
                    {formatPercentFromPriceString(prices[i]) ?? prices[i]}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted">
              Outcome prices unavailable.
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

