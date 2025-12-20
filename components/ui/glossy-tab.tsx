"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

export function GlossyTab({
  href,
  label,
  active,
  activeClassName,
  inactiveClassName,
}: {
  href: string;
  label: string;
  active?: boolean;
  activeClassName?: string;
  inactiveClassName?: string;
}) {
  const pathname = usePathname();
  const isActive = active ?? (pathname === href || pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      className={cn(
        "relative inline-flex items-center rounded-xl px-4 py-2 text-[12px] font-semibold shadow-plush transition-[filter,transform,background-color,border-color,color] duration-350 ease-spring",
        "origin-center -skew-x-12 overflow-hidden",
        isActive ? "z-20" : "z-0 hover:z-10 focus-visible:z-10",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(120%_120%_at_30%_0%,rgba(255,255,255,0.32)_0%,transparent_60%)] before:opacity-90",
        isActive
          ? cn("bg-accent text-white hover:brightness-105", activeClassName)
          : cn("border border-border/20 bg-panel/45 text-text/80 hover:bg-panel/60", inactiveClassName),
    )}
    >
      <span className="skew-x-12">{label}</span>
    </Link>
  );
}
