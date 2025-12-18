import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import "./globals.css";

import { themeInitScript } from "@/lib/theme";
import { GlobalHeader } from "@/components/app/global-header";
import { GlobalChat } from "@/components/app/global-chat";

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

          <GlobalHeader />

          {children}

          {isSignedIn && <GlobalChat />}
        </body>
      </html>
    </ClerkProvider>
  );
}
