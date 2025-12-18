import "server-only";

import {
  create as createBelief,
  deleteById as deleteBeliefById,
  get as getBelief,
  list as listBeliefs,
  update as updateBelief,
  type BeliefRow,
} from "@/db/beliefs";

export async function listUserBeliefs(userId: string, options?: { limit?: number }): Promise<BeliefRow[]> {
  return listBeliefs(userId, options);
}

export async function getUserBelief(userId: string, beliefId: string): Promise<BeliefRow | null> {
  return getBelief(userId, beliefId);
}

export async function createUserBelief(
  userId: string,
  input: { statement: string; is_foundational?: boolean },
): Promise<BeliefRow> {
  return createBelief(userId, input);
}

export async function updateUserBelief(
  userId: string,
  beliefId: string,
  patch: { statement?: string; is_foundational?: boolean },
): Promise<BeliefRow | null> {
  return updateBelief(userId, beliefId, patch);
}

export async function deleteUserBelief(
  userId: string,
  beliefId: string,
): Promise<{ id: string } | null> {
  return deleteBeliefById(userId, beliefId);
}

