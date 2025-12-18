"use client";

import * as React from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";

export function OnboardingCheck() {
    const [checked, setChecked] = React.useState(false);
    const [needsOnboarding, setNeedsOnboarding] = React.useState(false);

    React.useEffect(() => {
        async function checkConnections() {
            try {
                const isDismissed = localStorage.getItem("pj_onboarding_dismissed") === "true";
                if (isDismissed) {
                    setChecked(true);
                    return;
                }

                const [polyRes, kalshiRes] = await Promise.all([
                    fetch("/api/polymarket/accounts"),
                    fetch("/api/kalshi/accounts"),
                ]);
                const polyData = await polyRes.json();
                const kalshiData = await kalshiRes.json();

                if (!polyData.connected && !kalshiData.connected) {
                    setNeedsOnboarding(true);
                }
            } catch (err) {
                console.error("Failed to check connections", err);
            } finally {
                setChecked(true);
            }
        }

        checkConnections();
    }, []);

    const handleDismiss = () => {
        localStorage.setItem("pj_onboarding_dismissed", "true");
        setNeedsOnboarding(false);
    };

    if (!checked || !needsOnboarding) return null;

    return (
        <Panel className="border-accent/15 bg-accent/5 p-6 border-dashed transition-all duration-300 animate-in fade-in slide-in-from-top-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-lg font-semibold text-text leading-tight">Welcome to Prediction Journal!</h3>
                    <p className="mt-1 text-sm text-muted max-w-lg">
                        You're currently in <strong>Paper Trading mode</strong>. If you want to place real trades, you can connect your Polymarket or Kalshi account at any time in settings.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-muted hover:text-text">
                        Dismiss
                    </Button>
                    <Link href="/settings">
                        <Button className="shadow-lg h-10 px-5">
                            Connect Accounts
                        </Button>
                    </Link>
                </div>
            </div>
        </Panel>
    );
}
