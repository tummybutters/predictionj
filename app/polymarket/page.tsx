import { redirect } from "next/navigation";

export default async function PolymarketRedirectPage() {
  redirect("/markets");
}

