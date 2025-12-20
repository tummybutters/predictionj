"use client";

import * as React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { TruthObjectRow } from "@/db/truth_objects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { createBlankJournalEntryAction } from "@/app/journal/actions";
import { derivePreview, getDisplayTitle } from "@/lib/journal";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";

type EntryLite = Pick<TruthObjectRow, "id" | "title" | "body" | "created_at" | "updated_at" | "handle" | "type">;
type MentionableLite = Pick<TruthObjectRow, "id" | "type" | "handle" | "title" | "body" | "updated_at">;

type JournalEntriesContextValue = {
  entries: EntryLite[];
  mentionables: MentionableLite[];
  updateEntryLocal: (id: string, patch: Partial<EntryLite>) => void;
};

const JournalEntriesContext = React.createContext<JournalEntriesContextValue | null>(null);

export function useJournalEntries(): JournalEntriesContextValue {
  const ctx = React.useContext(JournalEntriesContext);
  if (!ctx) throw new Error("useJournalEntries must be used within <JournalShell />");
  return ctx;
}

function getSelectedEntryId(pathname: string): string | null {
  const m = pathname.match(/^\/journal\/([^/]+)$/);
  return m?.[1] ?? null;
}

function formatDateCompact(s: string): string {
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function parseTs(s: string | undefined): number {
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

function mergeEntries(prev: EntryLite[], nextFromServer: EntryLite[]): EntryLite[] {
  if (prev.length === 0) return nextFromServer;

  const prevById = new Map(prev.map((e) => [e.id, e]));
  const seen = new Set<string>();

  const merged: EntryLite[] = nextFromServer.map((serverRow) => {
    const local = prevById.get(serverRow.id);
    seen.add(serverRow.id);

    if (!local) return serverRow;

    // Prefer the newer version by updated_at; keep local fields if it's newer.
    return parseTs(serverRow.updated_at) >= parseTs(local.updated_at)
      ? { ...local, ...serverRow }
      : local;
  });

  // Keep any locally-present entries the server didn't send (defensive).
  for (const e of prev) {
    if (!seen.has(e.id)) merged.push(e);
  }

  return merged;
}

export function JournalShell({
  initialEntries,
  mentionables,
  children,
}: {
  initialEntries: EntryLite[];
  mentionables: MentionableLite[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const selectedId = getSelectedEntryId(pathname);

  const [entries, setEntries] = React.useState<EntryLite[]>(initialEntries);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    setEntries((prev) => mergeEntries(prev, initialEntries));
  }, [initialEntries]);

  const updateEntryLocal = React.useCallback((id: string, patch: Partial<EntryLite>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const t = getDisplayTitle(e).toLowerCase();
      const p = derivePreview(e.body).toLowerCase();
      return t.includes(q) || p.includes(q);
    });
  }, [entries, query]);

  return (
    <JournalEntriesContext.Provider value={{ entries, mentionables, updateEntryLocal }}>
      <div className="space-y-4">
        <PageHeader
          title="Journal"
          subtitle={
            <>
              Your library of entries — type <span className="font-mono">/</span> for commands,{" "}
              <span className="font-mono">@</span> to link.
            </>
          }
          actions={
            <Link href="/dashboard">
              <Button variant="secondary" size="sm">
                Home
              </Button>
            </Link>
          }
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr] lg:items-start">
          <aside className="h-fit">
            <Panel className="p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search entries"
                  className="h-9"
                  aria-label="Search entries"
                />
                <form action={createBlankJournalEntryAction}>
                  <Button type="submit" size="sm" className="h-9">
                    New
                  </Button>
                </form>
              </div>

              <div className="mt-3 max-h-[min(68vh,720px)] overflow-auto pr-1 no-scrollbar">
                {filtered.length === 0 ? (
                  <EmptyState className="rounded-2xl p-4">No matches.</EmptyState>
                ) : (
                  <ol className="space-y-1">
                  {filtered.map((e) => {
                    const active = e.id === selectedId;
                    const title = getDisplayTitle(e);
                    const preview = derivePreview(e.body);

                    return (
                      <li key={e.id}>
                        <Link
                          href={`/journal/${e.id}`}
                          className={cn(
                            "group block rounded-xl border px-3 py-2 transition-[transform,background-color,border-color,box-shadow] duration-350 ease-spring motion-reduce:transition-none",
                            active
                              ? "border-accent/35 bg-panel/75 shadow-glass"
                              : "border-border/20 bg-panel/35 hover:border-accent/25 hover:bg-panel/55 hover:shadow-plush",
                          )}
                          aria-current={active ? "page" : undefined}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-text">
                                {title}
                              </div>
                              <div className="mt-0.5 line-clamp-2 text-sm text-muted">
                                {preview || <span className="italic">Empty</span>}
                              </div>
                            </div>
                            <div className="shrink-0 font-mono text-[11px] text-muted">
                              {formatDateCompact(e.created_at)}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                  </ol>
                )}
              </div>
            </Panel>
          </aside>

          <section className="min-h-[min(68vh,720px)]">{children}</section>
        </div>
      </div>
    </JournalEntriesContext.Provider>
  );
}
