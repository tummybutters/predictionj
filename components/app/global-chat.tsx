"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { usePathname } from "next/navigation";

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
        const raw = localStorage.getItem("pj_global_chat_messages");
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
        localStorage.setItem("pj_global_chat_messages", JSON.stringify(messages.slice(-80)));
    } catch {
        // Ignore.
    }
}

export function GlobalChat() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = React.useState(false);
    const [messages, setMessages] = React.useState<ChatMessage[]>(() => []);
    const [input, setInput] = React.useState("");
    const [isSending, setIsSending] = React.useState(false);
    const abortRef = React.useRef<AbortController | null>(null);

    const endRef = React.useRef<HTMLDivElement | null>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    // Load messages on mount
    React.useEffect(() => {
        setMessages(loadMessages());
    }, []);

    // Save messages and scroll to bottom
    React.useEffect(() => {
        saveMessages(messages);
        if (isOpen) {
            endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }, [messages, isOpen]);

    // Auto-resize textarea
    React.useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "0px";
        el.style.height = `${Math.min(120, el.scrollHeight)}px`;
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
            const isAbort = e instanceof DOMException ? e.name === "AbortError" : false;
            const msg = isAbort ? "Stopped." : "Something went wrong. Try again.";
            setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: msg } : m)),
            );
        } finally {
            setIsSending(false);
            abortRef.current = null;
        }
    }

    // Placeholder for stop function if needed in future
    // function stop() {
    //   abortRef.current?.abort();
    // }

    // Don't show on the main Assistant page to avoid double chat
    if (pathname === "/ai") return null;

    return (
        <div className="fixed bottom-6 right-6 z-[200]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: "bottom right" }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={cn(
                            "mb-4 flex flex-col overflow-hidden rounded-[24px] border border-white/40 bg-white/60 shadow-[0_32px_128px_rgba(0,0,0,0.18)] backdrop-blur-2xl",
                            "w-[90vw] max-w-[400px] h-[600px] max-h-[80vh]"
                        )}
                        style={{ isolation: "isolate" }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-black/5 bg-white/40 px-5 py-4">
                            <div>
                                <h3 className="text-sm font-bold tracking-tight text-black/80">Gemini 3 Assistant</h3>
                                <p className="text-[10px] font-medium uppercase tracking-widest text-black/40">Grounded Context</p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-black/60 transition-colors hover:bg-black/10"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                            {messages.length === 0 ? (
                                <div className="flex h-full flex-col items-center justify-center p-8 text-center opacity-40">
                                    <div className="mb-4 rounded-full bg-black/5 p-4">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                    </div>
                                    <p className="text-sm font-medium">Ask anything about your entries, predictions, or beliefs.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {messages.map((m) => (
                                        <div
                                            key={m.id}
                                            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                                        >
                                            <div
                                                className={cn(
                                                    "max-w-[85%] rounded-[18px] px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                                                    m.role === "user"
                                                        ? "bg-black text-white"
                                                        : "border border-black/5 bg-white/80 text-black/80"
                                                )}
                                            >
                                                <div className="whitespace-pre-wrap">{m.content}</div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={endRef} />
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="border-t border-black/5 bg-white/40 p-4">
                            <div className="relative flex items-end gap-2">
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
                                    placeholder="Ask something…"
                                    className={cn(
                                        "min-h-[44px] w-full resize-none rounded-[18px] border border-black/10 bg-white/60 px-4 py-3 pb-3 pr-12 text-sm text-black placeholder:text-black/30 shadow-inset",
                                        "focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white"
                                    )}
                                />
                                <button
                                    disabled={isSending || !input.trim()}
                                    onClick={sendMessage}
                                    className={cn(
                                        "absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-[12px] transition-all",
                                        input.trim() ? "bg-black text-white shadow-lg scale-100" : "bg-black/5 text-black/20 scale-90"
                                    )}
                                >
                                    {isSending ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    ) : (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                    )}
                                </button>
                            </div>
                            <div className="mt-2 text-center">
                                <p className="text-[9px] font-medium tracking-wide text-black/30 uppercase">
                                    Powered by Gemini 3 Flash
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full shadow-[0_16px_48px_rgba(0,0,0,0.15)] transition-all duration-300",
                    isOpen ? "bg-white text-black rotate-90" : "bg-black text-white"
                )}
            >
                {isOpen ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                )}
            </motion.button>
        </div>
    );
}
