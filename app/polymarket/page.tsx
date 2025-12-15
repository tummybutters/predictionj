import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PolymarketEventSearchBanner } from "@/components/polymarket/event-search-banner";

export const dynamic = "force-dynamic";

export default async function PolymarketPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <PolymarketEventSearchBanner />

      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Polymarket</h1>
          <p className="mt-1 text-sm text-muted">
            Search events for prompts, then write your own prediction.
          </p>
        </div>
        <Link href="/">
          <Button variant="secondary" size="sm">
            Home
          </Button>
        </Link>
      </header>
      <div className="rounded-2xl border border-border/25 bg-panel/30 p-4 text-sm text-muted">
        Tip: click an event to see all its markets, then hit “Make prediction” to
        turn it into your own commitment (no trading required).
      </div>
    </main>
  );
}
