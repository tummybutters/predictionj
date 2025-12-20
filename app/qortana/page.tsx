import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AiChat } from "@/components/ai/chat";
import { PageHeader } from "@/components/app/page-header";

export default async function QortanaPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <PageHeader
        title="Qortana"
        subtitle="Your grounded co-thinker, connected to your journal."
        actions={
          <Link href="/dashboard">
            <Button variant="secondary" size="sm">
              Home
            </Button>
          </Link>
        }
      />

      <AiChat />
    </main>
  );
}
