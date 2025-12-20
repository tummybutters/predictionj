"use client";

import { PageHeader } from "@/components/app/page-header";
import { Section } from "@/components/app/section";
import { ConnectPolymarketAccount } from "@/components/polymarket/connect-account";
import { ConnectKalshiAccount } from "@/components/kalshi/connect-account";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 pb-20 pt-24">
      <PageHeader title="Settings" subtitle="Manage your integrations and account preferences." />

      <Section title="Integrations">
        <div className="space-y-6">
          <ConnectPolymarketAccount />
          <ConnectKalshiAccount />
        </div>
      </Section>
    </main>
  );
}
