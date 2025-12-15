import Link from "next/link";

import { listTrendingEvents, type GammaEvent } from "@/services/polymarket/gamma";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function toDateInputValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function formatVolume(value: string | undefined): string | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function bestVolume(e: GammaEvent): string | null {
  return (
    formatVolume(e.volume24hr) ??
    formatVolume(e.volume1wk) ??
    formatVolume(e.volume1mo) ??
    formatVolume(e.volume)
  );
}

export async function PolymarketTrendingEvents({ limit = 12 }: { limit?: number }) {
  const events = await listTrendingEvents(limit);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-muted">Trending on Polymarket</h2>
          <p className="mt-1 text-sm text-muted">
            Use these as prompts, then write down your own prediction.
          </p>
        </div>
        <Link href="/polymarket">
          <Button variant="secondary" size="sm">
            Explore
          </Button>
        </Link>
      </div>

      <div className="grid gap-3">
        {events.map((e) => {
          const resolveBy = toDateInputValue(e.endDate);
          const vol = bestVolume(e);
          const createHref = `/predictions?prefill=${encodeURIComponent(e.title)}${
            resolveBy ? `&resolve_by=${encodeURIComponent(resolveBy)}` : ""
          }`;

          return (
            <Card key={e.id} className="hover:border-accent/25 hover:bg-panel/70">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/polymarket/events/${encodeURIComponent(e.slug)}`}
                      className="line-clamp-2 text-sm font-medium hover:underline"
                    >
                      {e.title}
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                      {resolveBy ? <span className="font-mono">Ends: {resolveBy}</span> : null}
                      {vol ? <span className="font-mono">Vol: {vol}</span> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link href={`/polymarket/events/${encodeURIComponent(e.slug)}`}>
                      <Button variant="secondary" size="sm" className="h-9">
                        Details
                      </Button>
                    </Link>
                    <Link href={createHref}>
                      <Button size="sm" className="h-9">
                        Make prediction
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              {e.description ? (
                <CardContent className="pt-0">
                  <div className="line-clamp-2 text-sm text-muted">
                    {e.description}
                  </div>
                </CardContent>
              ) : null}
            </Card>
          );
        })}
      </div>
    </section>
  );
}

