"use client";

// QAS33 Barangay Portal — wizard status banner, autosave indicator,
// and the pre-submission check panel

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Loader2,
  Lock,
  PencilLine,
  RefreshCw,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BarangaySubmissionData, SubmissionStatus } from "@/lib/qas33/types";
import { isFinalized, isLockedForReview } from "./barangay-shared";

export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

export function StatusBanner({
  status,
  t,
}: {
  status: SubmissionStatus;
  t: (en: string, tl: string) => string;
}) {
  if (isLockedForReview(status)) {
    return (
      <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-200">
        <Lock />
        <AlertTitle>
          {t("Locked — your BDRRMP is with the MDRRMO", "Naka-lock — nasa MDRRMO ang inyong BDRRMP")}
        </AlertTitle>
        <AlertDescription className="text-amber-800 dark:text-amber-300/90">
          {t(
            "Your answers are read-only while under review. You will be notified once the MDRRMO completes its evaluation.",
            "Basahin lamang ang inyong mga sagot habang sinusuri. Abisuhan kayo kapag natapos ang pagsusuri ng MDRRMO."
          )}
        </AlertDescription>
      </Alert>
    );
  }
  if (isFinalized(status)) {
    return (
      <Alert className="mb-4 border-primary/40 bg-primary/5 text-primary dark:bg-primary/10">
        <CheckCircle2 />
        <AlertTitle>{t("Approved — BDRRMP finalized", "Aprubado — natapos na ang BDRRMP")}</AlertTitle>
        <AlertDescription>
          {t(
            "This plan is read-only. Download your signed final document from the Documents tab.",
            "Basahin lamang ang planong ito. I-download ang pinirmahang dokumento sa Documents tab."
          )}
        </AlertDescription>
      </Alert>
    );
  }
  if (status === "NEEDS_REVISION") {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle />
        <AlertTitle>
          {t(
            "MDRRMO requested revisions — please correct the flagged sections and resubmit",
            "Humingi ng pagbabago ang MDRRMO — ayusin ang mga na-flag na seksyon at isumite muli"
          )}
        </AlertTitle>
        <AlertDescription>
          {t(
            "Sections with reviewer comments are marked with a red outline in the section list.",
            "Ang mga seksyong may komento ng tagasuri ay may pulang bilog sa listahan."
          )}
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}

export function SaveIndicator({
  state,
  onRetry,
  savingLabel,
  savedLabel,
  pendingLabel,
}: {
  state: SaveState;
  onRetry: () => void;
  savingLabel: string;
  savedLabel: string;
  pendingLabel: string;
}) {
  if (state === "idle") return null;
  if (state === "saving")
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        {savingLabel}
      </span>
    );
  if (state === "pending")
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <PencilLine className="size-3.5" aria-hidden="true" />
        {pendingLabel}
      </span>
    );
  if (state === "saved")
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary">
        <Check className="size-3.5" aria-hidden="true" />
        {savedLabel}
      </span>
    );
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs text-destructive">
      <AlertTriangle className="size-3.5" aria-hidden="true" />
      Save failed
      <button type="button" onClick={onRetry} className="font-medium underline underline-offset-2">
        Retry
      </button>
    </span>
  );
}

export function PreCheckPanel({
  validation,
  progress,
  editable,
  checking,
  t,
  onRecheck,
  onGoSection,
  onBack,
  onPreview,
  onSubmit,
}: {
  validation: BarangaySubmissionData["validation"];
  progress: number;
  editable: boolean;
  checking: boolean;
  t: (en: string, tl: string) => string;
  onRecheck: () => void;
  onGoSection: (key: string) => void;
  onBack: () => void;
  onPreview: () => void;
  onSubmit: () => void;
}) {
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <ClipboardCheck className="size-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t("Pre-Submission Check", "Pagsusuri Bago Isumite")}</h2>
            <p className="text-sm text-muted-foreground">
              {t(
                "Make sure every reference item is complete before submitting to the MDRRMO.",
                "Siguraduhing kumpleto ang bawat kailangan bago isumite sa MDRRMO."
              )}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onRecheck} disabled={checking}>
          <RefreshCw className={cn("size-4", checking && "animate-spin")} aria-hidden="true" />
          {t("Recheck", "Suriin Muli")}
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{t("Sections completed", "Natapos na seksyon")}</p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            {validation.completedSections}
            <span className="text-sm font-normal text-muted-foreground"> / {validation.totalSections}</span>
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{t("Outstanding issues", "Mga suliranin")}</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{validation.issues.length}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{t("Progress", "Progreso")}</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{progress}%</p>
        </div>
      </div>

      {validation.ready ? (
        <Alert className="mt-5 border-primary/40 bg-primary/5 text-primary dark:bg-primary/10">
          <CheckCircle2 />
          <AlertTitle>
            {t("All references complete — READY FOR SUBMISSION", "Kumpleto ang lahat — HANDA NANG ISUMITE")}
          </AlertTitle>
          <AlertDescription>
            {t(
              "Preview your document, then submit it for MDRRMO review.",
              "I-preview ang dokumento, pagkatapos ay isumite sa pagsusuri ng MDRRMO."
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="mt-5 space-y-2">
          <p className="text-sm font-medium">
            {t("Issues that need your attention", "Mga suliranin na kailangang ayusin")}:
          </p>
          <ul className="space-y-2">
            {validation.issues.map((issue) => (
              <li key={issue.sectionKey}>
                <button
                  type="button"
                  onClick={() => onGoSection(issue.sectionKey)}
                  className="flex w-full items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-left transition-colors hover:bg-amber-100/70 dark:border-amber-500/40 dark:bg-amber-950/30"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{issue.sectionTitle}</span>
                    <span className="block text-xs text-muted-foreground">{issue.reason}</span>
                  </span>
                  <ChevronRight className="ml-auto mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("Back to Sections", "Bumalik sa mga Seksyon")}
        </Button>
        <Button variant="outline" onClick={onPreview}>
          <FileText className="size-4" aria-hidden="true" />
          {t("Preview BDRRMP", "I-preview ang BDRRMP")}
        </Button>
        {editable && (
          <Button onClick={onSubmit} disabled={!validation.ready}>
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {t("Submit for Review", "Isumite sa Pagsusuri")}
          </Button>
        )}
        {!validation.ready && (
          <p className="text-xs text-muted-foreground">
            {t(
              "The submit button unlocks once all references are complete.",
              "Bubuksan ang pindutan ng pagsusumite kapag kumpleto na ang lahat."
            )}
          </p>
        )}
      </div>
    </Card>
  );
}
