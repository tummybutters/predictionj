"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function normalizePercentInput(raw: string): string {
  return raw.trim().replace(/%$/, "").replace(/,/g, "");
}

export function PercentSliderField({
  id,
  name,
  label,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  required,
  disabled,
  hint,
  density = "default",
  className,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  disabled?: boolean;
  hint?: React.ReactNode;
  density?: "default" | "compact" | "tight";
  className?: string;
}) {
  const compact = density === "compact";
  const tight = density === "tight";
  const [value, setValue] = React.useState(() =>
    defaultValue === undefined ? "" : String(Math.round(defaultValue)),
  );

  const normalized = normalizePercentInput(value);
  const parsed = normalized.length > 0 ? Number(normalized) : null;
  const sliderValue = Number.isFinite(parsed)
    ? clamp(Math.round(parsed as number), min, max)
    : clamp(Math.round(defaultValue ?? (min + max) / 2), min, max);

  return (
    <div
      className={cn(
        tight ? "space-y-0.5" : compact ? "space-y-1" : "space-y-1.5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className={cn(tight ? "text-[11px]" : "text-xs")}>
          {label}
        </Label>
        <div className="flex items-center gap-1">
          <Input
            id={id}
            name={name}
            required={required}
            disabled={disabled}
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              const n = Number(normalizePercentInput(value));
              if (!Number.isFinite(n)) return;
              setValue(String(clamp(Math.round(n), min, max)));
            }}
            placeholder={required ? "—" : undefined}
            className={cn(
              "rounded-xl px-2 py-1 tabular-nums",
              tight
                ? "h-6 w-[52px] px-1.5 text-[10px]"
                : compact
                  ? "h-7 w-[60px] text-[11px]"
                  : "h-8 w-[68px] text-xs",
            )}
          />
          <div className={cn(tight ? "text-[11px]" : "text-xs", "text-muted")}>%</div>
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        aria-label={label}
        className={cn(
          "w-full cursor-pointer accent-[rgb(var(--accent))]",
          tight ? "h-1" : compact ? "h-1.5" : "h-2",
        )}
      />

      {hint ? (
        <div
          className={cn(
            "leading-snug text-muted",
            tight ? "text-[9px]" : compact ? "text-[10px]" : "text-[11px]",
          )}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}
