import Image from "next/image";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

import { LandingShell } from "@/components/landing/landing-shell";
import { LandingHomeSections } from "@/components/landing/landing-home-sections";
import { LandingPricingSections } from "@/components/landing/landing-pricing";
import { AnimatedButton } from "@/components/ui/animated-button";

function FeatureChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/18 px-3 py-1.5 text-xs font-medium tracking-wide text-black/70 shadow-[0_10px_35px_rgba(0,0,0,0.10)] backdrop-blur-md">
      <span className="size-1.5 rounded-full bg-black/55" />
      {children}
    </div>
  );
}

export function LandingHero() {
  return (
    <LandingShell>
      <main id="top" className="flex flex-1 flex-col">
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <Image
              src="/landing/fog-walker.png"
              alt=""
              fill
              priority
              unoptimized
              quality={100}
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/78 via-white/20 to-white/12" />
            <div className="absolute inset-0 bg-[radial-gradient(980px_560px_at_50%_34%,rgba(255,255,255,0.76)_0%,rgba(255,255,255,0.20)_54%,transparent_78%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(900px_620px_at_50%_120%,rgba(0,0,0,0.16)_0%,transparent_60%)]" />
            <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-transparent via-[#f7f1e9]/60 to-[#f7f1e9]" />
          </div>

          <div className="mx-auto flex min-h-[95vh] max-w-6xl flex-col px-6 pb-20 pt-28">
            <div className="flex flex-1 items-center justify-center">
              <div className="mx-auto w-full max-w-4xl text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/18 px-4 py-2 text-[12px] font-semibold tracking-[0.18em] text-black/60 shadow-[0_18px_60px_rgba(0,0,0,0.12)] backdrop-blur-md">
                  <span className="size-2 rounded-full bg-black/55" />
                  LOCKED
                </div>

                <h1 className="mt-10 text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.035em] text-black/90 sm:text-6xl md:text-7xl">
                  <span className="block opacity-75">Your beliefs are assets.</span>
                  <span className="block">Track them like it.</span>
                </h1>

                <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-black/60 sm:text-lg">
                  Log predictions, assumptions, and the models behind them. Watch your thinking
                  become a system you can audit, calibrate, and trust.
                </p>

                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <SignUpButton mode="modal">
                    <button type="button">
                      <AnimatedButton text="Start Tracking — free" />
                    </button>
                  </SignUpButton>
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      className="rounded-full border border-black/10 bg-white/35 px-5 py-3 text-sm font-semibold text-black/70 shadow-[0_18px_55px_rgba(0,0,0,0.12)] backdrop-blur-md transition-[transform,background-color,box-shadow,color] duration-350 ease-spring hover:-translate-y-[1px] hover:bg-white/45 hover:text-black/80 active:translate-y-[1px]"
                    >
                      Sign in
                    </button>
                  </SignInButton>
                </div>

                <div className="mx-auto mt-7 flex max-w-3xl flex-wrap items-center justify-center gap-2">
                  <FeatureChip>Predictions</FeatureChip>
                  <FeatureChip>Assumptions</FeatureChip>
                  <FeatureChip>Models</FeatureChip>
                  <FeatureChip>Calibration</FeatureChip>
                </div>

                <div className="mt-10 text-center">
                  <a
                    href="#pricing"
                    className="text-sm font-semibold text-black/55 underline decoration-black/20 underline-offset-4 transition-colors hover:text-black/70"
                  >
                    View pricing
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f7f1e9]">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <LandingHomeSections />
            <div className="mt-28">
              <LandingPricingSections />
            </div>
          </div>
        </section>
      </main>
    </LandingShell>
  );
}
