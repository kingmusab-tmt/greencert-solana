import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardSettingsTabs } from "@/app/components/dashboard-settings-tabs";

export default function DashboardSettingsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
            Dashboard Settings
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Profile And Account Settings
          </h1>
          <p className="mt-2 text-sm text-foreground-secondary">
            Manage your profile details and linked login methods.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-raised"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <DashboardSettingsTabs />
    </div>
  );
}
