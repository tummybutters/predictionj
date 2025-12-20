import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { LandingHero } from "@/components/landing/landing-hero";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return <LandingHero />;
}
