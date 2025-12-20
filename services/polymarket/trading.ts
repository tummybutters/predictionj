import "server-only";

import { ClobClient } from "@polymarket/clob-client";
import { Wallet } from "ethers";

import { getPolymarketAccount } from "@/db/polymarket_accounts";
import { decryptString } from "@/lib/crypto";
import { logTradingAction } from "@/db/trading_mirror";

const HOST = "https://clob.polymarket.com";
const CHAIN_ID = 137; // Polygon mainnet

function normalizePrivateKey(raw: string): string {
  const s = raw.trim();
  if (!s) throw new Error("Missing Polymarket private key.");
  return s.startsWith("0x") ? s : `0x${s}`;
}

export async function createAndPostPolymarketOrder(input: {
  userId: string;
  tokenId: string;
  side: "BUY" | "SELL";
  price: number;
  size: number;
  tickSize?: string;
  negRisk?: boolean;
}): Promise<unknown> {
  const tokenId = input.tokenId.trim();
  if (!tokenId) throw new Error("tokenId is required.");
  if (!Number.isFinite(input.price) || input.price <= 0 || input.price >= 1) {
    throw new Error("price must be a number in (0, 1).");
  }
  if (!Number.isFinite(input.size) || input.size <= 0) {
    throw new Error("size must be a positive number.");
  }

  const account = await getPolymarketAccount(input.userId);
  if (!account) throw new Error("Polymarket account not connected.");
  if (!account.private_key_enc) {
    throw new Error("Missing Polymarket private key. Add it in Settings to enable trading.");
  }

  const privateKey = normalizePrivateKey(decryptString(account.private_key_enc));
  const signer = new Wallet(privateKey);

  const creds = {
    apiKey: account.api_key,
    secret: account.api_secret,
    passphrase: account.api_passphrase,
  };

  const signatureType = Number.isFinite(account.signature_type) ? account.signature_type : 0;
  const funder = account.proxy_address ?? undefined;

  const client = new ClobClient(HOST, CHAIN_ID, signer, creds as any, signatureType, funder);

  const request = {
    tokenID: tokenId,
    price: input.price,
    size: input.size,
    side: input.side,
  };
  const opts = {
    tickSize: input.tickSize ?? "0.01",
    negRisk: input.negRisk ?? false,
  };

  await logTradingAction({
    userId: input.userId,
    provider: "polymarket",
    action_type: "place_order_attempt",
    request: { request, opts },
  });

  const response = await (client as any).createAndPostOrder(request, opts);

  await logTradingAction({
    userId: input.userId,
    provider: "polymarket",
    action_type: "place_order_success",
    request: { request, opts },
    response: { response } as Record<string, unknown>,
  });

  return response;
}

