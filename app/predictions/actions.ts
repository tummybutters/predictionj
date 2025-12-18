"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ensureUser } from "@/services/auth/ensure-user";
import {
  createWithInitialForecast,
  deleteOpenPrediction,
  listOpen as listOpenPredictions,
  openPaperPositionWorkflow,
  resolveAndSettlePaperPositions,
  updateForecast,
  updateLine,
  updateOpenPrediction,
} from "@/services/predictions";
import {
  predictionCreateSchema,
  predictionDeleteSchema,
  paperPositionOpenSchema,
  predictionForecastUpdateSchema,
  predictionLineUpdateSchema,
  predictionResolveSchema,
  predictionUpdateSchema,
} from "@/lib/validation/prediction";

export type ActionResponse<T = unknown> = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
  data?: T;
};

function getString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  return value;
}

function isDirectFormActionCall(arg1: unknown, arg2: unknown): arg1 is FormData {
  return arg1 instanceof FormData && arg2 === undefined;
}

/**
 * Robustly extracts FormData from either the first or second argument.
 * This makes the action compatible with both standard <form action={...}>
 * and useFormState/useActionState.
 */
function getFormData(arg1: unknown, arg2: unknown): FormData {
  if (arg1 instanceof FormData) return arg1;
  if (arg2 instanceof FormData) return arg2;
  throw new Error("No FormData found in arguments.");
}

export async function createPredictionAction(
  stateOrFormData: unknown,
  maybeFormData?: unknown,
): Promise<ActionResponse | null> {
  const formData = getFormData(stateOrFormData, maybeFormData);
  const ensured = await ensureUser();

  const parsed = predictionCreateSchema.safeParse({
    question: getString(formData, "question"),
    confidence: getString(formData, "confidence"),
    reference_line: getString(formData, "reference_line"),
    resolve_by: getString(formData, "resolve_by"),
  });

  if (!parsed.success) {
    if (isDirectFormActionCall(stateOrFormData, maybeFormData)) {
      redirect("/predictions?error=validation");
    }
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const row = await createWithInitialForecast(ensured.user_id, parsed.data);

  revalidatePath("/predictions");
  redirect(`/predictions/${row.id}`);

  // Unreachable (redirect throws), but keeps the return type consistent for useFormState.
  return null;
}

export async function updatePredictionAction(
  stateOrFormData: unknown,
  maybeFormData?: unknown,
): Promise<ActionResponse | null> {
  const formData = getFormData(stateOrFormData, maybeFormData);
  const ensured = await ensureUser();

  const parsed = predictionUpdateSchema.safeParse({
    id: getString(formData, "id"),
    question: getString(formData, "question"),
    confidence: getString(formData, "confidence"),
    reference_line: getString(formData, "reference_line"),
    resolve_by: getString(formData, "resolve_by"),
  });

  if (!parsed.success) {
    if (isDirectFormActionCall(stateOrFormData, maybeFormData)) {
      redirect("/predictions?error=validation");
    }
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateOpenPrediction(ensured.user_id, parsed.data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed.";
    if (isDirectFormActionCall(stateOrFormData, maybeFormData)) {
      redirect(`/predictions/${parsed.data.id}`);
    }
    return { success: false, message: msg };
  }

  revalidatePath("/predictions");
  revalidatePath(`/predictions/${parsed.data.id}`);
  redirect(`/predictions/${parsed.data.id}`);

  // Unreachable (redirect throws), but keeps the return type consistent for useFormState.
  return null;
}

export async function deletePredictionAction(formData: FormData): Promise<void>;
export async function deletePredictionAction(
  stateOrFormData: unknown,
  maybeFormData?: unknown,
): Promise<ActionResponse | void> {
  const formData = getFormData(stateOrFormData, maybeFormData);
  const ensured = await ensureUser();

  const parsed = predictionDeleteSchema.safeParse({
    id: getString(formData, "id"),
  });

  if (!parsed.success) {
    if (isDirectFormActionCall(stateOrFormData, maybeFormData)) {
      redirect("/predictions?error=validation");
    }
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await deleteOpenPrediction(ensured.user_id, parsed.data.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delete failed.";
    if (isDirectFormActionCall(stateOrFormData, maybeFormData)) {
      redirect(`/predictions/${parsed.data.id}`);
    }
    return { success: false, message: msg };
  }

  revalidatePath("/predictions");
  redirect("/predictions");
}

export async function resolvePredictionAction(formData: FormData): Promise<void>;
export async function resolvePredictionAction(
  stateOrFormData: unknown,
  maybeFormData?: unknown,
): Promise<ActionResponse | void> {
  const formData = getFormData(stateOrFormData, maybeFormData);
  const ensured = await ensureUser();

  const parsed = predictionResolveSchema.safeParse({
    id: getString(formData, "id"),
    outcome: getString(formData, "outcome"),
    note: getString(formData, "note"),
  });

  if (!parsed.success) {
    if (isDirectFormActionCall(stateOrFormData, maybeFormData)) {
      const id = getString(formData, "id");
      redirect(id ? `/predictions/${id}` : "/predictions");
    }
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await resolveAndSettlePaperPositions(ensured.user_id, parsed.data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Resolution failed.";
    if (isDirectFormActionCall(stateOrFormData, maybeFormData)) {
      redirect(`/predictions/${parsed.data.id}`);
    }
    return { success: false, message: msg };
  }

  revalidatePath("/predictions");
  revalidatePath(`/predictions/${parsed.data.id}`);
  redirect(`/predictions/${parsed.data.id}`);
}

export async function updatePredictionForecast(input: {
  prediction_id: string;
  probability: unknown;
  note?: unknown;
}): Promise<ActionResponse> {
  const ensured = await ensureUser();
  const parsed = predictionForecastUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateForecast(ensured.user_id, {
      prediction_id: parsed.data.prediction_id,
      probability: parsed.data.probability,
      note: parsed.data.note,
    });
    revalidatePath("/predictions");
    revalidatePath(`/predictions/${parsed.data.prediction_id}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forecast update failed.";
    return { success: false, message: msg };
  }
}

export async function updatePredictionLine(input: {
  prediction_id: string;
  reference_line: unknown;
}): Promise<ActionResponse> {
  const ensured = await ensureUser();
  const parsed = predictionLineUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateLine(ensured.user_id, {
      prediction_id: parsed.data.prediction_id,
      reference_line: parsed.data.reference_line,
    });
    revalidatePath("/predictions");
    revalidatePath(`/predictions/${parsed.data.prediction_id}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Line update failed.";
    return { success: false, message: msg };
  }
}

export async function openPaperPosition(input: {
  prediction_id: string;
  side: unknown;
  stake: unknown;
}): Promise<ActionResponse> {
  const ensured = await ensureUser();
  const parsed = paperPositionOpenSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await openPaperPositionWorkflow(ensured.user_id, parsed.data);
    revalidatePath("/predictions");
    revalidatePath(`/predictions/${parsed.data.prediction_id}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Opening position failed.";
    return { success: false, message: msg };
  }
}

// Convenience helper for pages that only need open predictions.
export async function listOpenPredictionsForCurrentUser() {
  const ensured = await ensureUser();
  return listOpenPredictions(ensured.user_id, { limit: 200 });
}
