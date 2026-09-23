"use client";

// QAS33 Barangay Portal — Dashboard, Requirements, Tutorials tabs

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Download,
  FileText,
  FileCheck,
  Info,
  ListChecks,
  MessageSquare,
  RefreshCw,
  X,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api, formatDate, formatDateTime } from "@/lib/qas33/api";
import type { BarangayOverview, NotificationItem, SubmissionStatus } from "@/lib/qas33/types";
import {
  EmptyState,
  FileStatusBadge,
  LoadError,
  ReqIcon,
  StatusBadge,
  StatusHint,
  notifIcon,
  requirementState,
} from "./barangay-shared";

type Translate = (en: string, tl: string) => string;

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function DashboardTab({
  overview,
  notifications,
  lang,
  onGoWizard,
  onOpenTab,
  onRefresh,
}: {
  overview: BarangayOverview;
  notifications: NotificationItem[];
  lang: string | null;
  onGoWizard: (sectionKey?: string) => void;
  onOpenTab: (tab: string) => void;
  onRefresh: () => void;
}) {
  const { barangay, submission, counts, requirements, latestComments, document } = overview;
  const t: Translate = (en, tl) => (lang === "TL" ? tl : en);
  const finalReady = submission.status === "READY_FOR_DOWNLOAD" || submission.status === "DOWNLOADED";
  const requiredUploads = requirements.filter((r) => r.required && r.requiresUpload).length;
  const unread = notifications.filter((n) => !n.read).slice(0, 5);
  const sectionTitle = (key: string) => requirements.find((r) => r.sectionKey === key)?.title ?? key;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <Card className="overflow-hidden border-primary/20 bg-primary/5">
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {t("BDRRMP", "BDRRMP")} {submission.year} · QAS33
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              {t("Welcome, Barangay", "Maligayang pagdating, Barangay")} {barangay.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={submission.status} lang={lang} />
              <span className="text-xs text-muted-foreground">
                {t("Version", "Bersyon")} v{submission.version} ·{" "}
                {t("updated", "huling update")} {formatDate(submission.updatedAt)}
              </span>
            </div>
            <div className="mt-1.5 max-w-xl">
              <StatusHint status={submission.status} lang={lang} />
            </div>
          </div>

          {finalReady ? (
            <div className="w-full rounded-xl border border-primary/40 bg-primary p-4 text-primary-foreground sm:w-auto">
              <div className="flex items-center gap-2">
                <FileCheck className="size-5" aria-hidden="true" />
                <p className="text-sm font-semibold">
                  {t("Final BDRRMP is ready", "Handa na ang panghuling BDRRMP")}
                </p>
              </div>
              {document && <p className="mt-1 font-mono text-xs opacity-80">{document.docId}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <a href="/api/barangay/document?download=1" onClick={onRefresh}>
                  <Button variant="secondary" size="sm">
                    <Download className="size-4" aria-hidden="true" />
                    {t("Download Final BDRRMP", "I-download ang Panghuling BDRRMP")}
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  onClick={() => onGoWizard()}
                >
                  {t("View BDRRMP", "Tingnan ang BDRRMP")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:items-end">
              <Button onClick={() => onGoWizard()}>
                <FileText className="size-4" aria-hidden="true" />
                {t("Continue BDRRMP", "Ipagpatuloy ang BDRRMP")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onOpenTab("requirements")}>
                <ListChecks className="size-4" aria-hidden="true" />
                {t("View Requirements", "Tingnan ang mga Kailangan")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">{t("Progress", "Progreso")}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-primary">{submission.progress}%</p>
            <Progress value={submission.progress} className="mt-3" aria-label="Progress" />
            <p className="mt-2 text-xs text-muted-foreground">
              {counts.completedSections} / {counts.totalSections} {t("sections complete", "seksyon kumpleto")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">{t("Requirements", "Mga Kailangan")}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {counts.completedSections}
              <span className="text-lg font-normal text-muted-foreground"> / {counts.totalSections}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("sections completed", "seksyon na natapos")}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("Required files uploaded", "Nai-upload na kailangang file")}:{" "}
              <span className="font-medium text-foreground">
                {counts.requiredFilesUploaded} / {requiredUploads}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">{t("Status", "Kalagayan")}</p>
            <div className="mt-2">
              <StatusBadge status={submission.status} lang={lang} className="text-sm" />
            </div>
            <div className="mt-2">
              <StatusHint status={submission.status} lang={lang} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Requirements checklist */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="size-4 text-primary" aria-hidden="true" />
                {t("Requirements Checklist", "Talaan ng mga Kailangan")}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onOpenTab("requirements")}>
                {t("View all", "Tingnan lahat")}
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <CardDescription>
              {t("Tap an item to jump to that section.", "Pindutin ang aytem para pumunta sa seksyon.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
              {requirements.map((r) => {
                const state = requirementState(r);
                return (
                  <li key={r.sectionKey}>
                    <button
                      type="button"
                      onClick={() => onGoWizard(r.sectionKey)}
                      className="group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/60"
                    >
                      <ReqIcon state={state} className="mt-0.5" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                          {r.title}
                          {!r.required && (
                            <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-muted-foreground">
                              {t("Optional", "Opsyonal")}
                            </Badge>
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {r.requiresUpload
                            ? `${r.fileCount} ${t("file(s)", "(mga) file")} · `
                            : ""}
                          {r.formComplete
                            ? t("form complete", "kumpleto ang form")
                            : t("form incomplete", "hindi kumpleto ang form")}
                        </span>
                      </span>
                      <ChevronRight
                        className="mt-1 size-4 shrink-0 text-muted-foreground/50 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* MDRRMO comments */}
          {latestComments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="size-4 text-primary" aria-hidden="true" />
                    {t("MDRRMO Comments", "Mga Komento ng MDRRMO")}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => onOpenTab("comments")}>
                    {t("View all", "Tingnan lahat")}
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
                <CardDescription>
                  {t("Latest feedback from the review team.", "Pinakabagong puna ng tagasuri.")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {latestComments.slice(0, 5).map((c) => (
                    <li key={c.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-medium text-foreground">{sectionTitle(c.sectionKey)}</p>
                        {c.requiresRevision && (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950/60 dark:text-red-300">
                            {t("Needs Revision", "Kailangang Baguhin")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.comment}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {c.reviewerName} · {formatDate(c.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Notifications preview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{t("Notifications", "Mga Abiso")}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onOpenTab("notifications")}>
                  {t("View all", "Tingnan lahat")}
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {unread.length === 0 ? (
                <EmptyState
                  icon={Info}
                  title={t("No unread notifications", "Walang babasahing abiso")}
                  description={t(
                    "Updates from the MDRRMO will appear here.",
                    "Lalabas dito ang mga update mula sa MDRRMO."
                  )}
                />
              ) : (
                <ul className="space-y-2">
                  {unread.map((n) => {
                    const meta = notifIcon(n.type);
                    const Icon = meta.icon;
                    return (
                      <li key={n.id} className="flex items-start gap-3 rounded-lg border p-3">
                        <span className={cn("rounded-md border p-1.5", meta.className)}>
                          <Icon className="size-3.5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-snug">{n.title}</p>
                          {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                          <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Requirements tab
// ---------------------------------------------------------------------------

export function RequirementsTab({
  overview,
  lang,
  onGoWizard,
}: {
  overview: BarangayOverview;
  lang: string | null;
  onGoWizard: (sectionKey: string) => void;
}) {
  const t: Translate = (en, tl) => (lang === "TL" ? tl : en);
  const { requirements, counts } = overview;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{t("Requirements", "Mga Kailangan")}</h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "Complete every required section and upload before submitting your BDRRMP.",
            "Buuin ang bawat kailangang seksyon at upload bago isumite ang inyong BDRRMP."
          )}
        </p>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {requirements.map((r, idx) => {
            const state = requirementState(r);
            return (
              <div
                key={r.sectionKey}
                className={cn("flex flex-wrap items-center gap-3 p-4", idx === 0 && "rounded-t-lg")}
              >
                <ReqIcon state={state} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{r.title}</p>
                    {!r.required && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {t("Optional", "Opsyonal")}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {r.formComplete ? (
                        <>
                          <Check className="size-3.5 text-primary" aria-hidden="true" />
                          {t("Form complete", "Kumpleto ang form")}
                        </>
                      ) : (
                        <>
                          <X className="size-3.5 text-muted-foreground" aria-hidden="true" />
                          {t("Form incomplete", "Hindi kumpleto ang form")}
                        </>
                      )}
                    </span>
                    {r.requiresUpload && (
                      <span className="inline-flex items-center gap-1.5">
                        <FileStatusBadge status={r.uploadStatus} />
                        <span>
                          {r.fileCount} {t("file(s)", "(mga) file")}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => onGoWizard(r.sectionKey)}>
                  {t("Open Section", "Buksan ang Seksyon")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {counts.completedSections} / {counts.totalSections}{" "}
        {t("required sections completed.", "kinakailangang seksyon ang natapos.")}{" "}
        {counts.requiredFilesUploaded}{" "}
        {t("required attachment sections have files.", "seksyon ng kalakip ang may file na.")}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tutorials tab
// ---------------------------------------------------------------------------

function renderBold(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    )
  );
}

function TutorialBody({ body }: { body: string }) {
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
      {body.split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />;
        const numbered = line.match(/^\s*(\d+)\.\s+(.*)$/);
        const bulleted = line.match(/^\s*[-•]\s+(.*)$/);
        if (numbered) {
          return (
            <p key={i} className="flex gap-2.5 pl-1">
              <span className="font-semibold text-primary">{numbered[1]}.</span>
              <span>{renderBold(numbered[2], `n${i}`)}</span>
            </p>
          );
        }
        if (bulleted) {
          return (
            <p key={i} className="flex gap-2.5 pl-1">
              <span className="text-primary">•</span>
              <span>{renderBold(bulleted[1], `b${i}`)}</span>
            </p>
          );
        }
        return <p key={i}>{renderBold(line, `p${i}`)}</p>;
      })}
    </div>
  );
}

export function TutorialsTab() {
  const [data, setData] = useState<{ lang: string; tutorials: Array<{ key: string; title: string; body: string }> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .tutorials()
      .then((r) => setData(r))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load tutorials."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // defer so the effect body itself contains no synchronous setState
    const t = window.setTimeout(load, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const t: Translate = (en, tl) => (data?.lang === "TL" ? tl : en);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t("Tutorials & Guides", "Gabay at Tutorial")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Step-by-step help for using the QAS33 barangay portal.",
              "Hakbang-hakbang na tulong sa paggamit ng QAS33 barangay portal."
            )}
          </p>
        </div>
        {data && (
          <Badge variant="outline" className="gap-1.5">
            <BookOpen className="size-3.5" aria-hidden="true" />
            {data.lang === "TL" ? "Tagalog" : "English"}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-1.5 h-4 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <LoadError
          title={t("Failed to load tutorials", "Nabigo ang pag-load ng mga gabay")}
          message={error}
          onRetry={load}
        />
      ) : !data || data.tutorials.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t("No tutorials available", "Walang gabay")}
          description={t("Guides will be published by the MDRRMO.", "Ilalathala ng MDRRMO ang mga gabay.")}
        />
      ) : (
        <Accordion type="single" collapsible className="gap-3">
          {data.tutorials.map((tutorial, i) => (
            <AccordionItem key={tutorial.key} value={tutorial.key} className="rounded-lg border px-4">
              <AccordionTrigger className="py-4 text-left hover:no-underline">
                <span className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium">{tutorial.title}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4 pt-1">
                <TutorialBody body={tutorial.body} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {data && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RefreshCw className="size-3" aria-hidden="true" />
          {t(
            "Tutorials follow your selected template language.",
            "Sumusunod ang mga gabay sa napiling wika ng template."
          )}
        </p>
      )}
    </div>
  );
}
