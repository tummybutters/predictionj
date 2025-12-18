"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ConnectKalshiAccount() {
    const [loading, setLoading] = React.useState(false);
    const [account, setAccount] = React.useState<{ connected: boolean; key_id: string } | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    // Form states
    const [keyId, setKeyId] = React.useState("");
    const [rsaPrivateKey, setRsaPrivateKey] = React.useState("");

    const fetchAccount = async () => {
        try {
            const res = await fetch("/api/kalshi/accounts");
            const data = await res.json();
            if (data.connected) {
                setAccount(data);
            }
        } catch (err) {
            console.error("Failed to fetch account", err);
        }
    };

    React.useEffect(() => {
        fetchAccount();
    }, []);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/kalshi/accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key_id: keyId,
                    rsa_private_key: rsaPrivateKey,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to connect account");
            }

            await fetchAccount();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to connect account");
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm("Are you sure you want to disconnect your Kalshi account?")) return;
        setLoading(true);
        try {
            await fetch("/api/kalshi/accounts", { method: "DELETE" });
            setAccount(null);
        } catch (err) {
            console.error("Failed to disconnect", err);
        } finally {
            setLoading(false);
        }
    };

    if (account) {
        return (
            <Panel className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-text">Kalshi Connected</h3>
                        <p className="text-sm text-muted">Key ID: <code className="text-xs">{account.key_id}</code></p>
                    </div>
                    <Button variant="secondary" onClick={handleDisconnect} disabled={loading}>
                        Disconnect
                    </Button>
                </div>
            </Panel>
        );
    }

    return (
        <Panel className="p-6">
            <div className="flex items-center gap-3 mb-4">
                <Image src="https://kalshi.com/favicon.ico" alt="Kalshi" width={24} height={24} className="h-6 w-6" />
                <h3 className="text-lg font-semibold text-text">Connect Kalshi Account</h3>
            </div>
            <p className="text-sm text-muted mb-6">
                Enter your Kalshi API credentials. You can generate these in your Kalshi account settings.
            </p>

            <form onSubmit={handleConnect} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="keyId">Key ID (UUID)</Label>
                    <Input
                        id="keyId"
                        placeholder="00000000-0000-0000-0000-000000000000"
                        value={keyId}
                        onChange={(e) => setKeyId(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="rsaPrivateKey">RSA Private Key (PEM format)</Label>
                    <Textarea
                        id="rsaPrivateKey"
                        placeholder="-----BEGIN RSA PRIVATE KEY-----..."
                        className="font-mono text-xs h-32"
                        value={rsaPrivateKey}
                        onChange={(e) => setRsaPrivateKey(e.target.value)}
                        required
                    />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Connecting..." : "Connect Account"}
                </Button>
            </form>
        </Panel>
    );
}
