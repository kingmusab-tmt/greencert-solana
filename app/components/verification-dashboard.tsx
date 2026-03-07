"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { signIn, useSession } from "next-auth/react";
import {
  Activity,
  BadgeCheck,
  CircleX,
  Coins,
  LogIn,
  Leaf,
  RefreshCw,
  Wallet,
} from "lucide-react";

type DashboardEvent = {
  id: string;
  deviceId: string;
  timestamp: string;
  cumulativeKwh: number;
  irradianceWm2: number;
  verified: boolean;
  reason: string;
  deltaKwh: number;
  verifiedDeltaKwh: number;
};

type DashboardResponse = {
  walletAddress: string;
  connectedDevices: number;
  rawKwh: number;
  verifiedKwh: number;
  avoidedCo2Tonnes: number;
  mintedCertCount: number;
  eligibleCertCount: number;
  pendingMintJobs: number;
  kwhToNextMint: number;
  mintReady: boolean;
  verificationRate: number;
  recentEvents: DashboardEvent[];
  recentMints: Array<{
    id: string;
    certIndex: number;
    txSignature: string;
    assetId: string;
    explorerUrl?: string;
    mintedAt: string;
  }>;
};

type TelemetryFormState = {
  deviceId: string;
  cumulativeKwh: string;
  irradianceWm2: string;
};

const DEFAULT_FORM: TelemetryFormState = {
  deviceId: "growatt-001",
  cumulativeKwh: "",
  irradianceWm2: "650",
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString();
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-3">
      <p className="text-xs uppercase tracking-wide text-foreground-tertiary">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </article>
  );
}

export function VerificationDashboard() {
  const { data: session, status: authStatus } = useSession();
  const { wallet, status, connectors, connect, disconnect, currentConnector } =
    useWalletConnection();

  const walletAddress = wallet?.account.address ?? "";
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingestState, setIngestState] = useState<string | null>(null);
  const [form, setForm] = useState<TelemetryFormState>(DEFAULT_FORM);

  const isConnected = status === "connected" && walletAddress.length > 0;
  const isAuthenticated = authStatus === "authenticated" && !!session?.user;

  const fetchDashboard = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/dashboard?wallet=${encodeURIComponent(walletAddress)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`Dashboard request failed (${response.status})`);
      }

      const payload = (await response.json()) as DashboardResponse;
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown API error");
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, walletAddress]);

  useEffect(() => {
    if (!isConnected) {
      setData(null);
      return;
    }

    fetchDashboard();
    const timer = window.setInterval(fetchDashboard, 15_000);
    return () => window.clearInterval(timer);
  }, [isConnected, fetchDashboard]);

  const emitTelemetry = useCallback(async () => {
    if (!isConnected) return;

    setIngestState("Sending sample to verification API...");

    try {
      const response = await fetch("/api/telemetry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          deviceId: form.deviceId,
          cumulativeKwh: Number(form.cumulativeKwh),
          irradianceWm2: Number(form.irradianceWm2),
          timestamp: new Date().toISOString(),
        }),
      });

      const payload = (await response.json()) as
        | { error: string }
        | { dashboard: DashboardResponse };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Ingest failed");
      }

      setData(payload.dashboard);
      setIngestState("Telemetry ingested and verified.");
      setForm((prev) => ({ ...prev, cumulativeKwh: "" }));
    } catch (err) {
      setIngestState(err instanceof Error ? err.message : "Ingest failed");
    }
  }, [form, isConnected, walletAddress]);

  const canSend = useMemo(() => {
    return (
      form.deviceId.trim().length >= 3 &&
      Number(form.cumulativeKwh) >= 0 &&
      Number(form.irradianceWm2) >= 0
    );
  }, [form]);

  if (authStatus === "loading") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <p className="text-sm text-foreground-secondary">
          Checking login session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
          Dashboard Login
        </p>
        <p className="mt-3 text-base text-foreground-secondary">
          Sign in with Google to access telemetry verification and wallet
          dashboard data.
        </p>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="mt-4 inline-flex items-center gap-2 rounded-lg gradient-bg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <LogIn className="h-4 w-4" />
          Continue with Google
        </button>
        <a
          href="/signin?callbackUrl=%2Fdashboard"
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-raised"
        >
          <Wallet className="h-4 w-4" />
          Use Wallet Sign-In
        </a>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
          Wallet Session
        </p>
        <p className="mt-3 text-base text-foreground-secondary">
          Connect a Solana wallet to load live verification metrics and minted
          carbon avoidance.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {connectors.length > 0 ? (
            connectors.map((connector) => {
              const supported = connector.isSupported();

              return (
                <button
                  key={connector.id}
                  type="button"
                  onClick={() =>
                    connect(connector.id, { allowInteractiveFallback: true })
                  }
                  disabled={!supported}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {supported
                    ? `Connect ${connector.name}`
                    : `${connector.name} (not available)`}
                </button>
              );
            })
          ) : (
            <p className="text-sm text-foreground-secondary">
              No wallet connectors detected in this browser.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
            Connected Wallet
          </p>
          <p className="mt-1 font-mono text-sm text-foreground">
            {walletAddress}
          </p>
          {currentConnector?.name && (
            <p className="mt-1 text-xs text-foreground-tertiary">
              via {currentConnector.name}
            </p>
          )}
          {session?.user?.email && (
            <p className="mt-1 text-xs text-foreground-tertiary">
              logged in as {session.user.email}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDashboard}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={disconnect}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-raised"
          >
            Disconnect
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Verified Energy"
          value={`${data?.verifiedKwh.toFixed(2) ?? "0.00"} kWh`}
        />
        <StatCard
          label="Minted Carbon Avoidance"
          value={`${data?.avoidedCo2Tonnes.toFixed(3) ?? "0.000"} tCO2`}
        />
        <StatCard
          label="Minted cNFTs"
          value={`${data?.mintedCertCount ?? 0}`}
        />
        <StatCard
          label="Eligible cNFT Units"
          value={`${data?.eligibleCertCount ?? 0}`}
        />
        <StatCard
          label="Pending Mint Jobs"
          value={`${data?.pendingMintJobs ?? 0}`}
        />
        <StatCard
          label="Mint Readiness"
          value={
            data?.mintReady
              ? "Ready now"
              : `${data?.kwhToNextMint.toFixed(2) ?? "100.00"} kWh to next`
          }
        />
      </div>

      <div className="rounded-xl border border-border bg-background/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
          Verification API Ingest (Demo)
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            value={form.deviceId}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, deviceId: event.target.value }))
            }
            placeholder="Device ID"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            step="0.1"
            value={form.cumulativeKwh}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                cumulativeKwh: event.target.value,
              }))
            }
            placeholder="Cumulative kWh"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            step="1"
            value={form.irradianceWm2}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                irradianceWm2: event.target.value,
              }))
            }
            placeholder="Irradiance (W/m2)"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={emitTelemetry}
          disabled={!canSend}
          className="mt-3 inline-flex items-center gap-2 rounded-lg gradient-bg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Activity className="h-4 w-4" />
          Submit Telemetry
        </button>
        {ingestState && (
          <p className="mt-3 text-sm text-foreground-secondary">
            {ingestState}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-background/40 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
            Recent Verification Events
          </p>
          <p className="text-xs text-foreground-tertiary">
            Rate: {data?.verificationRate.toFixed(1) ?? "0.0"}%
          </p>
        </div>

        {data?.recentEvents.length ? (
          <ul className="mt-3 space-y-2">
            {data.recentEvents.map((event) => (
              <li
                key={event.id}
                className="rounded-lg border border-border bg-surface px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-foreground-secondary">
                    {event.deviceId}
                  </span>
                  <span className="text-foreground-tertiary">
                    {formatDate(event.timestamp)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  {event.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-300">
                      <BadgeCheck className="h-3 w-3" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-1 text-red-300">
                      <CircleX className="h-3 w-3" /> Rejected
                    </span>
                  )}
                  <span className="rounded-full bg-foreground/10 px-2 py-1 text-foreground-secondary">
                    dKWh: {event.deltaKwh.toFixed(2)}
                  </span>
                  <span className="rounded-full bg-foreground/10 px-2 py-1 text-foreground-secondary">
                    irradiance: {event.irradianceWm2.toFixed(0)}
                  </span>
                  <span className="rounded-full bg-foreground/10 px-2 py-1 text-foreground-secondary">
                    {event.reason}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-foreground-secondary">
            No events yet. Submit telemetry to start verification.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-background/40 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
            Recent Mint Proofs
          </p>
          <p className="text-xs text-foreground-tertiary">
            minted {data?.mintedCertCount ?? 0} / eligible{" "}
            {data?.eligibleCertCount ?? 0}
          </p>
        </div>

        {data?.recentMints.length ? (
          <ul className="mt-3 space-y-2">
            {data.recentMints.map((mint) => (
              <li
                key={mint.id}
                className="rounded-lg border border-border bg-surface px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-foreground-secondary">
                    Cert #{mint.certIndex}
                  </span>
                  <span className="text-foreground-tertiary">
                    {formatDate(mint.mintedAt)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-300">
                    Asset {mint.assetId}
                  </span>
                  <span className="rounded-full bg-foreground/10 px-2 py-1 text-foreground-secondary">
                    tx {mint.txSignature.slice(0, 16)}...
                  </span>
                  {mint.explorerUrl && (
                    <a
                      href={mint.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-border px-2 py-1 text-foreground-secondary transition hover:bg-surface-raised"
                    >
                      Explorer
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-foreground-secondary">
            No completed mint proofs yet. Worker processing is required for
            pending jobs.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-border bg-background/40 p-3">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-foreground-tertiary">
            <Leaf className="h-4 w-4 text-accent" /> Devices
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {data?.connectedDevices ?? 0}
          </p>
        </article>
        <article className="rounded-xl border border-border bg-background/40 p-3">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-foreground-tertiary">
            <Coins className="h-4 w-4 text-accent" /> Raw Energy
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {data?.rawKwh.toFixed(2) ?? "0.00"} kWh
          </p>
        </article>
      </div>
    </div>
  );
}
