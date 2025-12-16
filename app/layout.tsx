import type { Metadata } from "next";
import {
  ClerkProvider,
  SignedIn,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prediction Journal",
  description: "A modular foundation for a prediction journal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen antialiased">
          <SignedIn>
            <header className="sticky top-0 z-50 border-b border-border/25 bg-bg/55 backdrop-blur-md">
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-3">
                <div className="text-sm font-medium text-text/90">
                  Prediction Journal
                </div>
                <UserButton />
              </div>
            </header>
          </SignedIn>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
