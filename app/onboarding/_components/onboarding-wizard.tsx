"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/cn";
import { Panel, InsetPanel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConnectKalshiAccount } from "@/components/kalshi/connect-account";
import { ConnectPolymarketAccount } from "@/components/polymarket/connect-account";
import { importOnboardingSeedDumpAction } from "@/app/onboarding/actions";

type Status = {
  connected: boolean;
  hasObjects: boolean;
  complete: boolean;
  needsConnect: boolean;
  needsSeedDump: boolean;
};

type StepKey = "connect" | "prompt" | "paste" | "done";

function stepForStatus(s: Status): StepKey {
  if (!s.hasObjects) return "prompt";
  return "done";
}

export function OnboardingWizard({
  initialStatus,
  extractionPrompt,
}: {
  initialStatus: Status;
  extractionPrompt: string;
}) {
  const [status, setStatus] = React.useState<Status>(initialStatus);
  const [step, setStep] = React.useState<StepKey>(() => stepForStatus(initialStatus));
  const [rawText, setRawText] = React.useState("");
  const [importResult, setImportResult] = React.useState<{
    created: number;
    createdLinks: number;
    byType: Record<string, number>;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  async function refreshStatus() {
    try {
      const res = await fetch("/api/onboarding/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as Status | null;
      if (!data) return;
      setStatus(data);
      if (data.complete) setStep("done");
    } catch {
      // ignore
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(extractionPrompt);
    } catch {
      // ignore
    }
  }

  const stepIndex = step === "prompt" ? 1 : step === "paste" ? 2 : 3;

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-muted">Step {stepIndex} of 3</div>
            <div className="mt-1 text-lg font-semibold text-text">
              {step === "prompt"
                ? "Generate your seed dump"
                : step === "paste"
                  ? "Import your seed dump"
                  : step === "connect"
                    ? "Connect your markets (optional)"
                    : "Ready"}
            </div>
            <div className="mt-1 text-sm text-muted">
              {step === "prompt"
                ? "Copy this prompt into your favorite AI and run it once."
                : step === "paste"
                  ? "Paste the AI response here. We’ll turn it into referenceable truth objects."
                  : step === "connect"
                    ? "Connect Polymarket OR Kalshi if you want portfolio mirroring and live market context."
                    : "You’re in. Jump into Overview to see your raw data inventory."}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold shadow-plush",
                status.connected
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  : "border-border/20 bg-panel/40 text-muted",
              )}
            >
              Markets: {status.connected ? "Connected" : "Optional"}
            </span>
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold shadow-plush",
                status.hasObjects
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  : "border-border/20 bg-panel/40 text-muted",
              )}
            >
              Journal: {status.hasObjects ? "Seeded" : "Empty"}
            </span>
          </div>
        </div>
      </Panel>

      {step === "prompt" ? (
        <Panel className="p-6">
          <InsetPanel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-text/90">Copy this into your AI</div>
              <Button variant="secondary" onClick={copyPrompt} className="h-9">
                Copy
              </Button>
            </div>
            <Textarea
              value={extractionPrompt}
              readOnly
              className="mt-4 h-72 font-mono text-xs leading-relaxed"
            />
          </InsetPanel>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className={cn(
                "relative isolate inline-flex h-10 items-center justify-center overflow-hidden rounded-full px-4 py-2 text-sm font-semibold tracking-[-0.01em] transition-[transform,box-shadow,background-color,border-color,color,filter] duration-350 ease-spring motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.28)_0%,transparent_60%)] before:opacity-80",
                "border border-border/20 bg-panel/55 text-text shadow-plush hover:bg-panel/70 active:translate-y-[1px]",
              )}
            >
              Not now
            </Link>
            <Button variant="ghost" onClick={refreshStatus} className="h-10">
              Refresh status
            </Button>
            <Button onClick={() => setStep("paste")} className="h-10">
              I have the response
            </Button>
          </div>
        </Panel>
      ) : null}

      {step === "paste" ? (
        <Panel className="p-6">
          <InsetPanel className="p-5">
            <div className="text-sm font-semibold text-text/90">Paste the AI response</div>
            <div className="mt-1 text-xs text-muted">
              Keep the section headings (Core Beliefs, Mental Frameworks, etc.).
            </div>
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste your AI response here…"
              className="mt-4 h-72 font-mono text-xs leading-relaxed"
            />
          </InsetPanel>

          {error ? <div className="mt-3 text-sm text-rose-300">{error}</div> : null}
          {importResult ? (
            <div className="mt-3 text-xs text-muted">
              Imported {importResult.created} objects • {importResult.createdLinks} starter links
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" onClick={() => setStep("prompt")} className="h-10">
              Back
            </Button>
            <Button
              onClick={() => {
                setError(null);
                setImportResult(null);
                startTransition(async () => {
                  try {
                    const res = await importOnboardingSeedDumpAction({ rawText });
                    setImportResult(res);
                    await refreshStatus();
                    setStep("done");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Import failed.");
                  }
                });
              }}
              disabled={isPending || rawText.trim().length < 40}
              className="h-10"
            >
              {isPending ? "Importing…" : "Import & Continue"}
            </Button>
          </div>
        </Panel>
      ) : null}

      {step === "connect" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ConnectPolymarketAccount />
          <ConnectKalshiAccount />

          <Panel className="lg:col-span-2 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted">You only need one account connected (Polymarket OR Kalshi).</div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setStep("done")} className="h-10">
                  Skip
                </Button>
                <Button
                  variant="secondary"
                  onClick={refreshStatus}
                  disabled={isPending}
                  className="h-10"
                >
                  Refresh
                </Button>
                <Button
                  onClick={async () => {
                    await refreshStatus();
                    setStep("done");
                  }}
                  className="h-10"
                >
                  Finish
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      ) : null}

      {step === "done" ? (
        <Panel className="p-6">
          <div className="text-lg font-semibold text-text">Welcome in</div>
          <div className="mt-1 text-sm text-muted">
            Your truth objects are ready. Start with Overview to see everything counted — even zeros.
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link href="/overview">
              <Button className="h-10">Go to Overview</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary" className="h-10">
                Go to Home
              </Button>
            </Link>
            <Button variant="ghost" onClick={refreshStatus} className="h-10">
              Refresh status
            </Button>
            <Button variant="secondary" onClick={() => setStep("connect")} className="h-10">
              Connect markets (optional)
            </Button>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
