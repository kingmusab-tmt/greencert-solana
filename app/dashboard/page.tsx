import { AccountLinkSettings } from "@/app/components/account-link-settings";
import { VerificationDashboard } from "@/app/components/verification-dashboard";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
          GreenCert Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Verification And Mint Operations
        </h1>
        <p className="mt-2 text-sm text-foreground-secondary">
          Enterprise overview for wallet-linked telemetry, validation, and mint
          readiness.
        </p>
      </section>

      <div>
        <AccountLinkSettings title="Link Google And Wallet" />
      </div>

      <VerificationDashboard />
    </div>
  );
}
