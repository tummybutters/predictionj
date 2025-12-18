"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Panel, InsetPanel } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConnectPolymarketAccount() {
    const [loading, setLoading] = React.useState(false);
    const [account, setAccount] = React.useState<any>(null);
    const [error, setError] = React.useState<string | null>(null);

    // Form states
    const [polyAddress, setPolyAddress] = React.useState("");
    const [apiKey, setApiKey] = React.useState("");
    const [apiSecret, setApiSecret] = React.useState("");
    const [apiPassphrase, setApiPassphrase] = React.useState("");
    const [proxyAddress, setProxyAddress] = React.useState("");

    const fetchAccount = async () => {
        try {
            const res = await fetch("/api/polymarket/accounts");
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
            const res = await fetch("/api/polymarket/accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    poly_address: polyAddress,
                    api_key: apiKey,
                    api_secret: apiSecret,
                    api_passphrase: apiPassphrase,
                    proxy_address: proxyAddress,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to connect account");
            }

            await fetchAccount();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm("Are you sure you want to disconnect your Polymarket account?")) return;
        setLoading(true);
        try {
            await fetch("/api/polymarket/accounts", { method: "DELETE" });
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
                        <h3 className="text-lg font-semibold text-text">Polymarket Connected</h3>
                        <p className="text-sm text-muted">Address: <code className="text-xs">{account.poly_address}</code></p>
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
            <h3 className="text-lg font-semibold text-text mb-4">Connect Polymarket CLOB</h3>
            <p className="text-sm text-muted mb-6">
                Enter your L2 API credentials to enable trading. To keep it secure, we recommend using a dedicated API key with limited permissions.
            </p>

            <form onSubmit={handleConnect} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="polyAddress">Polygon Address</Label>
                        <Input
                            id="polyAddress"
                            placeholder="0x..."
                            value={polyAddress}
                            onChange={(e) => setPolyAddress(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="proxyAddress">Proxy Address (Optional funder)</Label>
                        <Input
                            id="proxyAddress"
                            placeholder="0x..."
                            value={proxyAddress}
                            onChange={(e) => setProxyAddress(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key (UUID)</Label>
                    <Input
                        id="apiKey"
                        placeholder="550e8400-..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        required
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="apiSecret">API Secret</Label>
                        <Input
                            id="apiSecret"
                            type="password"
                            placeholder="Base64 encoded secret"
                            value={apiSecret}
                            onChange={(e) => setApiSecret(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="apiPassphrase">API Passphrase</Label>
                        <Input
                            id="apiPassphrase"
                            type="password"
                            placeholder="Passphrase"
                            value={apiPassphrase}
                            onChange={(e) => setApiPassphrase(e.target.value)}
                            required
                        />
                    </div>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Connecting..." : "Connect Account"}
                </Button>
            </form>
        </Panel>
    );
}
