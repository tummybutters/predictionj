import "server-only";
import crypto from "crypto";
import { getKalshiAccount } from "@/db/kalshi_accounts";
import { decryptString } from "@/lib/crypto";

const DEFAULT_KALSHI_API_ORIGIN = "https://api.elections.kalshi.com";

function getKalshiApiOrigin(): string {
  return (process.env.KALSHI_API_ORIGIN ?? DEFAULT_KALSHI_API_ORIGIN).replace(/\/+$/, "");
}

function normalizePem(pem: string): string {
  const trimmed = pem.trim();
  // Common copy/paste issue: PEM newlines stored as literal "\n".
  return trimmed.includes("\\n") ? trimmed.replace(/\\n/g, "\n") : trimmed;
}

function signKalshiRequest({
  privateKeyPem,
  timestampMs,
  method,
  path,
}: {
  privateKeyPem: string;
  timestampMs: string;
  method: string;
  path: string;
}): string {
  const upper = method.toUpperCase();
  const pathWithoutQuery = path.split("?")[0] ?? path;
  const message = Buffer.from(`${timestampMs}${upper}${pathWithoutQuery}`, "utf8");

  return crypto
    .sign("sha256", message, {
      key: normalizePem(privateKeyPem),
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    })
    .toString("base64");
}

async function kalshiFetch<T>({
  method,
  path,
  headers,
  body,
}: {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
}): Promise<T> {
  const origin = getKalshiApiOrigin();
  const url = `${origin}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(headers ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Kalshi API request failed (${res.status}) for ${url}: ${text.slice(0, 240)}`);
  }

  return (await res.json()) as T;
}

export async function authenticatedKalshiFetch<T>(
  userId: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const account = await getKalshiAccount(userId);
  if (!account) throw new Error("Kalshi account not connected");

  const timestampMs = String(Date.now());
  const privateKeyPem = account.rsa_private_key_enc
    ? decryptString(account.rsa_private_key_enc)
    : account.rsa_private_key;
  if (!privateKeyPem) {
    throw new Error("Missing Kalshi private key. Add it in Settings to enable trading/sync.");
  }

  const signature = signKalshiRequest({
    privateKeyPem,
    timestampMs,
    method,
    path,
  });

  return kalshiFetch<T>({
    method,
    path,
    headers: {
      "KALSHI-ACCESS-KEY": account.key_id,
      "KALSHI-ACCESS-SIGNATURE": signature,
      "KALSHI-ACCESS-TIMESTAMP": timestampMs,
    },
    body,
  });
}

export async function getKalshiPortfolio(userId: string) {
  // Legacy alias; prefer getKalshiBalance (v2).
  return authenticatedKalshiFetch(userId, "GET", "/trade-api/v2/portfolio/balance");
}

export async function getKalshiBalance(userId: string) {
  return authenticatedKalshiFetch(userId, "GET", "/trade-api/v2/portfolio/balance");
}

export async function getKalshiPositions(userId: string) {
  return getKalshiPositionsPage(userId, { count_filter: "position", limit: 500 });
}

export async function getKalshiPositionsPage(
  userId: string,
  opts?: {
    cursor?: string;
    limit?: number;
    count_filter?: "position" | "total_traded" | string;
    ticker?: string;
    event_ticker?: string;
  },
) {
  const qs = new URLSearchParams();
  if (opts?.cursor) qs.set("cursor", opts.cursor);
  if (opts?.limit) qs.set("limit", String(opts.limit));
  if (opts?.count_filter) qs.set("count_filter", String(opts.count_filter));
  if (opts?.ticker) qs.set("ticker", String(opts.ticker));
  if (opts?.event_ticker) qs.set("event_ticker", String(opts.event_ticker));
  const suffix = qs.toString();
  return authenticatedKalshiFetch(
    userId,
    "GET",
    `/trade-api/v2/portfolio/positions${suffix ? `?${suffix}` : ""}`,
  );
}

export async function getKalshiOrders(userId: string) {
  return getKalshiOrdersPage(userId, { status: "resting", limit: 500 });
}

export async function getKalshiOrdersPage(
  userId: string,
  opts?: {
    cursor?: string;
    limit?: number;
    status?: "resting" | "canceled" | "executed" | string;
    ticker?: string;
    event_ticker?: string;
    min_ts?: string | number;
    max_ts?: string | number;
  },
) {
  const qs = new URLSearchParams();
  if (opts?.cursor) qs.set("cursor", String(opts.cursor));
  if (opts?.limit) qs.set("limit", String(opts.limit));
  if (opts?.status) qs.set("status", String(opts.status));
  if (opts?.ticker) qs.set("ticker", String(opts.ticker));
  if (opts?.event_ticker) qs.set("event_ticker", String(opts.event_ticker));
  if (opts?.min_ts !== undefined) qs.set("min_ts", String(opts.min_ts));
  if (opts?.max_ts !== undefined) qs.set("max_ts", String(opts.max_ts));
  const suffix = qs.toString();
  return authenticatedKalshiFetch(
    userId,
    "GET",
    `/trade-api/v2/portfolio/orders${suffix ? `?${suffix}` : ""}`,
  );
}

export type KalshiCreateOrderRequest = {
  ticker: string;
  side: "yes" | "no";
  action: "buy" | "sell";
  count: number;
  type?: "limit" | "market";
  client_order_id?: string;
  yes_price?: number;
  no_price?: number;
  time_in_force?: "fill_or_kill" | "good_till_canceled" | "immediate_or_cancel";
};

export async function createKalshiOrder(userId: string, req: KalshiCreateOrderRequest) {
  return authenticatedKalshiFetch(userId, "POST", "/trade-api/v2/portfolio/orders", req);
}

export async function cancelKalshiOrder(userId: string, orderId: string) {
  return authenticatedKalshiFetch(
    userId,
    "DELETE",
    `/trade-api/v2/portfolio/orders/${encodeURIComponent(orderId)}`,
  );
}

export type KalshiMarket = Record<string, unknown>;

export async function listKalshiMarketsByTickers(tickers: string[]) {
  const unique = Array.from(new Set(tickers.map((t) => t.trim()).filter(Boolean)));
  if (unique.length === 0) return { markets: [] as KalshiMarket[], cursor: "" };

  const qs = new URLSearchParams();
  qs.set("tickers", unique.join(","));
  qs.set("limit", String(Math.min(1000, unique.length)));
  return kalshiFetch<{ markets: KalshiMarket[]; cursor: string }>({
    method: "GET",
    path: `/trade-api/v2/markets?${qs.toString()}`,
  });
}
