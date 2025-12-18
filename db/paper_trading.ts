import "server-only";

import { createSupabaseServerClient } from "@/db/supabase/server";
import { toNumber } from "@/db/utils";

type OpenPaperPositionRpcRow = {
  position_id: string;
  balance_after: number | string;
};

export async function openPaperPositionAtomic(input: {
  user_id: string;
  prediction_id: string;
  side: "yes" | "no";
  stake: number;
}): Promise<{ position_id: string; balance_after: number }> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("pj_open_paper_position", {
    p_user_id: input.user_id,
    p_prediction_id: input.prediction_id,
    p_side: input.side,
    p_stake: input.stake,
  });
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as OpenPaperPositionRpcRow | null | undefined;
  if (!row?.position_id) throw new Error("Paper position open failed.");
  return { position_id: row.position_id, balance_after: toNumber(row.balance_after) };
}

type ResolveAndSettleRpcRow = {
  prediction_id: string;
  balance_after: number | string;
  settled_count: number | string;
  total_payout: number | string;
};

export async function resolvePredictionAndSettlePaperPositionsAtomic(input: {
  user_id: string;
  prediction_id: string;
  outcome: "true" | "false";
  note: string | null;
}): Promise<{
  prediction_id: string;
  balance_after: number;
  settled_count: number;
  total_payout: number;
}> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("pj_resolve_prediction_and_settle_paper_positions", {
    p_user_id: input.user_id,
    p_prediction_id: input.prediction_id,
    p_outcome: input.outcome,
    p_note: input.note,
  });
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as ResolveAndSettleRpcRow | null | undefined;
  if (!row?.prediction_id) throw new Error("Prediction resolution failed.");
  return {
    prediction_id: row.prediction_id,
    balance_after: toNumber(row.balance_after),
    settled_count: Math.trunc(toNumber(row.settled_count)),
    total_payout: toNumber(row.total_payout),
  };
}

