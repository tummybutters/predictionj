import * as React from "react";

import { cn } from "@/lib/cn";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "destructive" | "ghost";
  size?: "default" | "sm";
};

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-50",
        variant === "default" &&
          "bg-accent text-zinc-950 shadow-plush hover:brightness-105 active:translate-y-[1px]",
        variant === "secondary" &&
          "border border-border/25 bg-panel/60 text-text shadow-plush hover:bg-panel/75 active:translate-y-[1px]",
        variant === "destructive" &&
          "bg-red-500 text-white shadow-plush hover:bg-red-400 active:translate-y-[1px]",
        variant === "ghost" &&
          "text-text hover:bg-panel/45 active:bg-panel/55",
        size === "default" && "h-10 px-4 py-2",
        size === "sm" && "h-9 px-3",
        className,
      )}
      {...props}
    />
  );
}
