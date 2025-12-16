"use client";

import * as React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { JournalEntryRow } from "@/db/journal_entries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { createBlankJournalEntryAction } from "@/app/journal/actions";
import { derivePreview, getDisplayTitle } from "@/app/journal/_components/journal-utils";

type EntryLite = Pick<JournalEntryRow, "id" | "title" | "body" | "entry_at" | "updated_at">;

type JournalEntriesContextValue = {
  entries: EntryLite[];
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

export function JournalShell({
  initialEntries,
  children,
}: {
  initialEntries: EntryLite[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const selectedId = getSelectedEntryId(pathname);

  const [entries, setEntries] = React.useState<EntryLite[]>(initialEntries);
  const [query, setQuery] = React.useState("");

  const updateEntryLocal = React.useCallback((id: string, patch: Partial<EntryLite>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
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
    <JournalEntriesContext.Provider value={{ entries, updateEntryLocal }}>
      <div className="space-y-4">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Journal</h1>
            <p className="mt-1 text-sm text-muted">
              Your library of entries — type <span className="font-mono">/</span> for commands,{" "}
              <span className="font-mono">@</span> to link.
            </p>
          </div>
          <Link href="/">
            <Button variant="secondary" size="sm">
              Home
            </Button>
          </Link>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr] lg:items-start">
          <aside className="glass-panel rounded-2xl p-3">
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
                <div className="rounded-xl border border-dashed border-border/30 bg-panel/30 p-4 text-sm text-muted">
                  No matches.
                </div>
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
                              {formatDateCompact(e.entry_at)}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </aside>

          <section className="min-h-[min(68vh,720px)]">{children}</section>
        </div>
      </div>
    </JournalEntriesContext.Provider>
  );
}

