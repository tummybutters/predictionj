import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getKalshiAccount, saveKalshiAccount, deleteKalshiAccount } from "@/services/kalshi/accounts";

export async function GET() {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const account = await getKalshiAccount(userId);
        return NextResponse.json({
            connected: !!account,
            key_id: account?.key_id,
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
        const body = await req.json();
        const { key_id, rsa_private_key } = body;

        // Basic validation
        if (!key_id || !rsa_private_key) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const account = await saveKalshiAccount({
            user_id: userId,
            key_id,
            rsa_private_key,
        });

        return NextResponse.json({ success: true, key_id: account.key_id });
    } catch (err) {
        console.error("Failed to save kalshi account:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE() {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await deleteKalshiAccount(userId);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Failed to delete kalshi account:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
