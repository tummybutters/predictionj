"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { InsetPanel, Panel } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";
import type { JournalEntryRow } from "@/db/journal_entries";
import { cn } from "@/lib/cn";
import { deleteJournalEntryAction, saveJournalEntryDraftAction } from "@/app/journal/actions";
import { derivePreview, deriveTitle, getDisplayTitle } from "@/app/journal/_components/journal-utils";
import { useJournalEntries } from "@/app/journal/_components/journal-shell";
import styles from "@/app/journal/_components/journal-editor.module.css";

type Props = {
  entry: Pick<JournalEntryRow, "id" | "title" | "body" | "entry_at" | "updated_at">;
};

type ComposerMenu =
  | { type: "slash"; start: number; end: number; query: string }
  | { type: "mention"; start: number; end: number; query: string };

type SlashCommand = {
  id: string;
  label: string;
  hint: string;
  apply: () => string;
};

const SLASH_COMMANDS: SlashCommand[] = [
  { id: "todo", label: "Todo", hint: "Insert a checkbox item", apply: () => "- [ ] " },
  { id: "h1", label: "Heading", hint: "Insert a heading", apply: () => "# " },
  { id: "quote", label: "Quote", hint: "Insert a quote block", apply: () => "> " },
  { id: "divider", label: "Divider", hint: "Insert a horizontal rule", apply: () => "\n---\n" },
  {
    id: "date",
    label: "Date",
    hint: "Insert today’s date",
    apply: () => new Date().toISOString().slice(0, 10) + " ",
  },
];

function formatEntryAt(s: string): string {
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s;
  return d.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function findComposerMenu(value: string, caret: number): ComposerMenu | null {
  const before = value.slice(0, caret);
  let i = before.length - 1;
  while (i >= 0) {
    const ch = before[i];
    if (ch === "\n" || ch === " " || ch === "\t") break;
    i -= 1;
  }
  const start = i + 1;
  const token = before.slice(start);
  if (token.startsWith("/")) {
    return { type: "slash", start, end: caret, query: token.slice(1).toLowerCase() };
  }
  if (token.startsWith("@")) {
    return { type: "mention", start, end: caret, query: token.slice(1).toLowerCase() };
  }
  return null;
}

function replaceRange(value: string, start: number, end: number, next: string): { value: string; caret: number } {
  const v = value.slice(0, start) + next + value.slice(end);
  return { value: v, caret: start + next.length };
}

export function JournalEditor({ entry }: Props) {
  const { entries, updateEntryLocal } = useJournalEntries();
  const [body, setBody] = React.useState(entry.body);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [menu, setMenu] = React.useState<ComposerMenu | null>(null);
  const [menuIndex, setMenuIndex] = React.useState(0);

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const saveSeq = React.useRef(0);
  const lastSavedBody = React.useRef(entry.body);
  const localPreviewTimeout = React.useRef<number | null>(null);

  React.useEffect(() => {
    setBody(entry.body);
    setSaveState("idle");
    setMenu(null);
    setMenuIndex(0);
    lastSavedBody.current = entry.body;
  }, [entry.id, entry.body]);

  const mentionOptions = React.useMemo(() => {
    const q = menu?.type === "mention" ? menu.query.trim() : "";
    const pool = entries.filter((e) => e.id !== entry.id);
    const filtered = q
      ? pool.filter((e) => getDisplayTitle(e).toLowerCase().includes(q))
      : pool;
    return filtered.slice(0, 8);
  }, [entries, entry.id, menu?.query, menu?.type]);

  const slashOptions = React.useMemo(() => {
    const q = menu?.type === "slash" ? menu.query.trim() : "";
    if (!q) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter((c) => c.id.startsWith(q) || c.label.toLowerCase().includes(q));
  }, [menu?.query, menu?.type]);

  const optionsCount = menu?.type === "slash" ? slashOptions.length : menu?.type === "mention" ? mentionOptions.length : 0;

  function syncMenuFromCaret(nextValue: string) {
    const el = textareaRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? nextValue.length;
    const nextMenu = findComposerMenu(nextValue, caret);
    setMenu(nextMenu);
    setMenuIndex(0);
  }

  function applyMenuChoice(index: number) {
    const el = textareaRef.current;
    if (!el || !menu) return;

    if (menu.type === "slash") {
      const cmd = slashOptions[index];
      if (!cmd) return;
      const inserted = cmd.apply();
      const next = replaceRange(body, menu.start, menu.end, inserted);
      setBody(next.value);
      setMenu(null);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(next.caret, next.caret);
      });
      return;
    }

    const target = mentionOptions[index];
    if (!target) return;
    const title = getDisplayTitle(target);
    const inserted = `[[${title}]] `;
    const next = replaceRange(body, menu.start, menu.end, inserted);
    setBody(next.value);
    setMenu(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.caret, next.caret);
    });
  }

  React.useEffect(() => {
    if (localPreviewTimeout.current) window.clearTimeout(localPreviewTimeout.current);
    localPreviewTimeout.current = window.setTimeout(() => {
      updateEntryLocal(entry.id, { body });
    }, 120);
    return () => {
      if (localPreviewTimeout.current) window.clearTimeout(localPreviewTimeout.current);
      localPreviewTimeout.current = null;
    };
  }, [body, entry.id, updateEntryLocal]);

  React.useEffect(() => {
    if (body === lastSavedBody.current) return;
    const seq = ++saveSeq.current;
    setSaveState("saving");

    const handle = window.setTimeout(async () => {
      try {
        const result = await saveJournalEntryDraftAction({ id: entry.id, body });
        if (saveSeq.current !== seq) return;
        lastSavedBody.current = body;
        setSaveState("saved");
        updateEntryLocal(entry.id, { title: result.title, updated_at: result.updated_at, body });
      } catch {
        if (saveSeq.current !== seq) return;
        setSaveState("error");
      }
    }, 650);

    return () => window.clearTimeout(handle);
  }, [body, entry.id, updateEntryLocal]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!menu) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setMenu(null);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMenuIndex((v) => (optionsCount ? (v + 1) % optionsCount : 0));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setMenuIndex((v) => (optionsCount ? (v - 1 + optionsCount) % optionsCount : 0));
      return;
    }

    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      applyMenuChoice(menuIndex);
    }
  }

  function onKeyUp(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (menu && ["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.key)) return;
    syncMenuFromCaret(body);
  }

  const inferredTitle = deriveTitle(body);

  return (
    <div key={entry.id} className={cn("h-full", styles.enter)}>
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {inferredTitle ?? (entry.title?.trim() ? entry.title : "Untitled")}
            </div>
            <div className="mt-1 text-xs text-muted">{formatEntryAt(entry.entry_at)}</div>
          </div>

          <div className="flex items-center gap-2">
            <Pill
              tone={
                saveState === "saved"
                  ? "positive"
                  : saveState === "error"
                    ? "danger"
                    : "neutral"
              }
              className={cn(
                "px-2 py-1 font-mono text-[11px]",
                saveState === "idle" && "opacity-80",
              )}
              aria-live="polite"
            >
              {saveState === "saving"
                ? "Saving…"
                : saveState === "saved"
                  ? "Saved"
                  : saveState === "error"
                    ? "Save failed"
                    : "Ready"}
            </Pill>

            <form action={deleteJournalEntryAction}>
              <input type="hidden" name="id" value={entry.id} />
              <Button type="submit" variant="destructive" size="sm">
                Delete
              </Button>
            </form>
          </div>
        </div>

        <InsetPanel className={cn("relative mt-4 p-4 shadow-glass", styles.page)}>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              syncMenuFromCaret(e.target.value);
            }}
            onKeyDown={onKeyDown}
            onClick={() => syncMenuFromCaret(body)}
            onKeyUp={onKeyUp}
            placeholder="Write like it’s Notes…  (try “/todo” or “@” to link)"
            className={cn(
              "min-h-[52vh] w-full resize-none bg-transparent text-[15px] font-medium leading-7 text-text outline-none placeholder:text-muted/70",
              "transition-[color] duration-350 ease-spring motion-reduce:transition-none",
            )}
            spellCheck
          />

          {menu ? (
            <Panel className="absolute left-4 top-4 z-10 w-[min(360px,calc(100%-2rem))] border-border/15 bg-panel/80 p-2 shadow-glass backdrop-blur-md">
              <div className="px-2 pb-2 pt-1 text-xs text-muted">
                {menu.type === "slash" ? "Commands" : "Link to an entry"}
              </div>

              <div className="space-y-1">
                {menu.type === "slash" ? (
                  slashOptions.length === 0 ? (
                    <div className="px-2 py-2 text-sm text-muted">No commands found.</div>
                  ) : (
                    slashOptions.slice(0, 8).map((c, idx) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyMenuChoice(idx)}
                        className={cn(
                          "w-full rounded-xl px-2 py-2 text-left transition-[background-color,transform] duration-200 ease-out",
                          idx === menuIndex ? "bg-panel/70" : "hover:bg-panel/55",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-text">
                              /{c.id}{" "}
                              <span className="ml-1 text-xs font-normal text-muted">
                                {c.label}
                              </span>
                            </div>
                            <div className="mt-0.5 text-xs text-muted">{c.hint}</div>
                          </div>
                        </div>
                      </button>
                    ))
                  )
                ) : mentionOptions.length === 0 ? (
                  <div className="px-2 py-2 text-sm text-muted">No entries found.</div>
                ) : (
                  mentionOptions.map((e, idx) => (
                    <button
                      key={e.id}
                      type="button"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => applyMenuChoice(idx)}
                      className={cn(
                        "w-full rounded-xl px-2 py-2 text-left transition-[background-color,transform] duration-200 ease-out",
                        idx === menuIndex ? "bg-panel/70" : "hover:bg-panel/55",
                      )}
                    >
                      <div className="truncate text-sm font-medium text-text">
                        {getDisplayTitle(e)}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted">
                        {derivePreview(e.body) || "Empty"}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Panel>
          ) : null}
        </InsetPanel>
      </Panel>
    </div>
  );
}
