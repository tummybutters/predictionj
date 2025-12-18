import "server-only";

import { auth } from "@clerk/nextjs/server";

import { createIfMissing } from "@/db/users";

export type EnsuredUser = {
  user_id: string;
  clerk_user_id: string;
};

export async function ensureUser(): Promise<EnsuredUser> {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error("Not signed in.");
  }

  const user = await createIfMissing(clerkUserId);

  return {
    user_id: user.id,
    clerk_user_id: user.clerk_user_id,
  };
}
