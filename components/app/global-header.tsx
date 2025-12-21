"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { cn } from "@/lib/cn";
import { GlossyTab } from "@/components/ui/glossy-tab";

type AppSectionKey = "markets" | "journal" | "overview" | null;

function getSectionKey(pathname: string): AppSectionKey {
  if (pathname === "/markets" || pathname.startsWith("/markets/")) return "markets";
  if (pathname === "/journal" || pathname.startsWith("/journal/")) return "journal";
  if (pathname === "/overview" || pathname.startsWith("/overview/")) return "overview";
  return null;
}

const JOURNAL_SUBPAGES = new Set([
  "beliefs",
  "predictions",
  "frameworks",
  "data",
  "bias-watchlist",
]);

function isGlossyTabActive(pathname: string, href: string): boolean {
  if (href === "/journal") {
    if (pathname === "/journal") return true;
    if (!pathname.startsWith("/journal/")) return false;
    const segment = pathname.split("/")[2] ?? "";
    return segment.length > 0 && !JOURNAL_SUBPAGES.has(segment);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const SUBNAV: Record<Exclude<AppSectionKey, null>, Array<{ href: string; label: string }>> = {
  markets: [
    { href: "/markets", label: "Explore" },
    { href: "/overview/portfolio", label: "Portfolio" },
  ],
  journal: [
    { href: "/journal", label: "Entries" },
    { href: "/journal/beliefs", label: "Beliefs" },
    { href: "/journal/predictions", label: "Predictions" },
    { href: "/journal/frameworks", label: "Frameworks" },
    { href: "/journal/data", label: "Data" },
    { href: "/journal/bias-watchlist", label: "Bias Watchlist" },
  ],
  overview: [
    { href: "/overview", label: "Overview" },
    { href: "/overview/portfolio", label: "Portfolio" },
  ],
};

export function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = React.useState(() => searchParams.get("q") ?? "");
  const [providerMode, setProviderMode] = React.useState<"auto" | "polymarket" | "kalshi">("auto");
  const sectionKey = getSectionKey(pathname);

  React.useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  React.useEffect(() => {
    let mounted = true;
    async function loadProvider() {
      try {
        const res = await fetch("/api/trading/provider", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as { provider?: string } | null;
        const p = (data?.provider ?? "auto").toLowerCase();
        if (!mounted) return;
        if (p === "polymarket" || p === "kalshi" || p === "auto") setProviderMode(p);
      } catch {
        // ignore
      }
    }
    loadProvider();
    return () => {
      mounted = false;
    };
  }, []);

  async function setProvider(next: "auto" | "polymarket" | "kalshi") {
    setProviderMode(next);
    try {
      await fetch("/api/trading/provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: next }),
      });
    } finally {
      router.refresh();
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      router.push("/markets");
      return;
    }
    if (providerMode === "kalshi") {
      router.push(`/markets/kalshi?ticker=${encodeURIComponent(q)}`);
      return;
    }
    router.push(`/markets?q=${encodeURIComponent(q)}`);
  }

  const marketsHref = providerMode === "kalshi" ? "/markets/kalshi" : "/markets";

  const tabs = [
    { href: "/dashboard", label: "Home" },
    { href: marketsHref, label: "Markets", key: "markets" as const },
    { href: "/journal", label: "Journal" },
    { href: "/overview", label: "Overview" },
    { href: "/qortana", label: "Qortana" },
  ] as const;

  return (
    <header className="sticky top-0 z-[100] overflow-visible border-b border-border/20 bg-bg/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-6">
        <SignedOut>
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[11px] font-black tracking-tight text-white shadow-plush">
              PJ
            </span>
          </Link>
        </SignedOut>

        <SignedIn>
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[11px] font-black tracking-tight text-white shadow-plush">
              PJ
            </span>
          </Link>
        </SignedIn>

        <form onSubmit={onSubmit} className="hidden flex-1 md:block">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={providerMode === "kalshi" ? "Search Kalshi tickers" : "Search markets"}
            className={cn(
              "h-9 w-full rounded-xl border border-border/20 bg-panel/45 px-4 text-sm text-text/85 outline-none shadow-plush",
              "placeholder:text-muted/60 focus:border-accent/35 focus:ring-2 focus:ring-accent/20",
            )}
          />
        </form>

        <SignedIn>
          <div className="hidden items-center gap-1 rounded-full border border-border/20 bg-panel/45 p-1 shadow-plush md:flex">
            {[
              { key: "auto" as const, label: "Auto" },
              { key: "polymarket" as const, label: "Poly" },
              { key: "kalshi" as const, label: "Kalshi" },
            ].map((opt) => {
              const active = providerMode === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => void setProvider(opt.key)}
                  className={cn(
                    "h-8 rounded-full px-3 text-xs font-semibold transition-[background-color,color,transform,filter] duration-300 ease-spring",
                    active
                      ? "bg-accent text-white shadow-plush hover:brightness-105"
                      : "text-text/70 hover:bg-panel/60",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <nav className="ml-auto flex items-center gap-5 text-sm font-medium text-muted">
            {tabs.map((item) => {
              const isMarkets = "key" in item && item.key === "markets";
              const isActive = isMarkets
                ? pathname === "/markets" ||
                  pathname.startsWith("/markets/") ||
                  pathname === "/polymarket" ||
                  pathname.startsWith("/polymarket/")
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("transition-colors hover:text-text", isActive && "text-text")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SignedIn>

        <SignedOut>
          <SignInButton mode="modal">
            <button className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-plush hover:brightness-105">
              Log in
            </button>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          <Link
            href="/settings"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-plush hover:brightness-105"
          >
            Connect
          </Link>
          <div className="ml-2 rounded-full border border-border/20 bg-panel/45 p-0.5 shadow-plush">
            <UserButton />
          </div>
        </SignedIn>
      </div>

      <SignedIn>
        {sectionKey ? (
          <div className="border-t border-border/15 bg-bg/60">
            <div className="mx-auto flex max-w-6xl items-center justify-end gap-2 px-6 py-2">
              {(SUBNAV[sectionKey] ?? []).map((item) => {
                return (
                  <GlossyTab
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    active={isGlossyTabActive(pathname, item.href)}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </SignedIn>
    </header>
  );
}
