import { redirect } from "next/navigation";

export default async function PolymarketEventRedirectPage({
  params,
}: {
  params: { event_slug: string };
}) {
  redirect(`/markets/events/${encodeURIComponent(params.event_slug)}`);
}

