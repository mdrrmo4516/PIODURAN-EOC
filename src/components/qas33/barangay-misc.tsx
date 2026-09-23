"use client";

// QAS33 Barangay Portal — Documents, Comments, Notifications, Profile tabs

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  Download,
  FileCheck,
  FileText,
  Info,
  Lock,
  MessageSquare,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { api, formatDate, formatDateTime } from "@/lib/qas33/api";
import type {
  BarangayOverview,
  ClientSection,
  CommentItem,
  NotificationItem,
  SessionInfo,
} from "@/lib/qas33/types";
import {
  EmptyState,
  LoadError,
  ReviewActionBadge,
  StatusBadge,
  errMsg,
  notifIcon,
} from "./barangay-shared";

type Translate = (en: string, tl: string) => string;

// ---------------------------------------------------------------------------
// Documents tab
// ---------------------------------------------------------------------------

type DocumentPayload = Awaited<ReturnType<typeof api.document>>;

export function DocumentsTab({
  lang,
  onRefreshOverview,
}: {
  lang: string | null;
  onRefreshOverview: () => void;
}) {
  const t: Translate = (en, tl) => (lang === "TL" ? tl : en);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof api.history>> | null>(null);
  const [doc, setDoc] = useState<DocumentPayload | null>(null);
  const [docState, setDocState] = useState<"none" | "locked" | "ready">("none");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.history().catch(() => null),
      api
        .document()
        .then((r) => ({ state: "ready" as const, data: r }))
        .catch((e: unknown) => ({
          state: (e instanceof Error && e.message.includes("No final document") ? "none" : "locked") as
            | "none"
            | "locked",
          data: null as DocumentPayload | null,
        })),
    ])
      .then(([h, d]) => {
        if (!h) {
          setError("Failed to load version history. Please try again.");
        } else {
          setHistory(h);
        }
        setDocState(d.state);
        setDoc(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // defer so the effect body itself contains no synchronous setState
    const t = window.setTimeout(load, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  function onDownloadClick() {
    // Browser navigates to the download URL; refresh data shortly after so the
    // download count and (possibly) DOWNLOADED status are reflected.
    window.setTimeout(() => {
      load();
      onRefreshOverview();
    }, 2500);
  }

  const timeline: Array<
    | { kind: "version"; date: string; version: number; note: string | null }
    | {
        kind: "review";
        date: string;
        action: string;
        reviewerName: string;
        overallComment: string | null;
        version: number;
        commentCount: number;
      }
  > = history
    ? [
        ...history.versions.map((v) => ({
          kind: "version" as const,
          date: v.submittedAt,
          version: v.version,
          note: v.note,
        })),
        ...history.reviews.map((r) => ({
          kind: "review" as const,
          date: r.createdAt,
          action: r.action,
          reviewerName: r.reviewerName,
          overallComment: r.overallComment,
          version: r.version,
          commentCount: r.commentCount,
        })),
      ].sort((a, b) => (a.date < b.date ? 1 : -1))
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t("Documents", "Mga Dokumento")}</h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "Version history and your final signed BDRRMP document.",
            "Kasaysayan ng bersyon at ang inyong pinirmahang panghuling BDRRMP."
          )}
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : error ? (
        <LoadError message={error} onRetry={load} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          {/* Version history timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("Version History", "Kasaysayan ng Bersyon")}</CardTitle>
              <CardDescription>
                {t("Submissions and MDRRMO review actions.", "Mga pagsusumite at pagkilos ng MDRRMO.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title={t("No history yet", "Wala pang kasaysayan")}
                  description={t(
                    "Your submission history will appear here.",
                    "Lalabas dito ang kasaysayan ng inyong pagsusumite."
                  )}
                />
              ) : (
                <ol className="relative max-h-96 space-y-4 overflow-y-auto border-l pl-5 pr-1">
                  {timeline.map((item, i) => (
                    <li key={i} className="relative">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute -left-[27px] top-0.5 flex size-4 items-center justify-center rounded-full border-2 border-background",
                          item.kind === "version" ? "bg-primary" : "bg-amber-500"
                        )}
                      />
                      {item.kind === "version" ? (
                        <div>
                          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            <FileText className="size-4 text-primary" aria-hidden="true" />
                            {t("Submitted", "Naisumite")} — v{item.version}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(item.date)}</p>
                          {item.note && <p className="mt-0.5 text-xs italic text-muted-foreground">{item.note}</p>}
                        </div>
                      ) : (
                        <div>
                          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                            <ReviewActionBadge action={item.action} />
                            <span className="text-muted-foreground">v{item.version}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.reviewerName} · {formatDateTime(item.date)}
                            {item.commentCount > 0 &&
                              ` · ${item.commentCount} ${t("comment(s)", "(mga) komento")}`}
                          </p>
                          {item.overallComment && (
                            <p className="mt-1 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
                              “{item.overallComment}”
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {/* Final document */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("Final BDRRMP Document", "Panghuling Dokumento ng BDRRMP")}</CardTitle>
              <CardDescription>
                {t("Signed PDF generated by the MDRRMO.", "Pinirmahang PDF na gawa ng MDRRMO.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {docState !== "ready" || !doc ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
                  <Lock className="size-8 text-muted-foreground/50" aria-hidden="true" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {docState === "none"
                      ? t("Available after MDRRMO approval", "Magiging available pagkatapos ng aprubasyon ng MDRRMO")
                      : t("Download unlocks after MDRRMO approval", "Bubuksan ang download pagkatapos ng aprubasyon")}
                  </p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    {t(
                      "Once your BDRRMP is approved and signed, the final PDF will be downloadable here.",
                      "Kapag aprubado at pirmado na ang inyong BDRRMP, maari na itong i-download dito."
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary p-2">
                        <FileCheck className="size-5 text-primary-foreground" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="break-all font-mono text-sm font-semibold">{doc.document.docId}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t("Version", "Bersyon")} v{doc.document.version} ·{" "}
                          {doc.document.lang === "TL" ? "Tagalog" : "English"}
                        </p>
                        <Separator className="my-2.5" />
                        <dl className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex justify-between gap-3">
                            <dt>{t("Signed by", "Pumirma")}</dt>
                            <dd className="text-right font-medium text-foreground">
                              {doc.document.signedBy ?? "—"}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt>{t("Signed on", "Petsa ng pirma")}</dt>
                            <dd className="text-right font-medium text-foreground">
                              {formatDateTime(doc.document.signedAt)}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt>{t("Generated", "Binuo")}</dt>
                            <dd className="text-right font-medium text-foreground">
                              {formatDate(doc.document.generatedAt)}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt>{t("Downloads", "Mga download")}</dt>
                            <dd className="text-right font-medium text-foreground">
                              {doc.document.downloadCount}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                    <a href="/api/barangay/document?download=1" onClick={onDownloadClick} className="mt-4 block">
                      <Button className="w-full">
                        <Download className="size-4" aria-hidden="true" />
                        {t("Download PDF", "I-download ang PDF")}
                      </Button>
                    </a>
                  </div>

                  {doc.document.downloads.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">{t("Download Log", "Talaan ng Download")}</p>
                      <div className="overflow-hidden rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("Downloaded By", "Nag-download")}</TableHead>
                              <TableHead>{t("Date & Time", "Petsa at Oras")}</TableHead>
                              <TableHead className="hidden sm:table-cell">IP</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {doc.document.downloads.map((d) => (
                              <TableRow key={d.id}>
                                <TableCell className="text-sm">{d.downloadedBy}</TableCell>
                                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                  {formatDateTime(d.createdAt)}
                                </TableCell>
                                <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
                                  {d.ip ?? "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comments tab
// ---------------------------------------------------------------------------

export function CommentsTab({
  sections,
  lang,
}: {
  sections: ClientSection[];
  lang: string | null;
}) {
  const t: Translate = (en, tl) => (lang === "TL" ? tl : en);
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .comments()
      .then((r) => setComments(r.comments))
      .catch((e) => setError(errMsg(e)));
  }, []);

  useEffect(() => {
    const t = window.setTimeout(load, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const sectionTitle = (key: string) =>
    sections.find((s) => s.key === key)?.title ?? key.replace(/_/g, " ");

  // group by section, ordered by most recent comment
  const groups: Array<{ sectionKey: string; items: CommentItem[] }> = [];
  for (const c of comments ?? []) {
    const existing = groups.find((g) => g.sectionKey === c.sectionKey);
    if (existing) existing.items.push(c);
    else groups.push({ sectionKey: c.sectionKey, items: [c] });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t("MDRRMO Comments", "Mga Komento ng MDRRMO")}</h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "Reviewer feedback on your BDRRMP sections.",
            "Mga puna ng tagasuri sa inyong mga seksyon ng BDRRMP."
          )}
        </p>
      </div>

      {comments === null && !error ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-2 p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <LoadError
          title={t("Failed to load comments", "Nabigo ang pag-load ng mga komento")}
          message={error}
          onRetry={load}
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={t("No comments yet.", "Wala pang komento.")}
          description={t(
            "Feedback from the MDRRMO will appear here after review.",
            "Lalabas dito ang puna ng MDRRMO pagkatapos ng pagsusuri."
          )}
        />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <Card key={g.sectionKey}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MessageSquare className="size-4 text-primary" aria-hidden="true" />
                  {sectionTitle(g.sectionKey)}
                  <Badge variant="outline" className="ml-1 font-normal text-muted-foreground">
                    {g.items.length} {t("comment(s)", "(mga) komento")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {g.items.map((c) => (
                  <div key={c.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{c.reviewerName}</p>
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/10" >MDRRMO</Badge>
                        {c.requiresRevision && (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950/60 dark:text-red-300">
                            {t("Needs Revision", "Kailangang Baguhin")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        v{c.version} · {formatDateTime(c.createdAt)}
                      </p>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{c.comment}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications tab
// ---------------------------------------------------------------------------

export function NotificationsTab({
  lang,
  onUnreadChange,
}: {
  lang: string | null;
  onUnreadChange: (unread: number) => void;
}) {
  const t: Translate = (en, tl) => (lang === "TL" ? tl : en);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [unreadSnapshot, setUnreadSnapshot] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .notifications()
      .then((r) => {
        setItems(r.notifications);
        setUnreadSnapshot(new Set(r.notifications.filter((n) => !n.read).map((n) => n.id)));
        onUnreadChange(r.unread);
        if (r.unread > 0) {
          // mark visible ones as read
          api
            .markNotificationsRead(r.notifications.filter((n) => !n.read).map((n) => n.id))
            .then(() => {
              setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev);
              onUnreadChange(0);
            })
            .catch(() => {});
        }
      })
      .catch((e) => setError(errMsg(e)));
  }, [onUnreadChange]);

  useEffect(() => {
    // defer so the effect body itself contains no synchronous setState
    const t = window.setTimeout(load, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  async function markAllRead() {
    try {
      await api.markNotificationsRead();
      setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev);
      onUnreadChange(0);
    } catch (e) {
      setError(errMsg(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t("Notifications", "Mga Abiso")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Updates from the MDRRMO about your BDRRMP.", "Mga update mula sa MDRRMO tungkol sa inyong BDRRMP.")}
          </p>
        </div>
        {items && items.some((n) => !n.read) && (
          <Button variant="outline" size="sm" onClick={() => void markAllRead()}>
            <CheckCheck className="size-4" aria-hidden="true" />
            {t("Mark all as read", "Markahang nabasa na")}
          </Button>
        )}
      </div>

      {items === null && !error ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-3 p-4">
                <Skeleton className="size-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <LoadError
          title={t("Failed to load notifications", "Nabigo ang pag-load ng mga abiso")}
          message={error}
          onRetry={load}
        />
      ) : !items || items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={t("No notifications", "Walang abiso")}
          description={t(
            "You will be notified about submissions, reviews and approvals.",
            "Abisuhan kayo tungkol sa mga pagsusumite, pagsusuri at aprubasyon."
          )}
        />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {items.map((n) => {
              const meta = notifIcon(n.type);
              const Icon = meta.icon;
              const isNew = unreadSnapshot.has(n.id);
              return (
                <div
                  key={n.id}
                  className={cn("flex items-start gap-3 p-4", isNew && "bg-accent/60")}
                >
                  <span className={cn("rounded-lg border p-2", meta.className)}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium leading-snug">{n.title}</p>
                      {isNew && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                    </div>
                    {n.body && <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile tab
// ---------------------------------------------------------------------------

export function ProfileTab({ session, overview }: { session: SessionInfo; overview: BarangayOverview | null }) {
  const { toast } = useToast();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const barangay = overview?.barangay ?? session.barangay;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!currentPin || !newPin || !confirmPin) {
      setFormError("Please fill in all fields.");
      return;
    }
    if (newPin.length < 6) {
      setFormError("New PIN must be at least 6 characters.");
      return;
    }
    if (newPin !== confirmPin) {
      setFormError("New PIN and confirmation do not match.");
      return;
    }
    if (newPin === currentPin) {
      setFormError("New PIN must be different from the current PIN.");
      return;
    }
    setSaving(true);
    try {
      await api.changePin(currentPin, newPin, confirmPin);
      toast({
        title: "PIN updated",
        description: "Use your new Access PIN the next time you log in.",
      });
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err) {
      toast({ variant: "destructive", title: "Could not change PIN", description: errMsg(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Barangay information, security and session details.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {/* Barangay info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="size-4 text-primary" aria-hidden="true" />
              Barangay Information
            </CardTitle>
            <CardDescription>Official records maintained by the MDRRMO.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Barangay</dt>
                <dd className="font-medium">{barangay?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Barangay Code</dt>
                <dd className="font-mono font-medium">{barangay?.code ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Punong Barangay</dt>
                <dd className="text-right font-medium">{barangay?.captain ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Population</dt>
                <dd className="font-medium">
                  {overview?.barangay.population != null
                    ? overview.barangay.population.toLocaleString("en-PH")
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Households</dt>
                <dd className="font-medium">
                  {overview?.barangay.households != null
                    ? overview.barangay.households.toLocaleString("en-PH")
                    : "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Security */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                Change Access PIN
              </CardTitle>
              <CardDescription>
                Keep your PIN secret. If you forget it, the MDRRMO can issue a reset.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-3" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="current-pin">Current PIN</Label>
                  <Input
                    id="current-pin"
                    type="password"
                    autoComplete="current-password"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-pin">New PIN</Label>
                    <Input
                      id="new-pin"
                      type="password"
                      autoComplete="new-password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-pin">Confirm New PIN</Label>
                    <Input
                      id="confirm-pin"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Minimum of 6 characters.</p>
                {formError && (
                  <Alert variant="destructive" className="py-2">
                    <Info />
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" disabled={saving}>
                  {saving ? "Updating…" : "Update PIN"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Session info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Session</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Logged in as</dt>
                  <dd className="text-right font-medium">
                    Barangay {session.barangay?.name ?? ""}
                    {session.barangay && <span className="block font-mono text-xs text-muted-foreground">{session.barangay.code}</span>}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Role</dt>
                  <dd className="font-medium">Barangay (BDRRMP Preparer)</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Session expires</dt>
                  <dd className="text-right font-medium">{formatDateTime(session.expiresAt)}</dd>
                </div>
                {overview && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Plan year</dt>
                    <dd>
                      <StatusBadge status={overview.submission.status} lang={overview.submission.templateLang} />
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
