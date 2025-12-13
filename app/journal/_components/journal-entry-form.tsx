import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  title: string;
  description?: string;
  submitLabel: string;
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    id?: string;
    title?: string | null;
    body?: string;
  };
};

export function JournalEntryForm({
  title,
  description,
  submitLabel,
  action,
  defaultValues,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="text-sm font-medium">{title}</div>
        {description ? (
          <div className="mt-1 text-sm text-muted">{description}</div>
        ) : null}
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {defaultValues?.id ? (
            <input type="hidden" name="id" value={defaultValues.id} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Shipping prediction journal v0"
              defaultValue={defaultValues?.title ?? ""}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Content</Label>
            <Textarea
              id="body"
              name="body"
              required
              placeholder="Write your entry..."
              defaultValue={defaultValues?.body ?? ""}
            />
          </div>

          <div className="flex items-center justify-end">
            <Button type="submit">{submitLabel}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
