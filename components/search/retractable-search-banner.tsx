"use client";

import * as React from "react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M9 15a6 6 0 1 1 0-12 6 6 0 0 1 0 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M13.6 13.6 17 17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="m5.5 12.5 4.5-4.5 4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="m5.5 7.5 4.5 4.5 4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit?: (query: string) => void;
  placeholder?: string;
  collapsedStorageKey?: string;
  hint?: string;
  below?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
};

export function RetractableSearchBanner({
  query,
  onQueryChange,
  onSubmit,
  placeholder = "Search…",
  collapsedStorageKey = "pj_search_banner_collapsed",
  hint,
  below,
  right,
  className,
}: Props) {
  const [collapsed, setCollapsed] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(collapsedStorageKey);
      setCollapsed(raw === "1");
    } catch {
      // Ignore.
    }
  }, [collapsedStorageKey]);

  React.useEffect(() => {
    try {
      localStorage.setItem(collapsedStorageKey, collapsed ? "1" : "0");
    } catch {
      // Ignore.
    }
  }, [collapsed, collapsedStorageKey]);

  React.useEffect(() => {
    if (collapsed) return;
    inputRef.current?.focus();
  }, [collapsed]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit?.(query.trim());
  }

  if (collapsed) {
    return (
      <div className={cn("glass-panel rounded-2xl px-2 py-1.5", className)}>
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 px-2 text-muted hover:text-text"
            onClick={() => setCollapsed(false)}
            aria-label="Expand search"
          >
            <SearchIcon className="h-4 w-4" />
            <span className="text-sm">Search</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted hover:text-text"
            onClick={() => setCollapsed(false)}
            aria-label="Expand search"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("glass-panel rounded-2xl px-3 py-2", className)}>
      <form onSubmit={handleSubmit} role="search" className="space-y-1">
        <div className="flex items-center gap-2">
          <SearchIcon className="h-4 w-4 text-muted" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-9 flex-1 bg-panel/35 shadow-none"
          />
          {right ? <div className="hidden sm:block">{right}</div> : null}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-muted hover:text-text"
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse search"
          >
            <ChevronUpIcon className="h-4 w-4" />
          </Button>
        </div>
        {hint ? <div className="text-xs text-muted">{hint}</div> : null}
        {below ? <div className="pt-2">{below}</div> : null}
      </form>
    </div>
  );
}
