import * as React from "react";

import { cn } from "@/lib/cn";

export type PillProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "accent" | "positive" | "danger";
  sheen?: boolean;
};

export function Pill({ className, tone = "neutral", sheen = true, ...props }: PillProps) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-2 overflow-hidden rounded-full border px-3 py-1.5 text-xs shadow-plush",
        sheen &&
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(120%_120%_at_30%_0%,rgba(255,255,255,0.35)_0%,transparent_60%)] before:opacity-90",
        tone === "neutral" && "border-border/20 bg-panel/60 text-text/75",
        tone === "accent" && "border-accent/25 bg-accent/10 text-text/80",
        tone === "positive" && "border-accent/30 bg-accent/10 text-accent",
        tone === "danger" && "border-red-500/25 bg-red-500/10 text-red-300",
        className,
      )}
      {...props}
    />
  );
}
