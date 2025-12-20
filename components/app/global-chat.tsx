"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { usePathname } from "next/navigation";
import { useStreamingChat } from "@/components/ai/use-streaming-chat";

export function GlobalChat() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const { messages, input, setInput, isSending, sendMessage } = useStreamingChat({
    storageKey: "pj_global_chat_messages",
  });

  const endRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Scroll to bottom when open
  React.useEffect(() => {
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

  // Placeholder for stop function if needed in future
  // function stop() {
  //   abortRef.current?.abort();
  // }

  // Don't show on the main Assistant page to avoid double chat
  // Also hide on Polymarket-style pages where the UI should match the mockups.
  if (
    pathname === "/qortana" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/markets") ||
    pathname.startsWith("/overview")
  ) {
    return null;
  }

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
              "w-[90vw] max-w-[400px] h-[600px] max-h-[80vh]",
            )}
            style={{ isolation: "isolate" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/5 bg-white/40 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-black/80">
                  Gemini 3 Assistant
                </h3>
                <p className="text-[10px] font-medium uppercase tracking-widest text-black/40">
                  Grounded Context
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-black/60 transition-colors hover:bg-black/10"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center opacity-40">
                  <div className="mb-4 rounded-full bg-black/5 p-4">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <p className="text-sm font-medium">
                    Ask anything about your entries, predictions, or beliefs.
                  </p>
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
                            : "border border-black/5 bg-white/80 text-black/80",
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
            <div className="border-t border-black/5 bg-white/40 p-5">
              <div className="relative flex items-center justify-end">
                {/* Modes (Visual parity with QuickCapture) */}
                <div
                  className={cn(
                    "absolute left-0 flex gap-2 transition-all duration-350 ease-spring",
                    (input.trim() || isSending) &&
                      "opacity-0 invisible pointer-events-none blur-sm -translate-x-2",
                  )}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-white/50 text-black/40 shadow-sm">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path>
                    </svg>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-white/50 text-black/40 shadow-sm">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 3v18h18"></path>
                      <path d="M7 14l3-3 4 4 6-7"></path>
                    </svg>
                  </div>
                </div>

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
                  placeholder="Ask anything…"
                  className={cn(
                    "min-h-[44px] w-full resize-none rounded-full border border-black/10 bg-white/65 px-4 py-3 pb-3 pr-12 text-sm text-black placeholder:text-black/35 shadow-plush",
                    "transition-all duration-350 ease-spring",
                    "focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white",
                    !input.trim() && !isSending ? "ml-24 max-w-[240px]" : "ml-0 max-w-full",
                  )}
                  style={{ transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 1.05)" }}
                />

                <button
                  disabled={isSending || !input.trim()}
                  onClick={sendMessage}
                  className={cn(
                    "absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
                    input.trim()
                      ? "bg-black text-white shadow-lg scale-100"
                      : "bg-black/5 text-black/20 scale-90",
                  )}
                >
                  {isSending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 12 7-7 7 7" />
                      <path d="M12 19V5" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="mt-3 text-center">
                <p className="text-[9px] font-bold tracking-widest text-black/25 uppercase">
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
          isOpen ? "bg-white text-black rotate-90" : "bg-black text-white",
        )}
      >
        {isOpen ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </motion.button>
    </div>
  );
}
