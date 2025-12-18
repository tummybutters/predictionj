"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { cn } from "@/lib/cn";

const navItemBase = cn(
    "relative isolate rounded-full px-3 py-1.5 text-[12px] font-medium tracking-wide",
    "transition-[transform,background-color,box-shadow,color] duration-150 ease-out",
    "hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white/30",
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:opacity-0 before:transition-opacity before:duration-150 before:content-['']",
    "before:bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.55)_0%,transparent_60%)]",
    "hover:before:opacity-100",
);

export function GlobalHeader() {
    const pathname = usePathname();

    return (
        <header className="fixed left-0 right-0 top-6 z-[100] flex items-start justify-center px-6">
            <nav
                aria-label="Primary"
                className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-white/45 bg-white/20 p-1.5",
                    "shadow-[0_24px_85px_rgba(0,0,0,0.18)] backdrop-blur-2xl",
                    "transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out",
                    "hover:shadow-[0_28px_105px_rgba(0,0,0,0.22)] hover:bg-white/22",
                )}
            >
                {/* LOGGED OUT LINKS */}
                <SignedOut>
                    <Link
                        href="/#pricing"
                        className={cn(
                            navItemBase,
                            "text-black/70 hover:bg-white/30 hover:text-black hover:shadow-[0_10px_35px_rgba(0,0,0,0.10)]",
                        )}
                    >
                        Pricing
                    </Link>
                    <Link
                        href="/"
                        className={cn(
                            navItemBase,
                            "text-black/70 hover:bg-white/30 hover:text-black hover:shadow-[0_10px_35px_rgba(0,0,0,0.10)]",
                            pathname === "/" && "bg-white/45 text-black/90 shadow-[0_12px_45px_rgba(0,0,0,0.08)]",
                        )}
                    >
                        Home
                    </Link>
                </SignedOut>

                {/* LOGGED IN LINKS */}
                <SignedIn>
                    <Link
                        href="/"
                        className={cn(
                            navItemBase,
                            "text-black/70 hover:bg-white/30 hover:text-black hover:shadow-[0_10px_35px_rgba(0,0,0,0.10)]",
                            pathname === "/" && "bg-white/45 text-black/90 shadow-[0_12px_45px_rgba(0,0,0,0.08)]",
                        )}
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/predictions"
                        className={cn(
                            navItemBase,
                            "text-black/70 hover:bg-white/30 hover:text-black hover:shadow-[0_10px_35px_rgba(0,0,0,0.10)]",
                            pathname?.startsWith("/predictions") && "bg-white/45 text-black/90 shadow-[0_12px_45px_rgba(0,0,0,0.08)]",
                        )}
                    >
                        Predictions
                    </Link>
                    <Link
                        href="/journal"
                        className={cn(
                            navItemBase,
                            "text-black/70 hover:bg-white/30 hover:text-black hover:shadow-[0_10px_35px_rgba(0,0,0,0.10)]",
                            pathname?.startsWith("/journal") && "bg-white/45 text-black/90 shadow-[0_12px_45px_rgba(0,0,0,0.08)]",
                        )}
                    >
                        Journal
                    </Link>
                    <Link
                        href="/polymarket"
                        className={cn(
                            navItemBase,
                            "text-black/70 hover:bg-white/30 hover:text-black hover:shadow-[0_10px_35px_rgba(0,0,0,0.10)]",
                            pathname?.startsWith("/polymarket") && "bg-white/45 text-black/90 shadow-[0_12px_45px_rgba(0,0,0,0.08)]",
                        )}
                    >
                        Polymarket
                    </Link>
                    <Link
                        href="/ai"
                        className={cn(
                            navItemBase,
                            "text-black/70 hover:bg-white/30 hover:text-black hover:shadow-[0_10px_35px_rgba(0,0,0,0.10)]",
                            pathname?.startsWith("/ai") && "bg-white/45 text-black/90 shadow-[0_12px_45px_rgba(0,0,0,0.08)]",
                        )}
                    >
                        Assistant
                    </Link>
                </SignedIn>

                {/* SHARED / ACTION LINKS */}
                <SignedOut>
                    <Link
                        href="/#faq"
                        className={cn(
                            navItemBase,
                            "text-black/70 hover:bg-white/30 hover:text-black hover:shadow-[0_10px_35px_rgba(0,0,0,0.10)]",
                        )}
                    >
                        FAQ
                    </Link>
                    <Link
                        href="/#contact"
                        className={cn(
                            navItemBase,
                            "text-black/70 hover:bg-white/30 hover:text-black hover:shadow-[0_10px_35px_rgba(0,0,0,0.10)]",
                        )}
                    >
                        Contact us
                    </Link>
                    <SignInButton mode="modal">
                        <button
                            className={cn(
                                navItemBase,
                                "bg-black/90 text-white shadow-[0_12px_40px_rgba(0,0,0,0.20)] hover:bg-black hover:shadow-[0_16px_50px_rgba(0,0,0,0.24)]",
                            )}
                        >
                            Sign in
                        </button>
                    </SignInButton>
                </SignedOut>

                <SignedIn>
                    <div className="ml-1 flex items-center gap-2">
                        <div className="rounded-full border border-white/50 bg-white/30 p-0.5 shadow-sm backdrop-blur-sm">
                            <UserButton />
                        </div>
                    </div>
                </SignedIn>
            </nav>
        </header>
    );
}
