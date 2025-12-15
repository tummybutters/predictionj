"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { RetractableSearchBanner } from "@/components/search/retractable-search-banner";

export function HomeSearchBanner() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  return (
    <RetractableSearchBanner
      query={query}
      onQueryChange={setQuery}
      placeholder="Search your predictions…"
      hint="Press Enter to jump to your predictions."
      onSubmit={(q) => {
        const trimmed = q.trim();
        router.push(trimmed ? `/predictions?q=${encodeURIComponent(trimmed)}` : "/predictions");
      }}
    />
  );
}

