import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getMarketBySlug } from "@/services/polymarket/gamma";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { Section } from "@/components/app/section";
import { EmptyState } from "@/components/ui/empty-state";
import { InsetPanel, Panel } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";

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
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <PageHeader
        title={<span className="text-balance">{market.question ?? "Market"}</span>}
        subtitle={
          <span className="text-muted">
            <span className="font-mono text-text/80">Slug {market.slug}</span>
            {" · "}
            {resolveBy ? (
              <>
                Ends <span className="font-mono text-text/80">{resolveBy}</span>
                {" · "}
              </>
            ) : null}
            <span className="font-mono text-text/80">
              Bid {market.bestBid ?? "—"} · Ask {market.bestAsk ?? "—"}
            </span>
          </span>
        }
        actions={
          <>
            <Link href="/polymarket">
              <Button variant="secondary" size="sm">
                Back
              </Button>
            </Link>
            <Link href={createHref}>
              <Button size="sm">Make prediction</Button>
            </Link>
          </>
        }
      />

      {market.description ? (
        <Panel className="p-5">
          <Section title="Details">
            <div className="whitespace-pre-wrap text-sm text-text/85">
              {market.description}
            </div>
          </Section>
        </Panel>
      ) : null}

      <Panel className="p-5">
        <Section title="Outcomes">
          {outcomes && prices && outcomes.length === prices.length ? (
            <div className="grid gap-2">
              {outcomes.map((o, i) => (
                <InsetPanel
                  key={`${o}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                >
                  <div className="min-w-0 text-sm font-semibold text-text/85">
                    {o}
                  </div>
                  <Pill className="px-2 py-1">
                    <span className="font-mono">
                      {formatPercentFromPriceString(prices[i]) ?? prices[i]}
                    </span>
                  </Pill>
                </InsetPanel>
              ))}
            </div>
          ) : (
            <EmptyState className="rounded-2xl">Outcome prices unavailable.</EmptyState>
          )}
        </Section>
      </Panel>
    </main>
  );
}
