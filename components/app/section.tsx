import * as React from "react";

import { cn } from "@/lib/cn";

export function Section({
  title,
  hint,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode;
  hint?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {title || hint || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-sm font-semibold tracking-[-0.01em] text-text/75">
                {title}
              </h2>
            ) : null}
            {hint ? <div className="mt-1 text-sm text-muted">{hint}</div> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

