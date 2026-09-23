"use client";

// MDRRMO Console — Reports: monitoring summary + printable table + CSV export
import { BarChart3, Building2, CheckCircle2, Download, FileSpreadsheet, Printer, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, formatDate, formatDateTime } from "@/lib/qas33/api";
import { STATUS_META, SUBMISSION_STATUSES, type SubmissionStatus } from "@/lib/qas33/types";
import { cn } from "@/lib/utils";
import { CardsSkeleton, ErrorAlert, StatusBadge, TableSkeleton, useLoad } from "./mdrrmo-shared";

type ReportsData = Awaited<ReturnType<typeof api.adminReports>>;

export default function MdrrmoReports() {
  const { data, loading, error, reload } = useLoad<ReportsData>(() => api.adminReports());

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <CardsSkeleton count={4} />
        <TableSkeleton rows={12} cols={8} />
      </div>
    );
  }
  if (error || !data) return <ErrorAlert message={error ?? "No data"} onRetry={reload} />;

  const { year, rows, counts, totals } = data;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">BDRRMP {year} monitoring report — all 33 barangays</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/api/admin/reports?export=csv" download>
              <FileSpreadsheet className="h-4 w-4" /> Export CSV
            </a>
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print Report
          </Button>
        </div>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<Building2 className="h-4 w-4" />} label="Total Barangays" value={String(totals.barangays)} />
        <SummaryCard icon={<Send className="h-4 w-4" />} label="Submitted" value={String(totals.submitted)} note="at least once this cycle" />
        <SummaryCard icon={<CheckCircle2 className="h-4 w-4" />} label="Approved" value={String(totals.approved)} tone="emerald" />
        <SummaryCard
          icon={<Star className="h-4 w-4" />}
          label="Avg. Rating"
          value={totals.avgRating !== null ? `${totals.avgRating}/100` : "—"}
          tone="emerald"
        />
      </div>

      {/* Status chips */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" /> Status Overview
          </CardTitle>
          <CardDescription>Distribution of barangay submission statuses for {year}.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {SUBMISSION_STATUSES.filter((s) => (counts[s] ?? 0) > 0).map((s) => (
            <span
              key={s}
              className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_META[s].badge)}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s].dot)} />
              {STATUS_META[s].label}
              <span className="font-semibold tabular-nums">{counts[s]}</span>
            </span>
          ))}
        </CardContent>
      </Card>

      {/* Monitoring table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Full Monitoring Table</CardTitle>
          <CardDescription>{rows.length} barangays · generated {formatDateTime(new Date().toISOString())}</CardDescription>
        </CardHeader>
        <CardContent className="p-0 pb-3">
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="pl-4">Code</TableHead>
                  <TableHead>Barangay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Last Submitted</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Document ID</TableHead>
                  <TableHead className="text-center">Downloads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.code}>
                    <TableCell className="pl-4 font-mono text-xs text-muted-foreground">{r.code}</TableCell>
                    <TableCell className="font-medium">{r.barangay}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status as SubmissionStatus} />
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">{r.progress}%</TableCell>
                    <TableCell className="font-mono text-xs">{r.version > 0 ? `v${r.version}` : "—"}</TableCell>
                    <TableCell>
                      <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                        {r.template === "Tagalog" ? "TL" : r.template === "English" ? "EN" : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.lastSubmitted ? formatDate(r.lastSubmitted) : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.approvedAt ? formatDate(r.approvedAt) : "—"}</TableCell>
                    <TableCell className="text-sm tabular-nums">{r.rating !== null ? <span className="font-medium">{r.rating}/100</span> : "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.docId || "—"}</TableCell>
                    <TableCell className="text-center text-sm tabular-nums">
                      {r.downloads > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Download className="h-3 w-3 text-muted-foreground" />
                          {r.downloads}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note?: string;
  tone?: "emerald";
}) {
  return (
    <Card className="py-4">
      <CardContent className="space-y-1">
        <div className={cn("flex items-center gap-2 text-xs font-medium text-muted-foreground", tone === "emerald" && "text-emerald-700 dark:text-emerald-500")}>
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground", tone === "emerald" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400")}>
            {icon}
          </span>
          {label}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}
