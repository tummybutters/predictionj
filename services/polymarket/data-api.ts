import "server-only";

const DATA_API_HOST = "https://data-api.polymarket.com";

export type DataApiTrade = {
  proxyWallet?: string;
  side?: "BUY" | "SELL";
  asset?: string;
  conditionId?: string;
  size?: number;
  price?: number;
  timestamp?: number;
  title?: string;
  slug?: string;
  icon?: string;
  eventSlug?: string;
  outcome?: string;
  outcomeIndex?: number;
  name?: string;
  pseudonym?: string;
  bio?: string;
  profileImage?: string;
  profileImageOptimized?: string;
  transactionHash?: string;
};

async function dataApiFetch<T>(pathAndQuery: string, init?: RequestInit): Promise<T> {
  const url = `${DATA_API_HOST}${pathAndQuery.startsWith("/") ? "" : "/"}${pathAndQuery}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Data API request failed (${res.status}) for ${url}${text ? `: ${text.slice(0, 180)}` : ""}`,
    );
  }

  return (await res.json()) as T;
}

export async function listTradesByConditionId(params: {
  conditionId: string;
  limit?: number;
}): Promise<DataApiTrade[]> {
  const conditionId = params.conditionId.trim();
  if (!conditionId) throw new Error("conditionId is required");

  const qs = new URLSearchParams();
  qs.set("market", conditionId);

  if (typeof params.limit === "number" && Number.isFinite(params.limit)) {
    qs.set("limit", String(Math.max(1, Math.min(100, Math.trunc(params.limit)))));
  }

  return dataApiFetch<DataApiTrade[]>(`/trades?${qs.toString()}`, {
    cache: "no-store",
  });
}

