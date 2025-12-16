import Link from "next/link";

import { cn } from "@/lib/cn";

type LandingShellProps = {
  active?: "home" | "pricing";
  children: React.ReactNode;
};

const navItemBase =
  "rounded-full px-3 py-2 text-[12px] font-medium tracking-wide transition-[background-color,color,transform] duration-200 ease-out active:translate-y-[1px]";

function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid size-10 place-items-center rounded-full bg-black/90 text-white shadow-[0_18px_55px_rgba(0,0,0,0.22)]",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 10a6 6 0 1 0 12 0"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M6 10c0-2.9 1.3-5 4-5s4 2.1 4 5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M10 4v12"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
    </div>
  );
}

export function LandingShell({ active, children }: LandingShellProps) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#f7f1e9] text-black">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_520px_at_25%_0%,rgba(255,255,255,0.75)_0%,transparent_55%),radial-gradient(880px_560px_at_80%_-10%,rgba(255,165,120,0.18)_0%,transparent_60%)]" />

      <header className="absolute left-0 right-0 top-8 z-20 flex items-start justify-center px-6">
        <nav
          aria-label="Primary"
          className="inline-flex items-center gap-1 rounded-full border border-white/45 bg-white/18 p-1.5 shadow-[0_24px_85px_rgba(0,0,0,0.16)] backdrop-blur-xl"
        >
          <Link
            href="/pricing"
            aria-current={active === "pricing" ? "page" : undefined}
            className={cn(
              navItemBase,
              "text-black/70 hover:bg-white/25 hover:text-black",
              active === "pricing" &&
                "bg-white/40 text-black/90 shadow-[0_18px_55px_rgba(0,0,0,0.12)]",
            )}
          >
            Pricing
          </Link>
          <Link
            href="/"
            aria-current={active === "home" ? "page" : undefined}
            className={cn(
              navItemBase,
              "text-black/70 hover:bg-white/25 hover:text-black",
              active === "home" &&
                "bg-white/40 text-black/90 shadow-[0_18px_55px_rgba(0,0,0,0.12)]",
            )}
          >
            Home
          </Link>
          <Link
            href="/"
            aria-label="Prediction Journal"
            className="rounded-full px-1 transition-transform duration-200 ease-out active:translate-y-[1px]"
          >
            <LogoMark />
          </Link>
          <Link
            href="/pricing#contact"
            className={cn(
              navItemBase,
              "text-black/70 hover:bg-white/25 hover:text-black",
            )}
          >
            Contact us
          </Link>
          <Link
            href="/pricing#faq"
            className={cn(
              navItemBase,
              "text-black/70 hover:bg-white/25 hover:text-black",
            )}
          >
            FAQ
          </Link>
        </nav>
      </header>

      {children}
    </div>
  );
}
