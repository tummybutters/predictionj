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
        "relative isolate inline-flex items-center justify-center overflow-hidden rounded-full text-sm font-semibold tracking-[-0.01em] transition-[transform,box-shadow,background-color,border-color,color,filter] duration-350 ease-spring motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-50",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.28)_0%,transparent_60%)] before:opacity-80",
        variant === "default" &&
          "bg-gradient-to-b from-accent3/90 via-accent to-accent2/85 text-zinc-950 shadow-plush hover:brightness-105 active:translate-y-[1px]",
        variant === "secondary" &&
          "border border-border/20 bg-panel/55 text-text shadow-plush hover:bg-panel/70 active:translate-y-[1px]",
        variant === "destructive" &&
          "bg-gradient-to-b from-red-400 to-red-600 text-white shadow-plush hover:brightness-105 active:translate-y-[1px]",
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
