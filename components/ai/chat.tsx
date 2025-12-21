"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InsetPanel, Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";
import { useStreamingChat } from "@/components/ai/use-streaming-chat";

export function AiChat() {
  const [mode, setMode] = React.useState<"auto" | "ask" | "make">("auto");
  const [thinking, setThinking] = React.useState<"standard" | "extended">("standard");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const { messages, input, setInput, isSending, sendMessage, stop, clear } = useStreamingChat({
    storageKey: "pj_ai_chat_messages",
    apiPath: "/api/ai/assistant",
    getExtraBody: () => ({ mode, thinking }),
  });

  const endRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(160, el.scrollHeight)}px`;
  }, [input]);

  React.useEffect(() => {
    function onDocPointerDown(e: MouseEvent) {
      if (!menuOpen) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current && menuRef.current.contains(target)) return;
      setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [menuOpen]);

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-[-0.01em] text-text/80">Conversation</div>
          <div className="mt-1 text-xs text-muted">
            Enter to send · Shift+Enter for newline · <span className="font-mono">/clear</span> to
            reset
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={clear} title="Clear chat">
            Clear
          </Button>
          {isSending ? (
            <Button type="button" variant="destructive" size="sm" onClick={stop}>
              Stop
            </Button>
          ) : null}
        </div>
      </div>

      <InsetPanel className="mt-4 max-h-[min(62vh,760px)] overflow-auto p-4 pr-3 no-scrollbar">
        {messages.length === 0 ? (
          <EmptyState className="rounded-2xl">
            Ask about your journal, predictions, or beliefs. Try:{" "}
            <span className="font-mono">What’s due this week?</span>
          </EmptyState>
        ) : (
          <ol className="space-y-3">
            {messages.map((m) => (
              <li
                key={m.id}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div className="max-w-[86%]">
                  <InsetPanel
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-sm leading-6 transition-[transform,background-color,border-color,box-shadow] duration-350 ease-spring",
                      m.role === "user"
                        ? "border-accent/25 bg-accent/10 text-text shadow-plush"
                        : "border-border/15 bg-panel/55 text-text shadow-inset",
                    )}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </InsetPanel>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div ref={endRef} />
      </InsetPanel>

      <div className="mt-4">
        <div ref={menuRef} className="relative">
          {menuOpen ? (
            <Panel className="absolute bottom-[60px] left-0 z-20 w-[min(520px,calc(100vw-3rem))] p-2 shadow-glass">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-2xl border border-border/15 bg-panel2/35 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Mode
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { key: "auto" as const, label: "Auto" },
                      { key: "ask" as const, label: "Ask" },
                      { key: "make" as const, label: "Make" },
                    ].map((opt) => {
                      const active = mode === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setMode(opt.key)}
                          className={cn(
                            "rounded-full border px-3 py-2 text-xs font-semibold shadow-plush transition-[background-color,color,transform] duration-200 ease-out",
                            active
                              ? "border-accent/35 bg-accent text-white"
                              : "border-border/20 bg-panel/40 text-text/70 hover:bg-panel/55",
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    Auto decides whether to answer or create objects.
                  </div>
                </div>

                <div className="rounded-2xl border border-border/15 bg-panel2/35 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Thinking time
                  </div>
                  <div className="mt-2 flex gap-2">
                    {[
                      { key: "standard" as const, label: "Standard" },
                      { key: "extended" as const, label: "Extended" },
                    ].map((opt) => {
                      const active = thinking === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setThinking(opt.key)}
                          className={cn(
                            "flex-1 rounded-full border px-3 py-2 text-xs font-semibold shadow-plush transition-[background-color,color,transform] duration-200 ease-out",
                            active
                              ? "border-accent/35 bg-accent/15 text-text"
                              : "border-border/20 bg-panel/40 text-text/70 hover:bg-panel/55",
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    Extended may respond longer.
                  </div>
                </div>
              </div>
            </Panel>
          ) : null}

          <div
            className={cn(
              "relative flex items-center gap-3 rounded-[28px] border border-border/20 bg-panel/55 px-3 py-2 shadow-plush backdrop-blur-md",
              "transition-[border-color,box-shadow,background-color] duration-350 ease-spring",
              "focus-within:border-accent/35 focus-within:bg-panel/70 focus-within:ring-2 focus-within:ring-accent/15",
            )}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border border-border/15 bg-panel2/35 text-text/70 shadow-plush",
                "hover:bg-panel2/50",
              )}
              aria-label="Tools"
              aria-expanded={menuOpen}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={cn(
                "hidden items-center gap-2 rounded-full border border-border/15 bg-panel2/35 px-3 py-2 text-xs font-semibold text-text/70 shadow-plush",
                "hover:bg-panel2/50 md:flex",
              )}
              aria-label="Thinking"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a7 7 0 0 0-4 12.7V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.3A7 7 0 0 0 12 2Z" />
                <path d="M9 21h6" />
              </svg>
              Thinking
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-70"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Ask anything"
              className={cn(
                "min-h-[44px] w-full resize-none bg-transparent px-1 py-2 text-sm text-text/85 outline-none",
                "placeholder:text-muted/70",
              )}
              aria-label="Chat message"
            />

            <button
              type="button"
              className={cn(
                "hidden h-10 w-10 items-center justify-center rounded-full border border-border/15 bg-panel2/35 text-text/60 shadow-plush",
                "hover:bg-panel2/50 md:flex",
              )}
              aria-label="Voice (coming soon)"
              title="Voice (coming soon)"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <path d="M12 19v4" />
                <path d="M8 23h8" />
              </svg>
            </button>

            <button
              type="button"
              disabled={isSending || !input.trim()}
              onClick={sendMessage}
              className={cn(
                "flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold shadow-plush transition-[filter,transform,background-color] duration-200",
                input.trim()
                  ? "bg-accent text-white hover:brightness-105"
                  : "bg-panel2/35 text-muted",
              )}
            >
              {isSending ? "…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
