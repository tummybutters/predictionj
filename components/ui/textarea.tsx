import * as React from "react";

import { cn } from "@/lib/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-xl border border-border/25 bg-panel/55 px-3 py-2 text-sm text-text shadow-plush placeholder:text-muted/80 transition-[box-shadow,border-color,background-color] duration-350 ease-spring motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
