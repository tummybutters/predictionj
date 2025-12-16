import * as React from "react";

import { cn } from "@/lib/cn";

export const Panel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-3xl border border-border/20 bg-panel/60 shadow-plush backdrop-blur-md",
          className,
        )}
        {...props}
      />
    );
  },
);
Panel.displayName = "Panel";

export const InsetPanel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/20 bg-panel2/60 shadow-inset backdrop-blur-md",
        className,
      )}
      {...props}
    />
  );
});
InsetPanel.displayName = "InsetPanel";
