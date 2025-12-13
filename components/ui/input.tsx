import * as React from "react";

import { cn } from "@/lib/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-xl border border-border/25 bg-panel/55 px-3 py-2 text-sm text-text shadow-plush placeholder:text-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
