"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: React.ReactNode;
  description?: React.ReactNode;
};

function CheckIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...props}>
      <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z" fill="currentColor" />
    </svg>
  );
}

export function Checkbox({ className, label, description, disabled, ...props }: CheckboxProps) {
  return (
    <label
      className={cn(
        "inline-flex items-start gap-3",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        className,
      )}
    >
      <input type="checkbox" disabled={disabled} className="peer sr-only" {...props} />

      <span
        className={cn(
          "group relative mt-[1px] grid size-6 flex-none place-items-center rounded-lg border border-border/20 bg-panel/55 shadow-plush transition-[transform,background-color,border-color,box-shadow] duration-350 ease-spring motion-reduce:transition-none",
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.22)_0%,transparent_60%)] before:opacity-70",
          "hover:border-accent/25 hover:bg-panel/70 active:scale-[0.98]",
          "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-accent/45",
          "peer-checked:border-accent/35 peer-checked:bg-[linear-gradient(135deg,rgba(var(--accent3),0.85),rgba(var(--accent),0.92),rgba(var(--accent2),0.85))] peer-checked:shadow-[0_18px_55px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.22)]",
          "peer-checked:[&_[data-check]]:opacity-100 peer-checked:[&_[data-check]]:scale-100 peer-checked:[&_[data-check]]:rotate-0 peer-checked:[&_[data-check]]:animate-checkPop",
          "peer-checked:[&_[data-ripple]]:opacity-100 peer-checked:[&_[data-ripple]]:animate-rippleSuccess",
          disabled && "cursor-not-allowed opacity-60 hover:bg-panel/55 active:scale-100",
        )}
      >
        <span
          aria-hidden="true"
          data-ripple
          className="pointer-events-none absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/25 opacity-0 motion-reduce:hidden"
        />
        <CheckIcon
          className={cn(
            "relative z-10 size-4 text-white opacity-0 transition-[opacity,transform] duration-350 ease-spring motion-reduce:transition-none",
            "transform scale-[0.35] rotate-[18deg]",
          )}
          data-check
        />
      </span>

      {label || description ? (
        <span className="min-w-0">
          {label ? (
            <span
              className={cn(
                "block text-sm font-medium text-text/90 transition-colors duration-200 ease-out",
                disabled && "text-muted",
              )}
            >
              {label}
            </span>
          ) : null}
          {description ? (
            <span className="mt-0.5 block text-sm text-muted">{description}</span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}
