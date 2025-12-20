import { redirect } from "next/navigation";

export default async function PredictionsRedirectPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams ?? {})) {
    if (typeof v === "string") qs.set(k, v);
    else if (Array.isArray(v) && typeof v[0] === "string") qs.set(k, v[0]);
  }
  const query = qs.toString();
  redirect(query ? `/journal/predictions?${query}` : "/journal/predictions");
}
