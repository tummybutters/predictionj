"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

export type SwitchProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "onClick"
> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  name?: string;
  value?: string;
};

export function Switch({
  checked,
  onCheckedChange,
  onClick,
  disabled,
  className,
  name,
  value,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled ? true : undefined}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || disabled) return;
        onCheckedChange(!checked);
      }}
      className={cn(
        "group relative inline-flex h-8 w-[68px] items-center rounded-full border border-border/20 bg-panel2/55 px-1 shadow-inset backdrop-blur-md transition-[transform,background-color,border-color,box-shadow] duration-350 ease-spring motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45",
        "hover:bg-panel2/70 active:translate-y-[1px]",
        checked && "bg-[linear-gradient(90deg,rgba(var(--accent2),0.85),rgba(var(--accent),0.9),rgba(var(--accent3),0.85))] shadow-[var(--shadow-inset),0_20px_65px_rgba(0,0,0,0.14)]",
        disabled && "cursor-not-allowed opacity-60 hover:bg-panel2/55 active:translate-y-0",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(140%_120%_at_50%_0%,rgba(255,255,255,0.35)_0%,transparent_62%)] opacity-70" />

      <span
        aria-hidden="true"
        className={cn(
          "relative grid size-6 place-items-center rounded-full bg-panel shadow-plush transition-transform duration-350 ease-spring motion-reduce:transition-none",
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.30)_0%,transparent_60%)] before:opacity-80",
          checked ? "translate-x-[34px]" : "translate-x-0",
        )}
      >
        <span className="relative size-2.5 rounded-full bg-border/25 transition-colors duration-350 ease-spring group-hover:bg-border/35" />
      </span>

      {name ? (
        <input
          type="checkbox"
          name={name}
          value={value}
          checked={checked}
          readOnly
          hidden
        />
      ) : null}
    </button>
  );
}
