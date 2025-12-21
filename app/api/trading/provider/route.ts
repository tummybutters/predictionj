import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const COOKIE_NAME = "pj_provider";
const ALLOWED = new Set(["auto", "polymarket", "kalshi"]);

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${COOKIE_NAME}=`));
  const raw = match ? decodeURIComponent(match.split("=").slice(1).join("=")) : "auto";
  const provider = ALLOWED.has(raw) ? raw : "auto";

  return NextResponse.json({ provider });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as unknown;
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const raw = String(obj.provider ?? "auto").trim();
  const provider = ALLOWED.has(raw) ? raw : null;
  if (!provider) return NextResponse.json({ error: "Invalid provider" }, { status: 400 });

  const res = NextResponse.json({ ok: true, provider });
  res.cookies.set(COOKIE_NAME, provider, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

