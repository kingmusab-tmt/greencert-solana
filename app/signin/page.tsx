"use client";

import { Suspense } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useWalletConnection } from "@solana/react-hooks";
import { ArrowLeft, LogIn, Wallet } from "lucide-react";
import Link from "next/link";
import { bytesToBase64, signWalletMessage } from "@/app/lib/wallet-signature";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const { wallet, connectors, connect } = useWalletConnection();

  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") || "/dashboard",
    [searchParams]
  );

  const [authError, setAuthError] = useState<string | null>(null);
  const [isWalletSigningIn, setIsWalletSigningIn] = useState(false);

  const walletAddress = wallet?.account.address ?? "";

  useEffect(() => {
    if (status === "authenticated") {
      router.push(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  const handleWalletSignIn = useCallback(async () => {
    if (!walletAddress) {
      setAuthError("Connect a Solana wallet first.");
      return;
    }

    setIsWalletSigningIn(true);
    setAuthError(null);

    try {
      const challengeResponse = await fetch("/api/auth/solana/nonce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ walletAddress }),
      });

      const challengePayload = (await challengeResponse.json()) as
        | { error: string }
        | { message: string };

      if (!challengeResponse.ok || "error" in challengePayload) {
        throw new Error(
          "error" in challengePayload
            ? challengePayload.error
            : "Failed to create auth challenge"
        );
      }

      const message = challengePayload.message;
      const messageBytes = new TextEncoder().encode(message);

      const signatureBytes = await signWalletMessage(wallet, messageBytes);

      const signature = bytesToBase64(signatureBytes);

      const result = await signIn("solana-wallet", {
        walletAddress,
        message,
        signature,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      router.push(callbackUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Wallet sign-in failed";
      setAuthError(message);
    } finally {
      setIsWalletSigningIn(false);
    }
  }, [walletAddress, wallet, callbackUrl, router]);

  if (status === "authenticated") return null;

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-raised"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <section className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
            Sign In
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Access GreenCert Dashboard
          </h1>
          <p className="mt-3 text-base text-foreground-secondary">
            Continue with Google or connect your Solana wallet.
          </p>

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl })}
              className="inline-flex items-center justify-center gap-2 rounded-lg gradient-bg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <LogIn className="h-4 w-4" />
              Continue with Google
            </button>
          </div>

          <div className="my-5 border-t border-border" />

          <p className="text-sm font-semibold text-foreground">
            Connect Solana Wallet
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
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

          <div className="mt-4 rounded-lg border border-border bg-background/40 p-3">
            <p className="text-xs uppercase tracking-wide text-foreground-tertiary">
              Connected Wallet
            </p>
            <p className="mt-1 break-all font-mono text-sm text-foreground">
              {walletAddress || "Not connected"}
            </p>
          </div>

          <button
            type="button"
            disabled={!walletAddress || isWalletSigningIn}
            onClick={handleWalletSignIn}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Wallet className="h-4 w-4" />
            {isWalletSigningIn ? "Signing in..." : "Sign in with Wallet"}
          </button>

          {authError && (
            <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {authError}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <p className="text-sm text-foreground-secondary">
              Loading sign-in...
            </p>
          </div>
        </main>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
