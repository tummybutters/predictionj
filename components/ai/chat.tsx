"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InsetPanel, Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ApiMessage = {
  role: "user" | "assistant";
  content: string;
};

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem("pj_ai_chat_messages");
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
      .map((m) => {
        const id = typeof m.id === "string" ? m.id : uid();
        const role = m.role === "assistant" ? "assistant" : "user";
        const content = typeof m.content === "string" ? m.content : "";
        return { id, role, content };
      });
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  try {
    localStorage.setItem("pj_ai_chat_messages", JSON.stringify(messages.slice(-80)));
  } catch {
    // Ignore.
  }
}

export function AiChat() {
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => []);
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  const endRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    setMessages(loadMessages());
  }, []);

  React.useEffect(() => {
    saveMessages(messages);
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(160, el.scrollHeight)}px`;
  }, [input]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isSending) return;

    if (text === "/clear") {
      setInput("");
      setMessages([]);
      return;
    }

    const userMsg: ChatMessage = { id: uid(), role: "user", content: text };
    const assistantMsg: ChatMessage = { id: uid(), role: "assistant", content: "" };

    const nextMessages = [...messages, userMsg, assistantMsg];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const payload: { messages: ApiMessage[] } = {
      messages: [...messages, userMsg].slice(-24).map(({ role, content }) => ({ role, content })),
    };

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: err || `Request failed (${res.status})` }
              : m,
          ),
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m,
          ),
        );
      }
    } catch (e: unknown) {
      const isAbort =
        e instanceof DOMException ? e.name === "AbortError" : false;
      const msg = isAbort ? "Stopped." : "Something went wrong. Try again.";
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: msg } : m)),
      );
    } finally {
      setIsSending(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-[-0.01em] text-text/80">
            Conversation
          </div>
          <div className="mt-1 text-xs text-muted">
            Enter to send · Shift+Enter for newline · <span className="font-mono">/clear</span> to reset
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setInput("/clear")}
            title="Clear chat"
          >
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
