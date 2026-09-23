"use client";

// QAS33 Barangay Portal — application shell (header, tab nav, data loading)

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  FileText,
  FolderOpen,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageSquare,
  ShieldCheck,
  User,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/lib/qas33/api";
import type {
  BarangayOverview,
  BarangaySubmissionData,
  NotificationItem,
  SessionInfo,
} from "@/lib/qas33/types";
import { CommentsTab, DocumentsTab, NotificationsTab, ProfileTab } from "./barangay-misc";
import { DashboardTab, RequirementsTab, TutorialsTab } from "./barangay-tabs";
import { LoadError, errMsg } from "./barangay-shared";
import BarangayWizard from "./barangay-wizard";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "wizard", label: "My BDRRMP", icon: FileText },
  { key: "requirements", label: "Requirements", icon: ListChecks },
  { key: "tutorials", label: "Tutorials", icon: BookOpen },
  { key: "documents", label: "Documents", icon: FolderOpen },
  { key: "comments", label: "Comments", icon: MessageSquare },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "profile", label: "Profile", icon: User },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function BarangayApp({
  session,
  onLogout,
}: {
  session: SessionInfo;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [overview, setOverview] = useState<BarangayOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<BarangaySubmissionData | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [focusSection, setFocusSection] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadOverview = useCallback(() => {
    api
      .overview()
      .then((r) => {
        setOverview(r);
        setOverviewError(null);
      })
      .catch((e) => setOverviewError(errMsg(e)));
  }, []);

  const loadSubmission = useCallback(() => {
    api
      .submission()
      .then((r) => {
        setSubmission(r);
        setSubmissionError(null);
      })
      .catch((e) => setSubmissionError(errMsg(e)));
  }, []);

  const loadNotifications = useCallback(() => {
    api
      .notifications()
      .then((r) => {
        setNotifications(r.notifications);
        setUnread(r.unread);
      })
      .catch(() => {
        // bell count is non-critical — ignore
      });
  }, []);

  useEffect(() => {
    loadOverview();
    loadSubmission();
    loadNotifications();
  }, [loadOverview, loadSubmission, loadNotifications]);

  const goWizard = useCallback((sectionKey?: string) => {
    setFocusSection(sectionKey ?? null);
    setTab("wizard");
  }, []);

  const handleFocused = useCallback(() => setFocusSection(null), []);
  const handleUnreadChange = useCallback((n: number) => setUnread(n), []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await api.logout();
    } catch {
      // proceed with local logout even if the server call fails
    }
    onLogout();
  }

  const lang = submission?.submission.templateLang ?? overview?.submission.templateLang ?? null;
  const barangayName = session.barangay?.name ?? overview?.barangay.name ?? "Barangay";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight">QAS33</p>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                Barangay Portal · MDRRMO Pio Duran
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <div className="hidden text-right leading-tight md:block">
              <p className="text-sm font-medium">Barangay {barangayName}</p>
              {session.barangay && (
                <p className="font-mono text-[11px] text-muted-foreground">{session.barangay.code}</p>
              )}
            </div>
            {session.barangay && (
              <Badge variant="outline" className="hidden font-mono text-[10px] md:inline-flex">
                {session.barangay.code}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label={`Notifications (${unread} unread)`}
              onClick={() => setTab("notifications")}
            >
              <Bell className="size-5" aria-hidden="true" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Log out"
              disabled={loggingOut}
              onClick={() => void handleLogout()}
            >
              <LogOut className="size-5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Tab navigation (scrollable) */}
        <nav className="border-t" aria-label="Portal sections">
          <div className="mx-auto w-full max-w-7xl overflow-x-auto px-2 [scrollbar-width:thin]">
            <div className="flex min-w-max gap-1 py-1.5">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  aria-current={tab === key ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    tab === key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  {label}
                  {key === "notifications" && unread > 0 && (
                    <span
                      className={cn(
                        "ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                        tab === "notifications"
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-destructive text-destructive-foreground"
                      )}
                    >
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </header>

      {/* Forced PIN change notice */}
      {session.mustChangePin && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4">
          <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-200">
            <KeyRound />
            <AlertTitle>Change your temporary Access PIN</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-amber-800 dark:text-amber-300/90">
              <span>
                You are still using the temporary PIN issued by the MDRRMO. Please set your own PIN.
              </span>
              <Button size="sm" variant="outline" onClick={() => setTab("profile")}>
                Change PIN
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {tab === "dashboard" &&
          (overviewError ? (
            <LoadError title="Failed to load dashboard" message={overviewError} onRetry={loadOverview} />
          ) : !overview ? (
            <DashboardSkeleton />
          ) : (
            <DashboardTab
              overview={overview}
              notifications={notifications}
              lang={lang}
              onGoWizard={goWizard}
              onOpenTab={(k) => setTab(k as TabKey)}
              onRefresh={() => {
                loadOverview();
                loadNotifications();
              }}
            />
          ))}

        {tab === "wizard" &&
          (submissionError ? (
            <LoadError
              title="Failed to load your BDRRMP"
              message={submissionError}
              onRetry={loadSubmission}
            />
          ) : !submission ? (
            <WizardSkeleton />
          ) : (
            <BarangayWizard
              key={submission.submission.id}
              data={submission}
              barangayName={barangayName}
              onReload={loadSubmission}
              onRefreshOverview={loadOverview}
              focusSectionKey={focusSection}
              onFocused={handleFocused}
            />
          ))}

        {tab === "requirements" &&
          (overviewError ? (
            <LoadError title="Failed to load requirements" message={overviewError} onRetry={loadOverview} />
          ) : !overview ? (
            <DashboardSkeleton />
          ) : (
            <RequirementsTab overview={overview} lang={lang} onGoWizard={(k) => goWizard(k)} />
          ))}

        {tab === "tutorials" && <TutorialsTab />}

        {tab === "documents" && <DocumentsTab lang={lang} onRefreshOverview={loadOverview} />}

        {tab === "comments" && (
          <CommentsTab sections={submission?.sections ?? []} lang={lang} />
        )}

        {tab === "notifications" && (
          <NotificationsTab lang={lang} onUnreadChange={handleUnreadChange} />
        )}

        {tab === "profile" && <ProfileTab session={session} overview={overview} />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-1 px-4 py-3 text-xs text-muted-foreground">
          <span>QAS33 • MDRRMO Pio Duran</span>
          <span className="hidden sm:block">Barangay DRRM Plan Review, Tracking, Submission &amp; Management System</span>
        </div>
      </footer>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

function WizardSkeleton() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="space-y-3 lg:w-72">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="hidden h-96 rounded-xl lg:block" />
      </div>
      <Skeleton className="h-[480px] min-w-0 flex-1 rounded-xl" />
    </div>
  );
}
