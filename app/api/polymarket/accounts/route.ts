import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  deletePolymarketAccount,
  getPolymarketAccount,
  savePolymarketAccount,
} from "@/db/polymarket_accounts";
import { createIfMissing } from "@/db/users";
import { encryptString } from "@/lib/crypto";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: internalUserId } = await createIfMissing(userId);
    const account = await getPolymarketAccount(internalUserId);
    return NextResponse.json({
      connected: !!account,
      poly_address: account?.poly_address,
      proxy_address: account?.proxy_address,
      signature_type: account?.signature_type,
      has_private_key: Boolean(account?.private_key_enc),
    });
  } catch (err) {
    console.error("Failed to get polymarket account:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: internalUserId } = await createIfMissing(userId);
    const body = await req.json();
    const {
      poly_address,
      api_key,
      api_secret,
      api_passphrase,
      proxy_address,
      signature_type,
      private_key,
    } = body;

    // Basic validation
    if (!poly_address || !api_key || !api_secret || !api_passphrase) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const privateKeyEnc =
      typeof private_key === "string" && private_key.trim()
        ? encryptString(private_key.trim())
        : null;

    const account = await savePolymarketAccount({
      user_id: internalUserId,
      poly_address,
      api_key,
      api_secret,
      api_passphrase,
      proxy_address: proxy_address || null,
      signature_type: signature_type ?? 0,
      private_key_enc: privateKeyEnc,
    });

    return NextResponse.json({ success: true, poly_address: account.poly_address });
  } catch (err) {
    console.error("Failed to save polymarket account:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: internalUserId } = await createIfMissing(userId);
    await deletePolymarketAccount(internalUserId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete polymarket account:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
