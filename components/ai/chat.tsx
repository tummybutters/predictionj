"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
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
    <div className="glass-panel rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">AI</div>
        <div className="flex items-center gap-2">
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

      <div className="mt-3 max-h-[min(66vh,760px)] overflow-auto pr-1 no-scrollbar">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/30 bg-panel/30 p-6 text-sm text-muted">
            Ask about your journal, predictions, or beliefs. Try:{" "}
            <span className="font-mono">What’s due this week?</span>
          </div>
        ) : (
          <ol className="space-y-3">
            {messages.map((m) => (
              <li
                key={m.id}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[86%] rounded-2xl border px-4 py-3 text-sm leading-6 shadow-plush transition-[transform,background-color,border-color] duration-350 ease-spring",
                    m.role === "user"
                      ? "border-accent/25 bg-accent/10 text-text"
                      : "border-border/25 bg-panel/50 text-text",
                  )}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div ref={endRef} />
      </div>

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
            "min-h-[42px] w-full resize-none rounded-2xl border border-border/25 bg-panel/55 px-4 py-3 text-sm text-text shadow-plush",
            "transition-[box-shadow,border-color,background-color] duration-350 ease-spring motion-reduce:transition-none",
            "placeholder:text-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
          )}
          aria-label="Chat message"
        />

        <Button type="button" className="h-[42px] px-4" disabled={isSending} onClick={sendMessage}>
          Send
        </Button>
      </div>

      <div className="mt-2 text-xs text-muted">
        Uses your recent journal entries/predictions/beliefs as context. Type{" "}
        <span className="font-mono">/clear</span> to reset.
      </div>
    </div>
  );
}
