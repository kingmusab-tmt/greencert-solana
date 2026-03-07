"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AccountLinkSettings } from "@/app/components/account-link-settings";
import { ProfileSettings } from "@/app/components/profile-settings";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "accounts", label: "Linked Accounts" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function getCurrentTab(value: string | null): TabId {
  return value === "accounts" ? "accounts" : "profile";
}

export function DashboardSettingsTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = useMemo(
    () => getCurrentTab(searchParams.get("tab")),
    [searchParams]
  );

  const setTab = useCallback(
    (tab: TabId) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("tab", tab);
      router.replace(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl border border-border bg-surface p-1">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "gradient-bg text-white"
                  : "text-foreground hover:bg-surface-raised"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "profile" ? (
        <ProfileSettings />
      ) : (
        <AccountLinkSettings title="Login Methods" showQueryFeedback />
      )}
    </div>
  );
}
