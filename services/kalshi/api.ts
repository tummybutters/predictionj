import "server-only";
import crypto from "crypto";
import { getKalshiAccount } from "./accounts";

const KALSHI_BASE_URL = "https://trading-api.kalshi.com/v1";

export async function authenticatedKalshiFetch<T>(
    userId: string,
    method: string,
    path: string,
    body?: unknown,
): Promise<T> {
    const account = await getKalshiAccount(userId);
    if (!account) throw new Error("Kalshi account not connected");

    const timestamp = String(Date.now());

    // Format: timestamp + method + path (no query params)
    // path for signing should not include the base URL or query params
    const sigPayload = `${timestamp}${method.toUpperCase()}${path.split('?')[0]}`;

    const signature = crypto.sign(
        "sha256",
        Buffer.from(sigPayload),
        {
            key: account.rsa_private_key,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: 20, // Typical salt length for SHA256
        }
    ).toString("base64");

    const url = `${KALSHI_BASE_URL}${path}`;
    const res = await fetch(url, {
        method,
        headers: {
            "KALSHI-ACCESS-KEY": account.key_id,
            "KALSHI-ACCESS-SIGNATURE": signature,
            "KALSHI-ACCESS-TIMESTAMP": timestamp,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Kalshi API request failed (${res.status}) for ${url}: ${text.slice(0, 180)}`);
    }

    return (await res.json()) as T;
}

export async function getKalshiPortfolio(userId: string) {
    return authenticatedKalshiFetch(userId, "GET", "/portfolio");
}

export async function getKalshiBalance(userId: string) {
    // Kalshi v2 portfolio endpoint returns balance
    return authenticatedKalshiFetch(userId, "GET", "/portfolio");
}
