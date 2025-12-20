import crypto from "crypto";

import { requireEnv } from "@/lib/env";

const ENC_ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = requireEnv("APP_ENCRYPTION_KEY");
  // Accept either 32-byte raw (base64) or 64-hex.
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must be 32 bytes (base64) or 64 hex chars.");
  }
  return buf;
}

export function encryptString(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENC_ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // payload = iv(12) + tag(16) + ciphertext
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptString(payloadB64: string): string {
  const key = getKey();
  const payload = Buffer.from(payloadB64, "base64");
  if (payload.length < 12 + 16 + 1) throw new Error("Invalid encrypted payload.");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = crypto.createDecipheriv(ENC_ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

