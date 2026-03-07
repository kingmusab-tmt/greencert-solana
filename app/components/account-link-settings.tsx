"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useWalletConnection } from "@solana/react-hooks";
import { Link2, Mail, Unlink2, Wallet } from "lucide-react";
import { bytesToBase64, signWalletMessage } from "@/app/lib/wallet-signature";

function mapLinkError(code: string | null): string | null {
  switch (code) {
    case "missing_token":
    case "expired_or_invalid":
      return "Google link session expired. Try again.";
    case "wallet_conflict":
      return "This wallet is already linked to another account.";
    case "unauthorized":
      return "Please sign in before linking accounts.";
    case "server_error":
      return "Server error while linking Google. Try again.";
    case "invalid_link_request":
    case "google_not_ready":
      return "Could not complete Google linking flow.";
    default:
      return null;
  }
}

function mapLinkSuccess(code: string | null): string | null {
  switch (code) {
    case "google":
      return "Google is now linked to your wallet account.";
    case "unlink_google":
      return "Google account was unlinked.";
    case "unlink_wallet":
      return "Wallet was unlinked.";
    default:
      return null;
  }
}

export function AccountLinkSettings({
  title = "Connected Identities",
  showQueryFeedback = false,
}: {
  title?: string;
  showQueryFeedback?: boolean;
}) {
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();
  const { wallet, connectors, connect } = useWalletConnection();

  const walletAddress = wallet?.account.address ?? "";
  const linkedWalletAddress = session?.user?.linkedWalletAddress ?? "";
  const linkedGoogleEmail = session?.user?.linkedGoogleEmail ?? "";
  const authProvider = session?.user?.authProvider ?? "unknown";

  const [isLinkingWallet, setIsLinkingWallet] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isUnlinkingWallet, setIsUnlinkingWallet] = useState(false);
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const queryError = showQueryFeedback
    ? mapLinkError(searchParams.get("linkError"))
    : null;

  const querySuccess = showQueryFeedback
    ? mapLinkSuccess(searchParams.get("linked"))
    : null;

  const canLinkWallet = !linkedWalletAddress;
  const canLinkGoogle = !linkedGoogleEmail;

  const statusText = useMemo(() => {
    if (status === "loading") {
      return "Loading account status...";
    }
    if (status !== "authenticated") {
      return "Sign in to manage linked accounts.";
    }
    return null;
  }, [status]);

  const handleLinkWallet = useCallback(async () => {
    if (!walletAddress) {
      setLocalError("Connect a Solana wallet first.");
      return;
    }

    setIsLinkingWallet(true);
    setLocalError(null);
    setLocalSuccess(null);

    try {
      const challengeResponse = await fetch("/api/auth/solana/link-nonce", {
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
            : "Failed to create wallet link challenge"
        );
      }

      const message = challengePayload.message;
      const messageBytes = new TextEncoder().encode(message);

      const signatureBytes = await signWalletMessage(wallet, messageBytes);

      const signature = bytesToBase64(signatureBytes);

      const response = await fetch("/api/auth/solana/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          message,
          signature,
        }),
      });

      const payload = (await response.json()) as
        | { error: string }
        | { ok: true; walletAddress: string };

      if (!response.ok || "error" in payload) {
        throw new Error(
          "error" in payload ? payload.error : "Wallet link failed"
        );
      }

      await update();
      setLocalSuccess("Wallet linked successfully.");
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Could not link wallet"
      );
    } finally {
      setIsLinkingWallet(false);
    }
  }, [walletAddress, wallet, update]);

  const handleLinkGoogle = useCallback(async () => {
    setIsLinkingGoogle(true);
    setLocalError(null);
    setLocalSuccess(null);

    try {
      const response = await fetch("/api/auth/google/link/start", {
        method: "POST",
      });

      const payload = (await response.json()) as
        | { error: string }
        | { callbackUrl: string };

      if (!response.ok || "error" in payload) {
        throw new Error(
          "error" in payload ? payload.error : "Could not start Google linking"
        );
      }

      await signIn("google", {
        callbackUrl: payload.callbackUrl,
      });
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : "Could not start Google linking"
      );
    } finally {
      setIsLinkingGoogle(false);
    }
  }, []);

  const handleGoogleSignIn = useCallback(() => {
    signIn("google", { callbackUrl: "/dashboard/settings" });
  }, []);

  const handleUnlinkWallet = useCallback(async () => {
    setIsUnlinkingWallet(true);
    setLocalError(null);
    setLocalSuccess(null);

    try {
      const response = await fetch("/api/auth/unlink/wallet", {
        method: "POST",
      });

      const payload = (await response.json()) as { error?: string; ok?: true };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Could not unlink wallet");
      }

      await update();
      setLocalSuccess("Wallet was unlinked.");
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Could not unlink wallet"
      );
    } finally {
      setIsUnlinkingWallet(false);
    }
  }, [update]);

  const handleUnlinkGoogle = useCallback(async () => {
    setIsUnlinkingGoogle(true);
    setLocalError(null);
    setLocalSuccess(null);

    try {
      const response = await fetch("/api/auth/unlink/google", {
        method: "POST",
      });

      const payload = (await response.json()) as { error?: string; ok?: true };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Could not unlink Google");
      }

      await update();
      setLocalSuccess("Google account was unlinked.");
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Could not unlink Google"
      );
    } finally {
      setIsUnlinkingGoogle(false);
    }
  }, [update]);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
        Account Settings
      </p>
      <h2 className="mt-2 text-xl font-semibold text-foreground">{title}</h2>

      {statusText && (
        <p className="mt-3 text-sm text-foreground-secondary">{statusText}</p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-border bg-background/40 p-4">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">
            <Mail className="h-4 w-4" /> Google
          </p>
          <p className="mt-2 break-all text-sm text-foreground">
            {linkedGoogleEmail || "Not linked"}
          </p>
          <p className="mt-1 text-xs text-foreground-tertiary">
            Login provider: {authProvider}
          </p>

          {status === "authenticated" && canLinkGoogle && (
            <>
              {authProvider === "solana-wallet" ? (
                <button
                  type="button"
                  onClick={handleLinkGoogle}
                  disabled={isLinkingGoogle}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {isLinkingGoogle ? "Redirecting..." : "Link Google Account"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-raised"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Continue with Google
                </button>
              )}
            </>
          )}

          {status === "authenticated" && !canLinkGoogle && (
            <button
              type="button"
              onClick={handleUnlinkGoogle}
              disabled={isUnlinkingGoogle}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Unlink2 className="h-3.5 w-3.5" />
              {isUnlinkingGoogle ? "Unlinking..." : "Unlink Google"}
            </button>
          )}
        </article>

        <article className="rounded-xl border border-border bg-background/40 p-4">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">
            <Wallet className="h-4 w-4" /> Wallet
          </p>
          <p className="mt-2 break-all font-mono text-sm text-foreground">
            {linkedWalletAddress || "Not linked"}
          </p>

          {status === "authenticated" && canLinkWallet && (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {connectors.length > 0 ? (
                  connectors.map((connector) => {
                    const supported = connector.isSupported();

                    return (
                      <button
                        key={connector.id}
                        type="button"
                        onClick={() =>
                          connect(connector.id, {
                            allowInteractiveFallback: true,
                          })
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
                  <p className="text-xs text-foreground-secondary">
                    No wallet connectors detected in this browser.
                  </p>
                )}
              </div>

              <p className="break-all font-mono text-xs text-foreground-secondary">
                {walletAddress || "No wallet connected"}
              </p>

              <button
                type="button"
                onClick={handleLinkWallet}
                disabled={!walletAddress || isLinkingWallet}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Link2 className="h-3.5 w-3.5" />
                {isLinkingWallet ? "Linking wallet..." : "Link Wallet"}
              </button>
            </div>
          )}

          {status === "authenticated" && !canLinkWallet && (
            <button
              type="button"
              onClick={handleUnlinkWallet}
              disabled={isUnlinkingWallet}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Unlink2 className="h-3.5 w-3.5" />
              {isUnlinkingWallet ? "Unlinking..." : "Unlink Wallet"}
            </button>
          )}
        </article>
      </div>

      {(querySuccess || localSuccess) && (
        <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {querySuccess || localSuccess}
        </p>
      )}

      {(queryError || localError) && (
        <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {queryError || localError}
        </p>
      )}
    </section>
  );
}
