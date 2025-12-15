import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getEventBySlug } from "@/services/polymarket/gamma";
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

export default async function PolymarketEventPage({
  params,
}: {
  params: { event_slug: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const event = await getEventBySlug(params.event_slug);
  const resolveBy = toDateInputValue(event.endDate);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">{event.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            {resolveBy ? <span className="font-mono">Ends: {resolveBy}</span> : null}
            <span className="font-mono">Event: {event.slug}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
        </div>
      </header>

      {event.description ? (
        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-muted">Details</div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="whitespace-pre-wrap">{event.description}</div>
            {event.tags?.length ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {event.tags.slice(0, 12).map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full border border-border/25 bg-panel/40 px-2 py-0.5 text-xs text-muted"
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted">Markets</h2>

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
                <Card key={m.id} className="hover:border-accent/25 hover:bg-panel/70">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/polymarket/markets/${encodeURIComponent(m.slug)}`}
                          className="line-clamp-2 text-sm font-medium hover:underline"
                        >
                          {m.question ?? "Market"}
                        </Link>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                          {mResolveBy ? (
                            <span className="font-mono">Ends: {mResolveBy}</span>
                          ) : null}
                          <span className="font-mono">
                            Bid: {m.bestBid ?? "—"} · Ask: {m.bestAsk ?? "—"}
                          </span>
                          {yesNo?.length ? (
                            <span className="text-muted">{yesNo.join(" · ")}</span>
                          ) : null}
                        </div>
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
                  </CardHeader>
                  {m.description ? (
                    <CardContent className="pt-0">
                      <div className="line-clamp-2 text-sm text-muted">
                        {m.description}
                      </div>
                    </CardContent>
                  ) : null}
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/30 bg-panel/30 p-6 text-sm text-muted">
            No markets found for this event.
          </div>
        )}
      </section>
    </main>
  );
}

