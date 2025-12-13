import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  title: string;
  submitLabel: string;
  action: (formData: FormData) => Promise<void>;
  disabled?: boolean;
  defaultValues?: {
    id?: string;
    question?: string;
    confidence?: number;
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
  return (
    <Card>
      <CardHeader>
        <div className="text-sm font-medium">{title}</div>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {defaultValues?.id ? (
            <input type="hidden" name="id" value={defaultValues.id} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Textarea
              id="question"
              name="question"
              required
              disabled={disabled}
              placeholder="Will X happen by Y?"
              defaultValue={defaultValues?.question ?? ""}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="confidence">Confidence</Label>
              <Input
                id="confidence"
                name="confidence"
                required
                disabled={disabled}
                inputMode="decimal"
                placeholder="0–1 or 0–100"
                defaultValue={
                  defaultValues?.confidence !== undefined
                    ? String(Math.round(defaultValues.confidence * 100))
                    : ""
                }
              />
              <div className="text-xs text-muted">
                Enter `0.65` or `65` for 65%.
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolve_by">Resolve by</Label>
              <Input
                id="resolve_by"
                name="resolve_by"
                type="date"
                required
                disabled={disabled}
                defaultValue={defaultValues?.resolve_by ?? ""}
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button type="submit" disabled={disabled}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
