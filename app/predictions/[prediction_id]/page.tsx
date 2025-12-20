import { redirect } from "next/navigation";

export default async function PredictionDetailRedirectPage({
  params,
}: {
  params: { prediction_id: string };
}) {
  redirect(`/journal/predictions?id=${encodeURIComponent(params.prediction_id)}`);
}
