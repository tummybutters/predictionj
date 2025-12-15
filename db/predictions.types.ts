export type PredictionOutcome = "true" | "false" | "unknown";

export type PredictionRow = {
  id: string;
  user_id: string;
  claim: string;
  confidence: number;
  resolution_date: string;
  resolved_at: string | null;
  outcome: PredictionOutcome | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatePredictionInput = {
  claim: string;
  confidence: number;
  resolution_date: string;
};

export type UpdatePredictionInput = Partial<CreatePredictionInput> & {
  resolved_at?: string | null;
  outcome?: PredictionOutcome | null;
  resolution_note?: string | null;
};

