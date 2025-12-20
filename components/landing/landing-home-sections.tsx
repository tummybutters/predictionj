"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SignUpButton } from "@clerk/nextjs";
import { AnimatedButton } from "@/components/ui/animated-button";

import { cn } from "@/lib/cn";

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reducedMotion ? undefined : { opacity: 0, y: 14 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.175, 0.885, 0.32, 1.05],
      }}
    >
      {children}
    </motion.div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/45 bg-white/16 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.14)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Feature({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-white/40 bg-white/12 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.10)] backdrop-blur-xl">
      <div className="grid size-10 flex-none place-items-center rounded-2xl bg-black/90 text-white shadow-[0_18px_55px_rgba(0,0,0,0.18)]">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold tracking-[-0.01em] text-black/85">{title}</div>
        <div className="mt-1 text-sm leading-relaxed text-black/60">{description}</div>
      </div>
    </div>
  );
}

function MiniMock({
  label,
  title,
  meta,
  lines,
}: {
  label: string;
  title: string;
  meta: string;
  lines: string[];
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white/35 shadow-[0_18px_55px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-3 py-1 text-[11px] font-semibold tracking-wide text-black/65">
          <span className="size-1.5 rounded-full bg-black/55" />
          {label}
        </div>
        <div className="text-[11px] font-medium tracking-wide text-black/45">{meta}</div>
      </div>
      <div className="border-t border-black/10 px-4 py-4">
        <div className="text-sm font-semibold tracking-[-0.01em] text-black/80">{title}</div>
        <div className="mt-3 space-y-2">
          {lines.map((line) => (
            <div
              key={line}
              className="rounded-xl border border-black/10 bg-white/45 px-3 py-2 text-xs font-medium text-black/60"
            >
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingHomeSections() {
  return (
    <div className="space-y-28">
      <section className="grid items-start gap-10 md:grid-cols-12">
        <Reveal className="md:col-span-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/16 px-4 py-2 text-[12px] font-semibold tracking-[0.18em] text-black/60 shadow-[0_18px_60px_rgba(0,0,0,0.10)] backdrop-blur-md">
            <span className="size-2 rounded-full bg-black/55" />
            HOW IT WORKS
          </div>
          <h2 className="mt-8 text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.03em] text-black/90 sm:text-5xl">
            Capture the claim.
            <br />
            Keep the model.
          </h2>
          <p className="mt-5 text-pretty text-base leading-relaxed text-black/60">
            Log predictions with a confidence and a resolve date. Attach the assumptions and sources
            behind them. Later, resolve the outcome and see what actually held up.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <SignUpButton mode="modal">
              <button type="button">
                <AnimatedButton text="Start Tracking — free" />
              </button>
            </SignUpButton>
            <a
              href="#pricing"
              className="mt-2 text-sm font-semibold text-black/55 underline decoration-black/20 underline-offset-4 transition-colors hover:text-black/70 sm:mt-3"
            >
              See pricing
            </a>
          </div>
        </Reveal>

        <div className="grid gap-6 md:col-span-7 md:grid-cols-2">
          <Reveal delay={0.05}>
            <Card>
              <div className="text-sm font-semibold text-black/85">Log a prediction</div>
              <p className="mt-2 text-sm leading-relaxed text-black/60">
                Write the question, set a probability, choose a resolve date. Fast enough to use
                daily.
              </p>
              <MiniMock
                label="PREDICTION"
                meta="Confidence"
                title="The Fed cuts rates by June"
                lines={[
                  "P = 62%",
                  "Resolve by: 2026-06-30",
                  "Why: inflation cools faster than expected",
                ]}
              />
            </Card>
          </Reveal>

          <Reveal delay={0.12}>
            <Card>
              <div className="text-sm font-semibold text-black/85">Track assumptions</div>
              <p className="mt-2 text-sm leading-relaxed text-black/60">
                Split “belief” from “reason.” Update assumptions when they fail so you don’t repeat
                the same mistake.
              </p>
              <MiniMock
                label="ASSUMPTIONS"
                meta="Model"
                title="What needs to be true?"
                lines={["CPI trend keeps falling", "Labor stays resilient", "No new supply shock"]}
              />
            </Card>
          </Reveal>
        </div>
      </section>

      <section>
        <Reveal className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/16 px-4 py-2 text-[12px] font-semibold tracking-[0.18em] text-black/60 shadow-[0_18px_60px_rgba(0,0,0,0.10)] backdrop-blur-md">
            <span className="size-2 rounded-full bg-black/55" />
            SYSTEM
          </div>
          <h2 className="mt-8 text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.03em] text-black/90 sm:text-5xl">
            Simple structure for consistent calibration.
          </h2>
          <p className="mt-5 text-pretty text-base leading-relaxed text-black/60">
            Your notes stay lightweight. The system stays strict: timestamps, probabilities,
            outcomes, and reviews you can actually trust.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {[
            {
              title: "Probability-first",
              description: "Every belief gets a number. You can’t improve what you don’t quantify.",
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M4 13.5l4-4 3 3 5-6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 16.5h12"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    opacity="0.75"
                  />
                </svg>
              ),
            },
            {
              title: "Resolve and score",
              description:
                "Close the loop. Mark outcomes and build an honest track record over time.",
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M15.5 6.2l-6.7 7.3-3.3-3.4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 4h12"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    opacity="0.75"
                  />
                </svg>
              ),
            },
            {
              title: "Models and assumptions",
              description:
                "Track what you think drives reality, then watch which assumptions keep breaking.",
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M10 3l6 3.2v7.6L10 17l-6-3.2V6.2L10 3z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 3v14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    opacity="0.75"
                  />
                </svg>
              ),
            },
            {
              title: "Review loops",
              description:
                "Come back on schedule. See what’s due, what changed, and what you missed.",
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M6.2 6.2a5.5 5.5 0 1 1-1.2 5.9"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M4 11V6h5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ),
            },
            {
              title: "Searchable evidence",
              description:
                "Link sources, notes, and context so your future self can audit the moment.",
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M9 15a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M14.5 14.5L18 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              ),
            },
            {
              title: "Exports and portability",
              description:
                "Keep your work. Export your journal when you want to analyze or archive it.",
              icon: (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M10 3v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path
                    d="M7 8l3 3 3-3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 17h12"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    opacity="0.75"
                  />
                </svg>
              ),
            },
          ].map((feature, i) => (
            <Reveal key={feature.title} delay={0.05 + i * 0.04}>
              <Feature {...feature} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="pb-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-white/45 bg-white/16 p-10 shadow-[0_34px_110px_rgba(0,0,0,0.16)] backdrop-blur-xl">
            <div className="absolute -right-24 -top-24 size-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.12),transparent_70%)]" />
            <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.55),transparent_70%)]" />
            <div className="relative flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
              <div>
                <div className="text-sm font-semibold tracking-[0.12em] text-black/55">
                  START TODAY
                </div>
                <div className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] text-black/90">
                  Turn your thinking into an asset you can trust.
                </div>
                <div className="mt-2 text-sm leading-relaxed text-black/60">
                  Private by default. Fast to capture. Honest when you review.
                </div>
              </div>
              <SignUpButton mode="modal">
                <button type="button">
                  <AnimatedButton text="Start Tracking — free" />
                </button>
              </SignUpButton>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
