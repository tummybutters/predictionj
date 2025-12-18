"use client";

import * as React from "react";
import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { PercentSliderField } from "@/app/predictions/_components/percent-slider-field";
import { ActionResponse } from "@/app/predictions/actions";

type Props = {
  title: string;
  submitLabel: string;
  action: (state: ActionResponse | null, formData: FormData) => Promise<ActionResponse | null>;
  disabled?: boolean;
  defaultValues?: {
    id?: string;
    question?: string;
    confidence?: number;
    reference_line?: number;
    resolve_by?: string;
  };
};

export function PredictionForm({
  title,
  submitLabel,
  action,
  disabled,
  defaultValues,
}: Props) {
  const [state, formAction] = useFormState<ActionResponse | null, FormData>(action, null);

  const defaultConfidencePercent =
    defaultValues?.confidence !== undefined
      ? Math.round(defaultValues.confidence * 100)
      : undefined;
  const defaultLinePercent =
    defaultValues?.reference_line !== undefined
      ? Math.round(defaultValues.reference_line * 100)
      : 50;

  return (
    <Panel className="p-4">
      <div className="text-sm font-semibold tracking-[-0.01em] text-text/80">
        {title}
      </div>
      <div className="mt-3">
        <form action={formAction} className="space-y-2.5">
          {defaultValues?.id ? (
            <input type="hidden" name="id" value={defaultValues.id} />
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="question" className="text-xs">
              Question
            </Label>
            <Input
              id="question"
              name="question"
              required
              disabled={disabled}
              placeholder="Will X happen by Y?"
              defaultValue={defaultValues?.question ?? ""}
              className="h-9 rounded-xl"
            />
            {state?.errors?.question && (
              <p className="text-[10px] text-red-400">{state.errors.question[0]}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
            <div className="space-y-1.5">
              <PercentSliderField
                id="confidence"
                name="confidence"
                label="Confidence"
                required
                disabled={disabled}
                defaultValue={defaultConfidencePercent}
                min={0}
                max={100}
                hint="Set your probability (0–100)."
                density="tight"
                className="justify-self-start lg:max-w-[320px]"
              />
              {state?.errors?.confidence && (
                <p className="text-[10px] text-red-400">{state.errors.confidence[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <PercentSliderField
                id="reference_line"
                name="reference_line"
                label="Line (reference %)"
                disabled={disabled}
                defaultValue={defaultLinePercent}
                min={1}
                max={99}
                hint="Your reference line (1–99)."
                className="justify-self-start sm:col-span-2 lg:col-span-1 lg:max-w-[320px]"
                density="tight"
              />
              {state?.errors?.reference_line && (
                <p className="text-[10px] text-red-400">
                  {state.errors.reference_line[0]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="resolve_by" className="text-xs">
                Resolve by
              </Label>
              <Input
                id="resolve_by"
                name="resolve_by"
                type="date"
                required
                disabled={disabled}
                defaultValue={defaultValues?.resolve_by ?? ""}
                className="h-9 rounded-xl"
              />
              {state?.errors?.resolve_by && (
                <p className="text-[10px] text-red-400">{state.errors.resolve_by[0]}</p>
              )}
            </div>
          </div>

          {state?.message && (
            <div className="rounded-xl border border-red-400/30 bg-red-950/20 px-3 py-2 text-xs text-red-200">
              {state.message}
            </div>
          )}

          <div className="flex items-center justify-end">
            <Button type="submit" size="sm" disabled={disabled} className="h-9">
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </Panel>
  );
}
