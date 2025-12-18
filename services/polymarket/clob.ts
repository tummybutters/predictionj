import "server-only";

const CLOB_HOST = "https://clob.polymarket.com";

export type ClobBookLevel = {
  price: string;
  size: string;
};

export type ClobBook = {
  market: string;
  asset_id: string;
  timestamp: string;
  hash: string;
  bids: ClobBookLevel[];
  asks: ClobBookLevel[];
};

export type ClobPricesHistoryPoint = {
  t: number;
  p: number;
};

export type ClobPricesHistoryResponse = {
  history: ClobPricesHistoryPoint[];
};

async function clobFetch<T>(pathAndQuery: string, init?: RequestInit): Promise<T> {
  const url = `${CLOB_HOST}${pathAndQuery.startsWith("/") ? "" : "/"}${pathAndQuery}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CLOB request failed (${res.status}) for ${url}${text ? `: ${text.slice(0, 180)}` : ""}`);
  }

  return (await res.json()) as T;
}

export async function getBookByTokenId(tokenId: string): Promise<ClobBook> {
  const id = tokenId.trim();
  if (!id) throw new Error("tokenId is required");
  return clobFetch<ClobBook>(`/book?token_id=${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
}

export type PricesHistoryParams =
  | { tokenId: string; interval: string }
  | { tokenId: string; startTs: number; endTs: number };

export async function getPricesHistory(params: PricesHistoryParams): Promise<ClobPricesHistoryResponse> {
  const tokenId = params.tokenId.trim();
  if (!tokenId) throw new Error("tokenId is required");

  const qs = new URLSearchParams();
  qs.set("market", tokenId);

  if ("interval" in params) {
    const interval = params.interval.trim();
    if (!interval) throw new Error("interval is required");
    qs.set("interval", interval);
  } else {
    if (!Number.isFinite(params.startTs) || !Number.isFinite(params.endTs)) {
      throw new Error("startTs and endTs must be numbers");
    }
    qs.set("startTs", String(Math.trunc(params.startTs)));
    qs.set("endTs", String(Math.trunc(params.endTs)));
  }

  return clobFetch<ClobPricesHistoryResponse>(`/prices-history?${qs.toString()}`, {
    cache: "no-store",
  });
}
