import * as React from "react";

import { cn } from "@/lib/cn";
import { InsetPanel } from "@/components/ui/panel";

export function EmptyState({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <InsetPanel className={cn("rounded-3xl border-dashed p-6 text-sm text-muted", className)}>
      {children}
    </InsetPanel>
  );
}
