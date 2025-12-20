"use client";

import * as React from "react";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type ApiMessage = {
  role: ChatRole;
  content: string;
};

type UseStreamingChatOptions = {
  storageKey: string;
  apiPath?: string;
  maxStoredMessages?: number;
  maxContextMessages?: number;
};

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function loadMessages(storageKey: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(storageKey);
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

function saveMessages(storageKey: string, messages: ChatMessage[], maxStored: number) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-maxStored)));
  } catch {
    // Ignore.
  }
}

export function useStreamingChat(options: UseStreamingChatOptions) {
  const {
    storageKey,
    apiPath = "/api/ai/chat",
    maxStoredMessages = 80,
    maxContextMessages = 24,
  } = options;

  const [messages, setMessages] = React.useState<ChatMessage[]>(() => []);
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    setMessages(loadMessages(storageKey));
  }, [storageKey]);

  React.useEffect(() => {
    saveMessages(storageKey, messages, maxStoredMessages);
  }, [storageKey, messages, maxStoredMessages]);

  const stop = React.useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = React.useCallback(() => {
    stop();
    setInput("");
    setMessages([]);
  }, [stop]);

  const sendMessage = React.useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

    if (text === "/clear") {
      clear();
      return;
    }

    const userMsg: ChatMessage = { id: uid(), role: "user", content: text };
    const assistantMsg: ChatMessage = { id: uid(), role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsSending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const payload: { messages: ApiMessage[] } = {
      messages: [...messages, userMsg]
        .slice(-maxContextMessages)
        .map(({ role, content }) => ({ role, content })),
    };

    try {
      const res = await fetch(apiPath, {
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
          prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m)),
        );
      }
    } catch (e: unknown) {
      const isAbort = e instanceof DOMException ? e.name === "AbortError" : false;
      const msg = isAbort ? "Stopped." : "Something went wrong. Try again.";
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: msg } : m)),
      );
    } finally {
      setIsSending(false);
      abortRef.current = null;
    }
  }, [apiPath, clear, input, isSending, maxContextMessages, messages]);

  return {
    messages,
    setMessages,
    input,
    setInput,
    isSending,
    sendMessage,
    stop,
    clear,
  };
}
