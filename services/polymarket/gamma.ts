import "server-only";

const GAMMA_HOST = "https://gamma-api.polymarket.com";

export type GammaTag = {
  id: string;
  label: string;
  slug: string;
};

export type GammaMarket = {
  id: string;
  slug: string;
  question?: string;
  description?: string;
  image?: string;
  endDate?: string;
  endDateIso?: string;
  liquidity?: string;
  volume?: string;
  bestBid?: number | null;
  bestAsk?: number | null;
  outcomes?: string; // JSON string (e.g. ["Yes","No"])
  outcomePrices?: string; // JSON string (e.g. ["0.45","0.55"])
  clobTokenIds?: string; // JSON string
};

export type GammaEvent = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  image?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  volume?: string;
  volume24hr?: string;
  volume1wk?: string;
  volume1mo?: string;
  tags?: GammaTag[];
  markets?: GammaMarket[];
};

type PublicSearchResponse = {
  events: GammaEvent[];
  pagination: {
    totalResults?: number;
    hasMore?: boolean;
  };
};

async function gammaFetch<T>(pathAndQuery: string, init?: RequestInit): Promise<T> {
  const url = `${GAMMA_HOST}${pathAndQuery.startsWith("/") ? "" : "/"}${pathAndQuery}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gamma request failed (${res.status}) for ${url}${text ? `: ${text.slice(0, 180)}` : ""}`);
  }

  return (await res.json()) as T;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function eventTrendingScore(e: GammaEvent): number {
  return (
    toNumber(e.volume24hr) * 1000 +
    toNumber(e.volume1wk) * 100 +
    toNumber(e.volume1mo) * 10 +
    toNumber(e.volume)
  );
}

export async function listTrendingEvents(limit = 12): Promise<GammaEvent[]> {
  const events = await gammaFetch<GammaEvent[]>(
    `/events?closed=false&limit=${Math.max(1, Math.min(50, limit * 4))}&offset=0`,
    { next: { revalidate: 60 } },
  );

  return events
    .slice()
    .sort((a, b) => eventTrendingScore(b) - eventTrendingScore(a))
    .slice(0, limit);
}

export async function searchEvents(query: string): Promise<GammaEvent[]> {
  const q = query.trim();
  if (!q) return [];

  const resp = await gammaFetch<PublicSearchResponse>(
    `/public-search?q=${encodeURIComponent(q)}`,
    { next: { revalidate: 15 } },
  );

  return resp.events ?? [];
}

export async function getEventBySlug(slug: string): Promise<GammaEvent> {
  return gammaFetch<GammaEvent>(`/events/slug/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  });
}

export async function getMarketBySlug(slug: string): Promise<GammaMarket> {
  return gammaFetch<GammaMarket>(`/markets/slug/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  });
}

