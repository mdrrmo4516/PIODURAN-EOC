"use client";

// QAS33 — MDRRMO ADMIN CONSOLE shell
import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ClipboardList,
  Database,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  LogOut,
  ScrollText,
  Settings2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/qas33/api";
import {
  ADMIN_ROLE_META,
  isSystemAdmin,
  normalizeAdminRole,
  type SessionInfo,
} from "@/lib/qas33/types";
import { cn } from "@/lib/utils";
import MdrrmoAudit from "./mdrrmo-audit";
import MdrrmoBarangays from "./mdrrmo-barangays";
import MdrrmoDatabase from "./mdrrmo-database";
import MdrrmoDashboard from "./mdrrmo-dashboard";
import MdrrmoNotifications from "./mdrrmo-notifications";
import MdrrmoQueue from "./mdrrmo-queue";
import MdrrmoReports from "./mdrrmo-reports";
import MdrrmoRequirements from "./mdrrmo-requirements";
import MdrrmoReview from "./mdrrmo-review";
import MdrrmoSettings from "./mdrrmo-settings";
import MdrrmoTutorials from "./mdrrmo-tutorials";
import MdrrmoUsers from "./mdrrmo-users";
import FileLibrary from "./file-library";

type ViewKey =
  | "dashboard"
  | "barangays"
  | "queue"
  | "requirements"
  | "tutorials"
  | "reports"
  | "notifications"
  | "files"
  | "users"
  | "database"
  | "audit"
  | "settings";

// Console areas restricted to the System Administrator role
const SYSADMIN_ONLY_KEYS: ReadonlySet<ViewKey> = new Set(["users", "settings", "database"]);

const NAV: { key: ViewKey; label: string; icon: typeof Bell }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "barangays", label: "Barangays", icon: Building2 },
  { key: "queue", label: "Review Queue", icon: ClipboardList },
  { key: "requirements", label: "References", icon: ListChecks },
  { key: "tutorials", label: "Tutorials", icon: BookOpen },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "files", label: "File Library", icon: FolderOpen },
  { key: "users", label: "Users", icon: Users },
  { key: "database", label: "Database", icon: Database },
  { key: "audit", label: "Audit Logs", icon: ScrollText },
  { key: "settings", label: "Settings", icon: Settings2 },
];

export default function MdrrmoApp({ session, onLogout }: { session: SessionInfo; onLogout: () => void }) {
  const [view, setView] = useState<ViewKey>("queue"); // Review Queue is the default view
  const [detailId, setDetailId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [unreadTick, setUnreadTick] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);

  // Role-based navigation: Users / Settings / Database are System Administrator only
  const adminRole = normalizeAdminRole(session.admin?.role);
  const sysAdmin = isSystemAdmin(adminRole);
  const navItems = sysAdmin ? NAV : NAV.filter((item) => !SYSADMIN_ONLY_KEYS.has(item.key));

  useEffect(() => {
    let alive = true;
    api
      .adminNotifications()
      .then((res) => {
        if (alive) setUnread(res.unread);
      })
      .catch(() => {
        // header bell count is non-critical — ignore refresh failures
      });
    return () => {
      alive = false;
    };
  }, [unreadTick]);

  // Safe to call from event handlers / child callbacks — bumps the tick above.
  const refreshUnread = useCallback(() => setUnreadTick((t) => t + 1), []);

  const go = (next: ViewKey) => {
    setDetailId(null);
    setView(next);
    if (next === "notifications") void refreshUnread();
  };

  const openDetail = (id: string) => {
    if (!id) return;
    setDetailId(id);
  };

  const bumpRefresh = () => {
    setDataVersion((v) => v + 1);
    void refreshUnread();
  };

  const activeView = detailId ? null : view;

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Sticky app header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="flex h-14 items-center gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
              Q33
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight">QAS33</div>
              <div className="text-[11px] text-muted-foreground">MDRRMO Console</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-xs font-semibold">{session.admin?.name}</div>
              <div className="mt-0.5">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-1.5 py-px text-[10px] font-semibold",
                    ADMIN_ROLE_META[adminRole].badge
                  )}
                >
                  {ADMIN_ROLE_META[adminRole].label}
                </span>
              </div>
            </div>
            <span
              className={cn(
                "mr-1 inline-flex items-center rounded-full border px-1.5 py-px text-[10px] font-semibold sm:hidden",
                ADMIN_ROLE_META[adminRole].badge
              )}
            >
              {ADMIN_ROLE_META[adminRole].short}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="relative h-9 w-9"
              aria-label={`Notifications (${unread} unread)`}
              onClick={() => go("notifications")}
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Log out" onClick={onLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {/* Mobile navigation (top scrollable tabs) */}
        <nav className="border-t lg:hidden" aria-label="Main navigation">
          <div className="flex gap-1 overflow-x-auto px-2 py-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => go(item.key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                  {item.key === "notifications" && unread > 0 && (
                    <span className={cn("ml-0.5 rounded-full px-1.5 text-[10px] font-bold", active ? "bg-primary-foreground/20" : "bg-red-600 text-white")}>
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <div className="flex w-full flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r bg-background lg:block">
          <nav className="flex h-full flex-col gap-0.5 p-3" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => go(item.key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.key === "notifications" && unread > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                        active ? "bg-primary-foreground/20" : "bg-red-600 text-white"
                      )}
                    >
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="mt-auto rounded-lg border border-dashed p-3 text-[11px] leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground">QAS33 · BDRRMP</p>
              <p>Barangay DRRM Plan Review, Tracking, Submission &amp; Management</p>
              <p className="mt-1">Municipality of Pio Duran, Albay</p>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 p-4 md:p-6">
          {detailId ? (
            <MdrrmoReview key={detailId} id={detailId} session={session} onBack={() => setDetailId(null)} onChanged={bumpRefresh} />
          ) : view === "dashboard" ? (
            <MdrrmoDashboard refreshKey={dataVersion} />
          ) : view === "barangays" ? (
            <MdrrmoBarangays onOpenSubmission={openDetail} refreshKey={dataVersion} />
          ) : view === "queue" ? (
            <MdrrmoQueue onOpen={openDetail} refreshKey={dataVersion} />
          ) : view === "requirements" ? (
            <MdrrmoRequirements session={session} />
          ) : view === "tutorials" ? (
            <MdrrmoTutorials session={session} />
          ) : view === "reports" ? (
            <MdrrmoReports />
          ) : view === "notifications" ? (
            <MdrrmoNotifications onRead={refreshUnread} />
          ) : view === "files" ? (
            <FileLibrary session={session} />
          ) : view === "users" ? (
            <MdrrmoUsers session={session} />
          ) : view === "database" ? (
            <MdrrmoDatabase />
          ) : view === "audit" ? (
            <MdrrmoAudit />
          ) : (
            <MdrrmoSettings />
          )}
        </main>
      </div>
    </div>
  );
}
