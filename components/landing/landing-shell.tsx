import Link from "next/link";
import Image from "next/image";

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
    <div className="relative isolate min-h-screen overflow-hidden text-black">
      <div className="absolute inset-0 -z-10">
        <Image
          src="/landing/fog-walker.png"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/78 via-white/20 to-white/10" />
        <div className="absolute inset-0 bg-[radial-gradient(980px_560px_at_50%_34%,rgba(255,255,255,0.74)_0%,rgba(255,255,255,0.20)_54%,transparent_78%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_620px_at_50%_120%,rgba(0,0,0,0.16)_0%,transparent_60%)]" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 pb-14 pt-8">
        <header className="flex items-start justify-center">
          <nav
            aria-label="Primary"
            className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/16 p-1.5 shadow-[0_24px_85px_rgba(0,0,0,0.18)] backdrop-blur-xl"
          >
            <Link
              href="/pricing"
              aria-current={active === "pricing" ? "page" : undefined}
              className={cn(
                navItemBase,
                "text-black/70 hover:bg-white/25 hover:text-black",
                active === "pricing" && "bg-white/35 text-black/90 shadow-[0_18px_55px_rgba(0,0,0,0.12)]",
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
                active === "home" && "bg-white/35 text-black/90 shadow-[0_18px_55px_rgba(0,0,0,0.12)]",
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
              className={cn(navItemBase, "text-black/70 hover:bg-white/25 hover:text-black")}
            >
              Contact us
            </Link>
            <Link
              href="/pricing#faq"
              className={cn(navItemBase, "text-black/70 hover:bg-white/25 hover:text-black")}
            >
              FAQ
            </Link>
          </nav>
        </header>

        {children}
      </div>
    </div>
  );
}

