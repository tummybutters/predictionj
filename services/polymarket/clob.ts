import "server-only";
import crypto from "crypto";
import { getPolymarketAccount } from "./accounts";

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

/**
 * Public Fetcher
 */
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

/**
 * Authenticated Fetcher (L2)
 */
async function authenticatedClobFetch<T>(
  userId: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const account = await getPolymarketAccount(userId);
  if (!account) throw new Error("Polymarket account not connected");

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = 0; // Default nonce

  // Format: timestamp + method + path + body
  const bodyString = body ? JSON.stringify(body) : "";
  const sigPayload = `${timestamp}${method.toUpperCase()}${path}${bodyString}`;

  const signature = crypto
    .createHmac("sha256", Buffer.from(account.api_secret, "base64"))
    .update(sigPayload)
    .digest("base64");

  const url = `${CLOB_HOST}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "POLY_ADDRESS": account.poly_address,
      "POLY_SIGNATURE": signature,
      "POLY_TIMESTAMP": String(timestamp),
      "POLY_API_KEY": account.api_key,
      "POLY_PASSPHRASE": account.api_passphrase,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CLOB Auth request failed (${res.status}) for ${url}${text ? `: ${text.slice(0, 180)}` : ""}`);
  }

  return (await res.json()) as T;
}

// --- Public Methods ---

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

// --- Authenticated Methods (L2) ---

export type ClobBalance = {
  asset_id: string;
  balance: string;
};

export async function getClobBalances(userId: string): Promise<ClobBalance[]> {
  return authenticatedClobFetch<ClobBalance[]>(userId, "GET", "/balances");
}

export async function getOpenOrders(userId: string): Promise<any[]> {
  return authenticatedClobFetch<any[]>(userId, "GET", "/orders");
}

export async function cancelOrder(userId: string, orderId: string): Promise<{ success: boolean }> {
  return authenticatedClobFetch<{ success: boolean }>(userId, "DELETE", `/orders/${orderId}`);
}
