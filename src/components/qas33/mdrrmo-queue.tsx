"use client";

// MDRRMO Console — Review Queue (default view)
import { useState } from "react";
import { ClipboardCheck, Eye, FileSignature, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, formatDateTime } from "@/lib/qas33/api";
import type { AdminSubmissionRow, SubmissionStatus } from "@/lib/qas33/types";
import { cn } from "@/lib/utils";
import { ErrorAlert, StatusBadge, TableSkeleton, templateBadge, useDebounced, useLoad } from "./mdrrmo-shared";

type QueueData = Awaited<ReturnType<typeof api.adminSubmissions>>;

const CHIPS: { key: string; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "UNDER_REVIEW", label: "Under Review" },
  { key: "NEEDS_REVISION", label: "Needs Revision" },
  { key: "RESUBMITTED", label: "Resubmitted" },
  { key: "APPROVED", label: "Approved" },
  { key: "READY_FOR_DOWNLOAD", label: "Ready for Download" },
  { key: "DOWNLOADED", label: "Downloaded" },
  { key: "DRAFT", label: "Draft" },
  { key: "NOT_STARTED", label: "Not Started" },
];

export default function MdrrmoQueue({
  onOpen,
  refreshKey = 0,
}: {
  onOpen: (id: string) => void;
  refreshKey?: number;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [status, setStatus] = useState("ALL");

  const { data, loading, error, reload } = useLoad<QueueData>(() => api.adminSubmissions(debounced, status), `${debounced}|${status}|${refreshKey}`);
  const rows = data?.submissions ?? [];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Review Queue</h1>
          <p className="text-sm text-muted-foreground">
            BDRRMP {data?.year ?? ""} submissions from the 33 barangays — review, comment, evaluate and approve
          </p>
        </div>
      </header>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Status filter">
        {CHIPS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            role="tab"
            aria-selected={status === chip.key}
            onClick={() => setStatus(chip.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              status === chip.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-3 pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search barangay or code..."
              className="pl-8"
              aria-label="Search submissions"
            />
          </div>
          <p className="text-xs text-muted-foreground">{loading ? "Loading…" : `${rows.length} submission${rows.length === 1 ? "" : "s"}`}</p>
        </CardHeader>
        <CardContent className="p-0 pb-3">
          {error ? (
            <div className="p-4">
              <ErrorAlert message={error} onRetry={reload} />
            </div>
          ) : loading ? (
            <div className="p-4">
              <TableSkeleton rows={8} cols={7} />
            </div>
          ) : (
            <div className="max-h-[65vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="pl-4">Barangay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Last Update</TableHead>
                    <TableHead className="pr-4 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                        No submissions match your filters.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((row) => (
                    <QueueRow key={row.id} row={row} onOpen={onOpen} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QueueRow({ row, onOpen }: { row: AdminSubmissionRow; onOpen: (id: string) => void }) {
  const status = row.status as SubmissionStatus;
  return (
    <TableRow>
      <TableCell className="pl-4">
        <div className="font-medium">{row.barangay.name}</div>
        <div className="font-mono text-xs text-muted-foreground">{row.barangay.code}</div>
      </TableCell>
      <TableCell>
        <StatusBadge status={status} />
      </TableCell>
      <TableCell className="text-sm tabular-nums">{row.progress}%</TableCell>
      <TableCell className="font-mono text-xs">{row.version > 0 ? `v${row.version}` : "—"}</TableCell>
      <TableCell>
        <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{templateBadge(row.templateLang)}</span>
      </TableCell>
      <TableCell className="text-sm tabular-nums">
        {row.lastRating ? (
          <span className={cn("font-medium", row.lastRating.total / Math.max(1, row.lastRating.maxTotal) >= 0.75 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400")}>
            {row.lastRating.total}/{row.lastRating.maxTotal}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDateTime(row.updatedAt)}</TableCell>
      <TableCell className="pr-4 text-right">
        <QueueAction row={row} status={status} onOpen={onOpen} />
      </TableCell>
    </TableRow>
  );
}

function QueueAction({ row, status, onOpen }: { row: AdminSubmissionRow; status: SubmissionStatus; onOpen: (id: string) => void }) {
  switch (status) {
    case "SUBMITTED":
    case "RESUBMITTED":
      return (
        <Button size="sm" onClick={() => onOpen(row.id)}>
          <ClipboardCheck className="h-4 w-4" /> Review
        </Button>
      );
    case "UNDER_REVIEW":
    case "NEEDS_REVISION":
      return (
        <Button size="sm" variant="outline" onClick={() => onOpen(row.id)}>
          <ClipboardCheck className="h-4 w-4" /> Continue Review
        </Button>
      );
    case "APPROVED":
      return (
        <Button
          size="sm"
          className="bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
          onClick={() => onOpen(row.id)}
        >
          <FileSignature className="h-4 w-4" /> Finalize
        </Button>
      );
    default:
      return (
        <Button size="sm" variant="outline" onClick={() => onOpen(row.id)}>
          <Eye className="h-4 w-4" /> View
        </Button>
      );
  }
}
