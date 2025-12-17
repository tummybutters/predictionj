import * as React from "react";

import { cn } from "@/lib/cn";

export function Section({
  title,
  hint,
  actions,
  children,
  className,
  density = "default",
}: {
  title?: React.ReactNode;
  hint?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  density?: "default" | "compact";
}) {
  const compact = density === "compact";

  return (
    <section className={cn(compact ? "space-y-2" : "space-y-3", className)}>
      {title || hint || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h2
                className={cn(
                  "font-semibold tracking-[-0.01em] text-text/75",
                  compact ? "text-xs" : "text-sm",
                )}
              >
                {title}
              </h2>
            ) : null}
            {hint ? (
              <div className={cn("text-muted", compact ? "mt-0.5 text-xs" : "mt-1 text-sm")}>
                {hint}
              </div>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
