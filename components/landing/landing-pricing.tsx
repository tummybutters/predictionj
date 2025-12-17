import { SignUpButton } from "@clerk/nextjs";

import { LandingShell } from "@/components/landing/landing-shell";
import { cn } from "@/lib/cn";

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm leading-relaxed text-black/65">
      <svg
        className="mt-[3px] size-4 flex-none text-black/70"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M16.5 5.8l-7.3 8-3.7-3.8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{children}</span>
    </li>
  );
}

function TierCard({
  name,
  price,
  tagline,
  highlighted,
  cta,
  features,
}: {
  name: string;
  price: string;
  tagline: string;
  highlighted?: boolean;
  cta: React.ReactNode;
  features: string[];
}) {
  return (
    <section
      className={cn(
        "relative rounded-3xl border border-white/45 bg-white/18 p-7 shadow-[0_28px_90px_rgba(0,0,0,0.16)] backdrop-blur-xl",
        highlighted &&
          "border-black/10 bg-white/26 shadow-[0_34px_110px_rgba(0,0,0,0.20)]",
      )}
    >
      {highlighted && (
        <div className="absolute -top-3 left-7 inline-flex items-center rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] font-semibold tracking-wide text-black/70 shadow-[0_16px_50px_rgba(0,0,0,0.12)]">
          Most popular
        </div>
      )}
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold tracking-[0.12em] text-black/55">
            {name.toUpperCase()}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-4xl font-semibold tracking-[-0.03em] text-black/90">
              {price}
            </div>
            {price !== "$0" && (
              <div className="text-sm font-medium text-black/45">/ month</div>
            )}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-black/60">{tagline}</p>
        </div>
      </header>

      <div className="mt-6">{cta}</div>

      <ul className="mt-7 space-y-3">
        {features.map((feature) => (
          <CheckItem key={feature}>{feature}</CheckItem>
        ))}
      </ul>
    </section>
  );
}

function PrimaryCtaButton({ children }: { children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex w-full">
      <span className="absolute -inset-1 rounded-full bg-white/40 blur-xl transition-opacity duration-350 ease-spring group-hover:opacity-60" />
      <span className="relative inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-black/92 to-black px-6 text-[15px] font-semibold text-white shadow-[0_22px_70px_rgba(0,0,0,0.32)] transition-[transform,box-shadow,filter] duration-350 ease-spring hover:-translate-y-[1px] hover:shadow-[0_28px_85px_rgba(0,0,0,0.34)] active:translate-y-[1px] active:shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.22)_0%,transparent_60%)]" />
        <span className="relative">{children}</span>
        <svg
          className="relative size-4 opacity-90 transition-transform duration-350 ease-spring group-hover:translate-x-[1px]"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M8 5l5 5-5 5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}

function SecondaryCtaButton({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-12 w-full items-center justify-center rounded-full border border-black/10 bg-white/35 px-6 text-sm font-semibold text-black/70 shadow-[0_18px_55px_rgba(0,0,0,0.12)] backdrop-blur-md transition-[transform,background-color,box-shadow,color] duration-350 ease-spring hover:-translate-y-[1px] hover:bg-white/45 hover:text-black/80 active:translate-y-[1px]">
      {children}
    </span>
  );
}

export function LandingPricingSections() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <section id="pricing" className="scroll-mt-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/18 px-4 py-2 text-[12px] font-semibold tracking-[0.18em] text-black/60 shadow-[0_18px_60px_rgba(0,0,0,0.12)] backdrop-blur-md">
            <span className="size-2 rounded-full bg-black/55" />
            PRICING
          </div>
          <h2 className="mt-10 text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-black/90 sm:text-5xl">
            Simple pricing for serious thinking.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-black/60 sm:text-lg">
            Start free. Upgrade when your journal becomes a system you rely on.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <TierCard
            name="Free"
            price="$0"
            tagline="Capture predictions and assumptions without friction."
            cta={
              <SignUpButton mode="modal">
                <button type="button" className="w-full">
                  <SecondaryCtaButton>Start free</SecondaryCtaButton>
                </button>
              </SignUpButton>
            }
            features={[
              "Unlimited predictions",
              "Journal entries and links",
              "Basic review + search",
              "Private by default",
            ]}
          />
          <TierCard
            name="Pro"
            price="$12"
            highlighted
            tagline="Build calibration. See what actually drives your accuracy."
            cta={
              <SignUpButton mode="modal">
                <button type="button" className="w-full">
                  <PrimaryCtaButton>Start Pro</PrimaryCtaButton>
                </button>
              </SignUpButton>
            }
            features={[
              "Calibration + performance trends",
              "Assumption tracking + model notes",
              "Exports (CSV / Markdown)",
              "Priority feature access",
            ]}
          />
          <TierCard
            name="Max"
            price="$30"
            tagline="For power users who want their thinking to compound."
            cta={
              <SignUpButton mode="modal">
                <button type="button" className="w-full">
                  <SecondaryCtaButton>Start Max</SecondaryCtaButton>
                </button>
              </SignUpButton>
            }
            features={[
              "Everything in Pro",
              "Advanced filters + saved views",
              "API access (when available)",
              "Early access to new models",
            ]}
          />
        </div>
      </section>

      <section
        id="faq"
        className="mt-16 scroll-mt-28 rounded-3xl border border-white/45 bg-white/14 p-8 shadow-[0_28px_90px_rgba(0,0,0,0.14)] backdrop-blur-xl"
      >
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-black/85">
          FAQ
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-sm font-semibold text-black/80">
              Can I start free?
            </div>
            <p className="mt-2 text-sm leading-relaxed text-black/60">
              Yes. Free is designed to be useful on its own, and you can upgrade
              later if you want deeper calibration and exports.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-black/80">
              Do I need a credit card?
            </div>
            <p className="mt-2 text-sm leading-relaxed text-black/60">
              Not for sign-up. Billing and plan selection live inside the
              product when enabled.
            </p>
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="mt-8 scroll-mt-28 rounded-3xl border border-white/45 bg-white/14 p-8 shadow-[0_28px_90px_rgba(0,0,0,0.14)] backdrop-blur-xl"
      >
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-black/85">
          Contact us
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-black/60">
          Want Max for a team, or have a question? Email{" "}
          <a
            className="font-semibold text-black/75 underline decoration-black/20 underline-offset-4 hover:text-black/85"
            href="mailto:hello@predictionjournal.com"
          >
            hello@predictionjournal.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}

export function LandingPricing() {
  return (
    <LandingShell active="pricing">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 pb-20 pt-28">
        <LandingPricingSections />
      </main>
    </LandingShell>
  );
}
