import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AiChat } from "@/components/ai/chat";

export const dynamic = "force-dynamic";

export default async function AiPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Assistant</h1>
          <p className="mt-1 text-sm text-muted">ChatGPT-style chat, grounded in your data.</p>
        </div>
        <Link href="/">
          <Button variant="secondary" size="sm">
            Home
          </Button>
        </Link>
      </header>

      <AiChat />
    </main>
  );
}

