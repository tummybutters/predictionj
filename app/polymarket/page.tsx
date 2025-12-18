import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PolymarketEventSearchBanner } from "@/components/polymarket/event-search-banner";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/ui/panel";

export default async function PolymarketPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <PolymarketEventSearchBanner />

      <PageHeader
        title="Polymarket"
        subtitle="Search events for prompts, then write your own prediction."
        actions={
          <Link href="/">
            <Button variant="secondary" size="sm">
              Home
            </Button>
          </Link>
        }
      />

      <Panel className="p-4 text-sm text-muted">
        Tip: click an event to see all its markets, then hit “Make prediction” to
        turn it into your own commitment (no trading required).
      </Panel>
    </main>
  );
}
