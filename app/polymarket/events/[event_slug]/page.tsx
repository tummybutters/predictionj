import Link from "next/link";

import { getEventBySlug } from "@/services/polymarket/gamma";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { Section } from "@/components/app/section";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";

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

export default async function PolymarketEventPage({
  params,
}: {
  params: { event_slug: string };
}) {
  const event = await getEventBySlug(params.event_slug);
  const resolveBy = toDateInputValue(event.endDate);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <PageHeader
        title={<span className="text-balance">{event.title}</span>}
        subtitle={
          <span className="text-muted">
            {resolveBy ? (
              <>
                Ends <span className="font-mono text-text/80">{resolveBy}</span>
                {" · "}
              </>
            ) : null}
            <span className="font-mono text-text/80">Event {event.slug}</span>
          </span>
        }
        actions={
          <>
            <Link href="/polymarket">
              <Button variant="secondary" size="sm">
                Back
              </Button>
            </Link>
            <Link
              href={`/predictions?prefill=${encodeURIComponent(event.title)}${
                resolveBy ? `&resolve_by=${encodeURIComponent(resolveBy)}` : ""
              }`}
            >
              <Button size="sm">Make prediction</Button>
            </Link>
          </>
        }
      />

      {event.description ? (
        <Panel className="p-5">
          <Section title="Details">
            <div className="whitespace-pre-wrap">{event.description}</div>
            {event.tags?.length ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {event.tags.slice(0, 12).map((t) => (
                  <Pill key={t.id} className="px-2 py-1 text-xs">
                    {t.label}
                  </Pill>
                ))}
              </div>
            ) : null}
          </Section>
        </Panel>
      ) : null}

      <Section title="Markets">
        {event.markets?.length ? (
          <div className="grid gap-3">
            {event.markets.map((m) => {
              const mResolveBy = toDateInputValue(m.endDateIso ?? m.endDate ?? event.endDate);
              const outcomes = safeParseStringArray(m.outcomes);
              const prices = safeParseStringArray(m.outcomePrices);

              const yesNo =
                outcomes && prices && outcomes.length === prices.length
                  ? outcomes
                      .slice(0, 4)
                      .map((o, i) => {
                        const pct = formatPercentFromPriceString(prices[i]);
                        return pct ? `${o}: ${pct}` : null;
                      })
                      .filter(Boolean)
                  : null;

              const createHref = `/predictions?prefill=${encodeURIComponent(
                m.question ?? event.title,
              )}${mResolveBy ? `&resolve_by=${encodeURIComponent(mResolveBy)}` : ""}`;

              return (
                <Panel
                  key={m.id}
                  className="p-4 transition-[transform,background-color,border-color,box-shadow] duration-350 ease-spring hover:-translate-y-[1px] hover:border-accent/20 hover:bg-panel/70 hover:shadow-glass"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/polymarket/markets/${encodeURIComponent(m.slug)}`}
                        className="line-clamp-2 text-sm font-semibold text-text/90 hover:underline"
                      >
                        {m.question ?? "Market"}
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                        {mResolveBy ? (
                          <Pill className="px-2 py-1">
                            <span className="font-mono">Ends {mResolveBy}</span>
                          </Pill>
                        ) : null}
                        <Pill className="px-2 py-1">
                          <span className="font-mono">
                            Bid {m.bestBid ?? "—"} · Ask {m.bestAsk ?? "—"}
                          </span>
                        </Pill>
                        {yesNo?.length ? (
                          <span className="text-muted">{yesNo.join(" · ")}</span>
                        ) : null}
                      </div>
                      {m.description ? (
                        <div className="mt-3 line-clamp-2 text-sm text-muted">
                          {m.description}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link href={`/polymarket/markets/${encodeURIComponent(m.slug)}`}>
                        <Button variant="secondary" size="sm">
                          Market
                        </Button>
                      </Link>
                      <Link href={createHref}>
                        <Button size="sm">Make prediction</Button>
                      </Link>
                    </div>
                  </div>
                </Panel>
              );
            })}
          </div>
        ) : (
          <EmptyState>No markets found for this event.</EmptyState>
        )}
      </Section>
    </main>
  );
}
