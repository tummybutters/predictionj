import * as React from "react";

import { cn } from "@/lib/cn";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-2xl border border-border/20 bg-panel/55 px-3 py-2 text-sm text-text shadow-plush transition-[box-shadow,border-color,background-color] duration-350 ease-spring motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:bg-panel/70 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Select.displayName = "Select";
