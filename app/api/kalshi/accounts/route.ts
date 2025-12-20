import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { deleteKalshiAccount, getKalshiAccount, saveKalshiAccount } from "@/db/kalshi_accounts";
import { createIfMissing } from "@/db/users";
import { encryptString } from "@/lib/crypto";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: internalUserId } = await createIfMissing(userId);
    const account = await getKalshiAccount(internalUserId);
    return NextResponse.json({
      connected: !!account,
      key_id: account?.key_id,
      has_private_key: Boolean(account?.rsa_private_key_enc || account?.rsa_private_key),
    });
  } catch (err) {
    console.error("Failed to get kalshi account:", err);
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
    const { key_id, rsa_private_key } = body;

    // Basic validation
    if (!key_id || !rsa_private_key) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const account = await saveKalshiAccount({
      user_id: internalUserId,
      key_id,
      rsa_private_key: null,
      rsa_private_key_enc: encryptString(String(rsa_private_key)),
    });

    return NextResponse.json({ success: true, key_id: account.key_id, has_private_key: true });
  } catch (err) {
    console.error("Failed to save kalshi account:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: internalUserId } = await createIfMissing(userId);
    await deleteKalshiAccount(internalUserId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete kalshi account:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
