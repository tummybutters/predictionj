import type { Metadata } from "next";
import {
  ClerkProvider,
  SignedIn,
  UserButton,
} from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import "./globals.css";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { themeInitScript } from "@/lib/theme";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prediction Journal",
  description: "A modular foundation for a prediction journal.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  const isSignedIn = Boolean(userId);

  return (
    <ClerkProvider>
      <html
        lang="en"
        data-auth={isSignedIn ? "1" : "0"}
        data-theme={isSignedIn ? "light" : undefined}
        suppressHydrationWarning
      >
        <body className="min-h-screen antialiased">
          {isSignedIn ? (
            <script
              dangerouslySetInnerHTML={{
                __html: themeInitScript("light"),
              }}
            />
          ) : null}
          <SignedIn>
            <header className="sticky top-0 z-50 border-b border-border/15 bg-bg/55 backdrop-blur-xl">
              <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-3">
                <div className="inline-flex items-center gap-2">
                  <div className="text-sm font-semibold tracking-[-0.01em] text-text/85">
                    Prediction Journal
                  </div>
                  <div className="hidden h-5 w-px bg-border/15 sm:block" />
                  <div className="hidden text-xs font-medium text-muted sm:block">
                    Logged in
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <div className="rounded-full border border-border/15 bg-panel/55 px-1.5 py-1 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-md">
                    <UserButton />
                  </div>
                </div>
              </div>
            </header>
          </SignedIn>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
