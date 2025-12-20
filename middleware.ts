import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/onboarding(.*)",
  "/dashboard(.*)",
  "/markets(.*)",
  "/journal(.*)",
  "/overview(.*)",
  "/qortana(.*)",
  "/predictions(.*)",
  "/polymarket(.*)",
  "/portfolio(.*)",
  "/settings(.*)",
  "/ai(.*)",
  "/dev(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  if (process.env.NODE_ENV === "production" && pathname.startsWith("/dev")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isProtectedRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    // Gate the app behind onboarding: connect a market + import initial seed dump.
    // Exempt onboarding + settings + api routes to avoid redirect loops.
    const isApi = pathname.startsWith("/api");
    const isOnboarding = pathname === "/onboarding" || pathname.startsWith("/onboarding/");
    const isSettings = pathname === "/settings" || pathname.startsWith("/settings/");

    if (!isApi && !isOnboarding && !isSettings) {
      try {
        const statusRes = await fetch(new URL("/api/onboarding/status", req.url), {
          headers: { cookie: req.headers.get("cookie") ?? "" },
          cache: "no-store",
        });
        if (statusRes.ok) {
          const data = (await statusRes.json().catch(() => null)) as
            | { complete?: boolean }
            | null;
          if (data && data.complete === false) {
            return NextResponse.redirect(new URL("/onboarding", req.url));
          }
        }
      } catch {
        // Fail open: do not block app navigation if status check fails.
      }
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
