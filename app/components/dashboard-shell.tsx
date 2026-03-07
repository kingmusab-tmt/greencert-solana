"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  Link2,
  Menu,
  Moon,
  Shield,
  Settings,
  Sun,
  User,
  Wallet,
  X,
} from "lucide-react";
import { useTheme } from "@/app/components/theme-provider";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  roles?: string[];
};

type DashboardNotice = {
  id: string;
  title: string;
  body: string;
  time: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
    roles: ["member", "manager", "admin"],
  },
  {
    href: "/dashboard/settings?tab=profile",
    label: "Profile",
    icon: User,
    roles: ["member", "manager", "admin"],
  },
  {
    href: "/dashboard/settings?tab=accounts",
    label: "Linked Accounts",
    icon: Link2,
    roles: ["member", "manager", "admin"],
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    roles: ["manager", "admin"],
  },
];

const DEFAULT_NOTICES: DashboardNotice[] = [
  {
    id: "n1",
    title: "Telemetry ingest healthy",
    body: "All device streams were verified successfully in the last 15 minutes.",
    time: "5m ago",
  },
  {
    id: "n2",
    title: "Mint readiness update",
    body: "At least one linked wallet is now ready for the next GreenCert mint.",
    time: "18m ago",
  },
  {
    id: "n3",
    title: "Security reminder",
    body: "Review linked identities in settings and rotate unused access methods.",
    time: "1h ago",
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  if (item.href.startsWith("/dashboard/settings")) {
    return pathname.startsWith("/dashboard/settings");
  }

  return pathname.startsWith(item.href);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const role = session?.user?.role ?? "member";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  const initials = useMemo(() => {
    const source = session?.user?.name || session?.user?.email || "GC";
    const parts = source.trim().split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }

    return (parts[0]?.slice(0, 2) || "GC").toUpperCase();
  }, [session?.user?.name, session?.user?.email]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 border-r border-border bg-surface p-5 transition-all lg:translate-x-0 ${
            sidebarCollapsed ? "lg:w-20" : "lg:w-72"
          } ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className={sidebarCollapsed ? "hidden lg:block" : ""}>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground-tertiary lg:hidden xl:block">
                GreenCert
              </p>
              <p className="mt-1 text-lg font-bold tracking-tight lg:hidden xl:block">
                Enterprise Hub
              </p>
              {sidebarCollapsed && (
                <p className="hidden text-center text-xs font-semibold uppercase tracking-[0.1em] text-foreground-tertiary lg:block xl:hidden">
                  GC
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition hover:bg-surface-raised lg:hidden"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="mt-6 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item);

              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    sidebarCollapsed ? "justify-center" : "gap-3"
                  } ${
                    active
                      ? "gradient-bg text-white"
                      : "text-foreground-secondary hover:bg-surface-raised hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {!sidebarCollapsed && item.label}
                </Link>
              );
            })}
          </nav>

          <div
            className={`mt-6 rounded-xl border border-border bg-background/40 p-3 ${
              sidebarCollapsed ? "hidden lg:block" : ""
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
              Current Mode
            </p>
            <button
              type="button"
              onClick={toggle}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-raised"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-4 w-4" /> Switch to Light
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" /> Switch to Dark
                </>
              )}
            </button>
          </div>
        </aside>

        <div
          className={`flex min-h-screen flex-1 flex-col transition-all ${
            sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"
          }`}
        >
          <header className="sticky top-0 z-30 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition hover:bg-surface-raised lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((prev) => !prev)}
                  className="hidden h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition hover:bg-surface-raised lg:inline-flex"
                  aria-label="Toggle sidebar"
                >
                  {sidebarCollapsed ? (
                    <ChevronsRight className="h-4 w-4" />
                  ) : (
                    <ChevronsLeft className="h-4 w-4" />
                  )}
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-foreground-tertiary">
                    Dashboard
                  </p>
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                    Operations Center
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground-tertiary">
                      <Shield className="h-3 w-3" />
                      {roleLabel}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggle}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition hover:bg-surface-raised"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setNotificationsOpen(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition hover:bg-surface-raised"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProfileOpen((prev) => !prev)}
                    className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-xs font-bold text-foreground transition hover:bg-surface-raised"
                    aria-label="Open profile menu"
                  >
                    {session?.user?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={session.user.image}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-surface p-2 shadow-xl">
                      <div className="mb-1 px-2 py-1.5">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {session?.user?.name || "GreenCert User"}
                        </p>
                        <p className="truncate text-xs text-foreground-tertiary">
                          {session?.user?.email || "No email linked"}
                        </p>
                      </div>

                      <Link
                        href="/dashboard/settings?tab=profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground-secondary transition hover:bg-surface-raised hover:text-foreground"
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground-secondary transition hover:bg-surface-raised hover:text-foreground"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground-secondary transition hover:bg-surface-raised hover:text-foreground"
                      >
                        <Wallet className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>

      {notificationsOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            onClick={() => setNotificationsOpen(false)}
            className="absolute inset-0 bg-background/50"
            aria-label="Close notifications"
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-sm border-l border-border bg-surface p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground-tertiary">
                  Notifications
                </p>
                <h3 className="mt-1 text-lg font-bold text-foreground">
                  Activity Feed
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition hover:bg-surface-raised"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {DEFAULT_NOTICES.map((notice) => (
                <article
                  key={notice.id}
                  className="rounded-xl border border-border bg-background/40 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {notice.title}
                    </p>
                    <span className="text-[11px] text-foreground-tertiary">
                      {notice.time}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-foreground-secondary">
                    {notice.body}
                  </p>
                </article>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
