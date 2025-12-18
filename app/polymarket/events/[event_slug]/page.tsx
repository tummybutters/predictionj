import Link from "next/link";

import { getEventBySlug } from "@/services/polymarket/gamma";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PolymarketEventMarketOverview } from "@/components/polymarket/event-market-overview";

function toDateInputValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
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

      {event.markets?.length ? (
        <PolymarketEventMarketOverview
          eventTitle={event.title}
          eventEndDate={event.endDate}
          eventDescription={event.description}
          tags={event.tags}
          markets={event.markets}
        />
      ) : (
        <EmptyState>No markets found for this event.</EmptyState>
      )}
    </main>
  );
}
