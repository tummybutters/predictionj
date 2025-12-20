import { redirect } from "next/navigation";

export default async function PolymarketMarketRedirectPage({
  params,
}: {
  params: { market_slug: string };
}) {
  redirect(`/markets/markets/${encodeURIComponent(params.market_slug)}`);
}

