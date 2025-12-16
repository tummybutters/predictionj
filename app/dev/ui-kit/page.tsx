import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { UiKitClient } from "@/components/dev/ui-kit-client";

export const dynamic = "force-dynamic";

export default async function UiKitPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return <UiKitClient />;
}

