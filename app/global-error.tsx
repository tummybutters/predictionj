"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="mx-auto max-w-3xl space-y-6 px-6 pb-16 pt-16">
          <Panel className="p-6">
            <div className="text-sm font-semibold text-text/90">App error</div>
            <div className="mt-2 text-sm text-muted">
              {error.message || "An unexpected error occurred."}
              {error.digest ? (
                <>
                  {" "}
                  <span className="font-mono text-text/70">({error.digest})</span>
                </>
              ) : null}
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Button onClick={() => reset()}>Try again</Button>
              <Button variant="secondary" onClick={() => (window.location.href = "/")}>
                Reload
              </Button>
            </div>
          </Panel>
        </main>
      </body>
    </html>
  );
}

