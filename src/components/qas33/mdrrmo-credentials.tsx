"use client";

// QAS33 — Credentials module: generate & PRINT official barangay account
// credential sheets (Account Code + Temporary Access PIN + sign-in steps) to
// hand to the 33 barangays. Available to every console role — MDRRMO Officer,
// MDRRMO Staff and System Administrator — so any of them can prepare the
// handouts. Each barangay signs in to its own dashboard with the printed
// credentials and sets its own PIN on first login.
import { useState } from "react";
import {
  Ban,
  Building2,
  FileText,
  KeyRound,
  Loader2,
  Printer,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api, formatDateTime } from "@/lib/qas33/api";
import type { SessionInfo } from "@/lib/qas33/types";
import { ErrorAlert, TableSkeleton, useLoad } from "./mdrrmo-shared";
import { useCredentialPrinter } from "./credential-print";

type BarangaysData = Awaited<ReturnType<typeof api.adminBarangays>>;
type Row = BarangaysData["barangays"][number];

export default function MdrrmoCredentials({ session }: { session: SessionInfo }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const { data, loading, error, reload } = useLoad<BarangaysData>(() => api.adminBarangays("", "ALL"), "credentials");
  const printer = useCredentialPrinter(reload);

  const rows = data?.barangays ?? [];
  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || (r.captain ?? "").toLowerCase().includes(q)
      )
    : rows;

  const pending = rows.filter((r) => r.credential?.tempPinPending).length;
  const setCount = rows.filter((r) => r.credential && !r.credential.tempPinPending).length;
  const noPin = rows.filter((r) => !r.credential).length;

  const pb = (r: Row) => r.captain ?? r.officials.find((o) => o.position === "PUNONG_BARANGAY")?.name ?? "—";

  const handlePrintOne = (row: Row) => {
    if (!row.credential) {
      // No credential at all — the confirm dialog inside the printer issues one.
      toast({
        title: "No PIN yet",
        description: `${row.name} has no Access PIN — a new temporary PIN will be generated for printing.`,
      });
    }
    void printer.printOne(row);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Account Credentials</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate &amp; print the official account handouts (Account Code + temporary PIN) to give to the{" "}
            {rows.length || 33} barangays — each barangay then signs in to its own dashboard.
          </p>
        </div>
        <Button onClick={() => printer.printAll(rows)} disabled={loading || printer.busy} className="gap-1.5">
          {printer.busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Printer className="h-4 w-4" aria-hidden="true" />
          )}
          Print All Barangay Sheets
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xl font-bold tabular-nums leading-none">{rows.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Barangay accounts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xl font-bold tabular-nums leading-none">{pending}</p>
              <p className="mt-1 text-xs text-muted-foreground">Printable now — temp PIN pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/10 text-amber-600 dark:text-amber-400">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xl font-bold tabular-nums leading-none">{setCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">PIN already set — needs new PIN to print</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-500/10 text-zinc-600 dark:text-zinc-400">
              <Ban className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xl font-bold tabular-nums leading-none">{noPin}</p>
              <p className="mt-1 text-xs text-muted-foreground">No PIN issued yet</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barangay table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Barangay Account Handouts</CardTitle>
          <CardDescription>
            {loading
              ? "Loading accounts…"
              : `${filtered.length} of ${rows.length} barangays • sheets print one A4 page per barangay with the temporary PIN and sign-in steps`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pb-3">
          <div className="px-4 pb-3">
            <div className="relative max-w-full sm:max-w-72">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                placeholder="Search barangay or captain…"
                className="pl-8"
                aria-label="Search barangay accounts"
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {error ? (
            <div className="px-4">
              <ErrorAlert message={error} onRetry={reload} />
            </div>
          ) : loading ? (
            <div className="px-4">
              <TableSkeleton rows={6} cols={5} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No barangay accounts match &ldquo;{search}&rdquo;.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[780px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Barangay</TableHead>
                    <TableHead>Punong Barangay</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Access PIN</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="pr-4 text-right">Credential Sheet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const pinPending = r.credential?.tempPinPending ?? false;
                    const pinActive = r.credential?.active ?? false;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="pl-4">
                          <div className="font-medium">{r.name}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">{r.code}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{pb(r)}</TableCell>
                        <TableCell>
                          {r.active ? (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-red-600">
                              <Ban className="h-3.5 w-3.5" aria-hidden="true" /> Disabled
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {!r.credential ? (
                            <span className="text-xs text-muted-foreground">No PIN</span>
                          ) : pinActive ? (
                            <span
                              className={cnBadge(
                                pinPending
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-amber-700 dark:text-amber-400"
                              )}
                            >
                              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                              {pinPending ? "Temp PIN pending" : "Set by barangay"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-red-600">
                              <Ban className="h-3.5 w-3.5" aria-hidden="true" /> Revoked
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {r.credential?.lastLoginAt ? formatDateTime(r.credential.lastLoginAt) : "Never"}
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <Button
                            size="sm"
                            variant={pinPending ? "default" : "outline"}
                            className="gap-1.5"
                            disabled={printer.busy}
                            onClick={() => handlePrintOne(r)}
                          >
                            {printer.busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {pinPending ? "Print" : r.credential ? "Generate PIN & Print" : "Create PIN & Print"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Printed sheets show the temporary PIN only — once a barangay sets its own PIN it can never be printed or viewed
        again. Regenerating a PIN immediately invalidates the old one. Issued by:{" "}
        <span className="font-medium text-foreground">
          {session.admin?.name} ({session.admin?.position})
        </span>
        .
      </p>

      {/* Print overlay + confirmation dialogs (single source of truth) */}
      {printer.overlay}
    </div>
  );
}

function cnBadge(color: string) {
  return `inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium ${color}`;
}
