"use client";

// MDRRMO Console — Dashboard view
import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  Star,
  Target,
} from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api, formatDateTime } from "@/lib/qas33/api";
import { STATUS_META, SUBMISSION_STATUSES, type AuditEntry } from "@/lib/qas33/types";
import { cn } from "@/lib/utils";
import { ActorBadge, CardsSkeleton, ErrorAlert, StatusBadge, useLoad } from "./mdrrmo-shared";

type OverviewData = Awaited<ReturnType<typeof api.adminOverview>>;

export default function MdrrmoDashboard({ refreshKey = 0 }: { refreshKey?: number }) {
  const { data, loading, error, reload } = useLoad<OverviewData>(() => api.adminOverview(), String(refreshKey));

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <CardsSkeleton count={4} />
        <CardsSkeleton count={4} />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }
  if (error || !data) return <ErrorAlert message={error ?? "No data"} onRetry={reload} />;

  const { stats, year, recentActivity } = data;
  const approvedCount =
    (stats.counts.APPROVED ?? 0) + (stats.counts.READY_FOR_DOWNLOAD ?? 0) + (stats.counts.DOWNLOADED ?? 0) + (stats.counts.ARCHIVED ?? 0);
  const distribution = SUBMISSION_STATUSES.map((s) => ({ status: s, count: stats.counts[s] ?? 0 })).filter(
    (r) => r.count > 0
  );
  const maxCount = Math.max(1, ...distribution.map((r) => r.count));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">BDRRMP {year} monitoring overview — Municipality of Pio Duran</p>
        </div>
      </header>

      {/* Row 1 — headline stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Building2 className="h-4 w-4" />} label="Barangays" value={String(stats.total)} note={`${stats.active} active accounts`} />
        <StatCard
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Pending Reviews"
          value={String(stats.pendingReviews)}
          note="awaiting MDRRMO action"
          tone="amber"
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Approved"
          value={String(approvedCount)}
          note="approved + finalized"
          tone="emerald"
        />
        <StatCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Avg. Progress"
          value={`${stats.avgProgress}%`}
          note="form completion across 33 barangays"
          progress={stats.avgProgress}
        />
      </div>

      {/* Row 2 — document stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<FileText className="h-4 w-4" />} label="Documents Generated" value={String(stats.documentsGenerated)} note="signed final PDFs" />
        <StatCard icon={<Download className="h-4 w-4" />} label="Total Downloads" value={String(stats.totalDownloads)} note="downloads by barangays" />
        <StatCard
          icon={<Star className="h-4 w-4" />}
          label="Avg. Rating"
          value={stats.avgRating !== null ? `${stats.avgRating}/100` : "—"}
          note="QAT evaluation score"
          tone="emerald"
        />
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label="Completion Rate"
          value={`${stats.completionRate}%`}
          note="barangays fully completed"
          progress={stats.completionRate}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Status distribution */}
        <Card className="lg:col-span-2 self-start">
          <CardHeader>
            <CardTitle className="text-base">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {distribution.length === 0 && <p className="text-sm text-muted-foreground">No submissions yet.</p>}
            {distribution.map(({ status, count }) => (
              <div key={status} className="flex items-center gap-3">
                <span className="w-44 shrink-0">
                  <StatusBadge status={status} />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", STATUS_META[status].dot)}
                    style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-semibold tabular-nums">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-3 self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="max-h-[26rem] space-y-1.5 overflow-y-auto pr-1">
              {recentActivity.length === 0 && <p className="text-sm text-muted-foreground">No activity recorded yet.</p>}
              {recentActivity.map((entry) => (
                <ActivityRow key={entry.id} entry={entry} />
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  note,
  tone,
  progress,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note?: string;
  tone?: "amber" | "emerald";
  progress?: number;
}) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground",
              tone === "amber" && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
              tone === "emerald" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
            )}
          >
            {icon}
          </span>
          {label}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
        {progress !== undefined && <Progress value={progress} className="mt-1 h-1.5" />}
      </CardContent>
    </Card>
  );
}

function ActivityRow({ entry }: { entry: AuditEntry }) {
  return (
    <li className="rounded-lg border bg-card px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <ActorBadge type={entry.actorType} />
        <span className="text-sm font-medium">{entry.actorName}</span>
        <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{entry.action}</code>
        {entry.barangay && <span className="text-xs text-muted-foreground">· {entry.barangay}</span>}
        <span className="ml-auto text-[11px] text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
      </div>
      {entry.detail && <p className="mt-1 text-xs text-muted-foreground">{entry.detail}</p>}
    </li>
  );
}
