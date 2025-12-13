import Link from "next/link";

import type { JournalEntryRow } from "@/db/journal_entries";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  entries: JournalEntryRow[];
};

export function JournalEntriesList({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/30 bg-panel/30 p-6 text-sm text-muted">
        No entries yet.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {entries.map((e) => (
        <li key={e.id}>
          <Link href={`/journal/${e.id}`} className="block">
            <Card className="transition hover:translate-y-[-1px] hover:border-accent/25 hover:bg-panel/70">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {e.title?.trim() ? e.title : "Untitled"}
                    </div>
                    <div className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-muted">
                      {e.body}
                    </div>
                  </div>
                  <div className="shrink-0 font-mono text-xs text-muted">
                    {new Date(e.entry_at).toISOString().slice(0, 10)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ol>
  );
}
