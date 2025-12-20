import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
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
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
