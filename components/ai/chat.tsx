"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InsetPanel, Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";
import { useStreamingChat } from "@/components/ai/use-streaming-chat";

export function AiChat() {
  const { messages, input, setInput, isSending, sendMessage, stop, clear } = useStreamingChat({
    storageKey: "pj_ai_chat_messages",
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

      <div className="mt-3 flex items-end gap-2">
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
          placeholder="Message…  (Enter to send, Shift+Enter for newline)"
          className={cn(
            "min-h-[44px] w-full resize-none rounded-2xl border border-border/20 bg-panel/55 px-4 py-3 text-sm text-text shadow-plush",
            "transition-[box-shadow,border-color,background-color] duration-350 ease-spring motion-reduce:transition-none",
            "placeholder:text-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:bg-panel/70",
          )}
          aria-label="Chat message"
        />

        <Button type="button" className="h-[44px] px-5" disabled={isSending} onClick={sendMessage}>
          Send
        </Button>
      </div>
    </Panel>
  );
}
