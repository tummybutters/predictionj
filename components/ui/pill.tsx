import * as React from "react";

import { cn } from "@/lib/cn";

export type PillProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "accent" | "positive" | "danger";
};

export function Pill({ className, tone = "neutral", ...props }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-plush",
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

