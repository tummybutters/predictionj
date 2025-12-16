import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AiChat } from "@/components/ai/chat";
import { PageHeader } from "@/components/app/page-header";

export const dynamic = "force-dynamic";

export default async function AiPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <PageHeader
        title="Assistant"
        subtitle="ChatGPT-style chat, grounded in your data."
        actions={
          <Link href="/">
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
