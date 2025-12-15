"use client";

import * as React from "react";

import type { PredictionRow } from "@/db/predictions.types";
import { RetractableSearchBanner } from "@/components/search/retractable-search-banner";
import { PredictionsList } from "@/app/predictions/_components/predictions-list";

function normalizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function PredictionsSearchShell({
  predictions,
  initialQuery,
  children,
}: {
  predictions: PredictionRow[];
  initialQuery?: string;
  children: React.ReactNode;
}) {
  const [query, setQuery] = React.useState(initialQuery ?? "");
  const tokens = React.useMemo(() => normalizeQuery(query), [query]);

  const filtered = React.useMemo(() => {
    if (tokens.length === 0) return predictions;

    return predictions.filter((p) => {
      const haystack = (p.claim ?? "").toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }, [predictions, tokens]);

  return (
    <>
      <RetractableSearchBanner
        query={query}
        onQueryChange={setQuery}
        placeholder="Search open predictions…"
        right={
          <div className="text-xs text-muted">
            {filtered.length}/{predictions.length}
          </div>
        }
      />
      {children}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted">Open</h2>
        <PredictionsList predictions={filtered} />
      </section>
    </>
  );
}
