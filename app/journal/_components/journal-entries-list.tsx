import Link from "next/link";

import type { JournalEntryRow } from "@/db/journal_entries";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";

type Props = {
  entries: JournalEntryRow[];
};

export function JournalEntriesList({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <EmptyState>No entries yet.</EmptyState>
    );
  }

  return (
    <ol className="space-y-3">
      {entries.map((e) => (
        <li key={e.id}>
          <Link href={`/journal/${e.id}`} className="block">
            <Panel className="p-4 transition-[transform,background-color,border-color,box-shadow] duration-350 ease-spring hover:-translate-y-[1px] hover:border-accent/20 hover:bg-panel/70 hover:shadow-glass">
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
            </Panel>
          </Link>
        </li>
      ))}
    </ol>
  );
}
