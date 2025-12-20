"use client";

import * as React from "react";

import { cn } from "@/lib/cn";
import type { AppTheme } from "@/lib/theme";
import { applyTheme, getInitialTheme, setStoredTheme } from "@/lib/theme";

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 17.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M4.7 4.7l1.6 1.6M17.7 17.7l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.7 19.3l1.6-1.6M17.7 6.3l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M20.5 14.8a7.8 7.8 0 0 1-10.4-10.3 9 9 0 1 0 10.4 10.3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = React.useState(false);
  const [theme, setTheme] = React.useState<AppTheme>("light");

  React.useEffect(() => {
    setMounted(true);
    const initial = getInitialTheme("light");
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function toggle() {
    const next: AppTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setStoredTheme(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      title={mounted ? `Theme: ${theme}` : "Toggle theme"}
      className={cn(
        "group relative inline-flex h-9 w-[74px] items-center rounded-full border border-border/20 bg-panel/55 px-1 shadow-[0_18px_55px_rgba(0,0,0,0.12)] backdrop-blur-md transition-[transform,box-shadow,background-color,border-color] duration-350 ease-spring motion-reduce:transition-none hover:bg-panel/70 active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.28)_0%,transparent_60%)] opacity-70" />
      <span
        className={cn(
          "relative grid size-7 place-items-center rounded-full bg-panel2 text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_10px_26px_rgba(0,0,0,0.18)] transition-transform duration-350 ease-spring motion-reduce:transition-none",
          mounted && theme === "dark" ? "translate-x-[38px]" : "translate-x-0",
        )}
      >
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.22)_0%,transparent_60%)]" />
      </span>

      <div className="relative flex w-full items-center justify-between px-1 text-muted">
        <SunIcon className="size-[15px] transition-colors duration-200 ease-out group-hover:text-text/80" />
        <MoonIcon className="size-[15px] transition-colors duration-200 ease-out group-hover:text-text/80" />
      </div>
    </button>
  );
}
