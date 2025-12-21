import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { createIfMissing } from "@/db/users";
import { getKalshiAccount } from "@/db/kalshi_accounts";
import { getPolymarketAccount } from "@/db/polymarket_accounts";
import { createSupabaseServerClient } from "@/db/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { OnboardingWizard } from "@/app/onboarding/_components/onboarding-wizard";
import { ONBOARDING_MEMORY_EXTRACTION_PROMPT } from "@/lib/onboarding/seed-prompt";

export const runtime = "nodejs";

export default async function OnboardingPage() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) redirect("/sign-in");

  const user = await createIfMissing(clerkUserId);

  const [poly, kalshi] = await Promise.all([
    getPolymarketAccount(user.id).catch(() => null),
    getKalshiAccount(user.id).catch(() => null),
  ]);
  const connected = Boolean(poly) || Boolean(kalshi);

  const supabase = createSupabaseServerClient();
  const { count } = await supabase
    .from("truth_objects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const hasObjects = (count ?? 0) > 0;

  const complete = hasObjects;
  if (complete) redirect("/dashboard");

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 pb-20 pt-24">
      <PageHeader
        title="Onboarding"
        subtitle="Connect a market account, then import a one-shot snapshot of how you think."
      />

      <OnboardingWizard
        initialStatus={{
          connected,
          hasObjects,
          complete,
          needsConnect: false,
          needsSeedDump: !hasObjects,
        }}
        extractionPrompt={ONBOARDING_MEMORY_EXTRACTION_PROMPT}
      />
    </main>
  );
}
