"use client";

// QAS33 Barangay Portal — My BDRRMP wizard (template select, sections, autosave,
// uploads, pre-submission check, submit flow)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Languages,
  Loader2,
  Lock,
  Paperclip,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { api, formatDate } from "@/lib/qas33/api";
import type { BarangaySubmissionData, ClientSection, CommentItem, SubmissionStatus } from "@/lib/qas33/types";
import { FieldControl, ReadonlyField, fieldHasValue } from "./barangay-fields";
import { PreviewDialog } from "./barangay-preview";
import { PreCheckPanel, SaveIndicator, StatusBanner, type SaveState } from "./barangay-check";
import { UploadArea } from "./barangay-upload";
import { SectionIcon, errMsg, isEditableStatus } from "./barangay-shared";

const CHECK_STEP = "__check__";

export interface WizardProps {
  data: BarangaySubmissionData;
  barangayName: string;
  onReload: () => void | Promise<void>;
  onRefreshOverview: () => void;
  focusSectionKey?: string | null;
  onFocused: () => void;
}

export default function BarangayWizard({
  data,
  barangayName,
  onReload,
  onRefreshOverview,
  focusSectionKey,
  onFocused,
}: WizardProps) {
  const { toast } = useToast();
  const { submission, sections, files, validation } = data;
  const lang = submission.templateLang;
  const editable = isEditableStatus(submission.status);
  const t = useCallback((en: string, tl: string) => (lang === "TL" ? tl : en), [lang]);

  // ---- reviewer comments (for revision callouts) ----
  const [comments, setComments] = useState<CommentItem[]>([]);
  useEffect(() => {
    let alive = true;
    if (submission.status === "NEEDS_REVISION") {
      api
        .comments()
        .then((r) => alive && setComments(r.comments))
        .catch(() => {});
    } else {
      setComments([]);
    }
    return () => {
      alive = false;
    };
  }, [submission.status]);

  const revisionBySection = useMemo(() => {
    const map = new Map<string, CommentItem[]>();
    for (const c of comments) {
      if (!c.requiresRevision) continue;
      const list = map.get(c.sectionKey) ?? [];
      list.push(c);
      map.set(c.sectionKey, list);
    }
    return map;
  }, [comments]);

  // ---- values + debounced autosave ----
  const [values, setValues] = useState<Record<string, unknown>>(submission.values);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!dirtyRef.current) setValues(submission.values);
  }, [submission.values]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    []
  );

  const runSave = useCallback(
    async (vals: Record<string, unknown>) => {
      setSaveState("saving");
      try {
        await api.saveValues(vals);
        dirtyRef.current = false;
        setSaveState("saved");
        void onReload();
      } catch (e) {
        setSaveState("error");
        toast({ variant: "destructive", title: t("Autosave failed", "Nabigo ang awtomatikong pag-save"), description: errMsg(e) });
      }
    },
    [onReload, t, toast]
  );

  const scheduleSave = useCallback(
    (next: Record<string, unknown>) => {
      dirtyRef.current = true;
      setSaveState("pending");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void runSave(next), 1200);
    },
    [runSave]
  );

  function handleChange(key: string, value: unknown) {
    const next = { ...values, [key]: value };
    setValues(next);
    scheduleSave(next);
  }

  // ---- section navigation ----
  const sectionState = useCallback(
    (s: ClientSection): "complete" | "partial" | "empty" => {
      const sFiles = files.filter((f) => f.sectionKey === s.key);
      const formComplete = s.fields.filter((f) => f.required).every((f) => fieldHasValue(f, values[f.key]));
      const needsUpload = s.requiresUpload && s.required;
      const uploadComplete = !needsUpload || sFiles.length > 0;
      if (formComplete && uploadComplete) return "complete";
      const hasAny = s.fields.some((f) => fieldHasValue(f, values[f.key])) || sFiles.length > 0;
      return hasAny ? "partial" : "empty";
    },
    [files, values]
  );

  const [activeKey, setActiveKey] = useState<string>("");
  const activeIndex = sections.findIndex((s) => s.key === activeKey);
  const activeSection = activeIndex >= 0 ? sections[activeIndex] : undefined;

  // focus jump (from dashboard / requirements)
  useEffect(() => {
    if (focusSectionKey) {
      setActiveKey(focusSectionKey);
      onFocused();
    }
  }, [focusSectionKey, onFocused]);

  // initial section: first incomplete, else first (a focus jump takes priority)
  useEffect(() => {
    if (activeKey === "" && sections.length > 0 && !focusSectionKey) {
      const target = sections.find((s) => sectionState(s) !== "complete") ?? sections[0];
      setActiveKey(target.key);
    }
  }, [sections, activeKey, focusSectionKey, sectionState]);

  const goNext = () => {
    if (activeKey === CHECK_STEP) return;
    if (activeIndex < sections.length - 1) setActiveKey(sections[activeIndex + 1].key);
    else setActiveKey(CHECK_STEP);
  };
  const goPrev = () => {
    if (activeKey === CHECK_STEP) {
      setActiveKey(sections[sections.length - 1]?.key ?? "");
      return;
    }
    if (activeIndex > 0) setActiveKey(sections[activeIndex - 1].key);
  };

  // ---- template selection ----
  const [picking, setPicking] = useState<string | null>(null);
  async function pickTemplate(code: "EN" | "TL") {
    setPicking(code);
    try {
      await api.selectTemplate(code);
      toast({
        title: t("Template selected", "Napiling template"),
        description: code === "TL" ? "Aktibo na ang Tagalog template." : "English template activated.",
      });
      await onReload();
      onRefreshOverview();
    } catch (e) {
      toast({ variant: "destructive", title: t("Could not select template", "Hindi mapili ang template"), description: errMsg(e) });
    } finally {
      setPicking(null);
    }
  }

  // ---- preview + submit ----
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [certified, setCertified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ version: number; resubmission: boolean } | null>(null);
  const [checking, setChecking] = useState(false);

  async function doSubmit() {
    setSubmitting(true);
    try {
      // flush any pending autosave before submitting
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (dirtyRef.current) {
        try {
          await api.saveValues(values);
          dirtyRef.current = false;
        } catch {
          /* server will still validate on submit */
        }
      }
      const res = await api.submit(true);
      setSubmitOpen(false);
      setCertified(false);
      setSuccess({ version: res.version, resubmission: submission.version > 0 });
      await onReload();
      onRefreshOverview();
    } catch (e) {
      toast({ variant: "destructive", title: t("Cannot submit yet", "Hindi pa maaaring isumite"), description: errMsg(e) });
      setSubmitOpen(false);
      setActiveKey(CHECK_STEP);
      await onReload();
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------

  // Step 0 — template not yet selected
  if (!lang) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="p-6 sm:p-8">
          <div className="text-center">
            <div className="mx-auto w-fit rounded-xl bg-primary/10 p-3">
              <FileText className="size-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="mt-3 text-xl font-semibold">
              {t("Choose your BDRRMP template", "Piliin ang inyong template ng BDRRMP")}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              {t(
                "The template determines the labels, instructions and the language of the generated document. The underlying data remains the same.",
                "Ang template ang magtatakda ng mga label, instruksyon at wika ng nabubuong dokumento. Pareho pa rin ang datos na ilalagay."
              )}
            </p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(["EN", "TL"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => void pickTemplate(code)}
                disabled={picking !== null}
                className={cn(
                  "group rounded-xl border-2 border-border p-5 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-white">
                    {code}
                  </span>
                  <div>
                    <p className="font-semibold">{code === "EN" ? "English BDRRMP" : "Tagalog BDRRMP"}</p>
                    <p className="text-xs text-muted-foreground">
                      {code === "EN"
                        ? "Forms, instructions and document in English"
                        : "Pormularyo, instruksyon at dokumento sa Tagalog"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground group-hover:text-primary">
                    {picking === code ? t("Selecting…", "Pinipili…") : t("Select template", "Piliin ang template")}
                  </span>
                  {picking === code ? (
                    <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
                  )}
                </div>
              </button>
            ))}
          </div>
          {submission.version > 0 && (
            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Lock className="size-3 shrink-0" aria-hidden="true" />
              {t(
                "Template language can no longer be changed after the first submission. Contact the MDRRMO for assistance.",
                "Hindi na mababago ang wika ng template pagkatapos ng unang pagsusumite. Makipag-ugnayan sa MDRRMO."
              )}
            </p>
          )}
        </Card>
      </div>
    );
  }

  const revComments = activeSection ? revisionBySection.get(activeSection.key) ?? [] : [];

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* Sidebar */}
      <aside className="w-full shrink-0 space-y-3 lg:w-72">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t("Overall Progress", "Kabuuang Progreso")}</span>
            <span className="text-lg font-bold tabular-nums text-primary">{submission.progress}%</span>
          </div>
          <Progress value={submission.progress} className="mt-2" aria-label="BDRRMP progress" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {validation.completedSections}/{validation.totalSections}{" "}
              {t("sections done", "seksyon na tapos")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Languages className="size-3.5" aria-hidden="true" />
              {lang === "TL" ? "Tagalog" : "English"}
              {submission.version > 0 && <Lock className="size-3" aria-hidden="true" />}
            </span>
          </div>
          {submission.version > 0 && (
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              {t(
                "Template language is locked after the first submission.",
                "Naka-lock na ang wika ng template pagkatapos ng unang pagsusumite."
              )}
            </p>
          )}
        </Card>

        {/* Desktop section list */}
        <Card className="hidden p-2 lg:block">
          <nav aria-label="BDRRMP sections" className="max-h-[62vh] space-y-0.5 overflow-y-auto pr-1">
            {sections.map((s) => {
              const state = sectionState(s);
              const flagged = submission.status === "NEEDS_REVISION" && revisionBySection.has(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  title={s.title}
                  onClick={() => setActiveKey(s.key)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent",
                    activeKey === s.key && "bg-primary/10 font-medium text-primary"
                  )}
                >
                  <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {s.order}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      state === "complete" && "bg-primary",
                      state === "partial" && "bg-amber-500",
                      state === "empty" && "bg-muted-foreground/30",
                      flagged && "ring-2 ring-destructive ring-offset-2 ring-offset-card"
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  {s.requiresUpload && <Paperclip className="size-3 shrink-0 text-muted-foreground/60" aria-hidden="true" />}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setActiveKey(CHECK_STEP)}
              className={cn(
                "mt-1 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent",
                activeKey === CHECK_STEP && "bg-primary/10 font-medium text-primary"
              )}
            >
              <ClipboardCheck className="ml-1 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">{t("Pre-Submission Check", "Pagsusuri Bago Isumite")}</span>
              {validation.ready && <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />}
            </button>
          </nav>
        </Card>

        {/* Mobile section picker (mounted once a section is active) */}
        {activeKey !== "" && activeKey !== CHECK_STEP && (
          <div className="lg:hidden">
            <Select value={activeKey} onValueChange={setActiveKey}>
              <SelectTrigger className="w-full" aria-label="Go to section">
                <SelectValue placeholder={t("Go to section…", "Pumunta sa seksyon…")} />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-2 rounded-full",
                          sectionState(s) === "complete" && "bg-primary",
                          sectionState(s) === "partial" && "bg-amber-500",
                          sectionState(s) === "empty" && "bg-muted-foreground/30"
                        )}
                      />
                      {s.order}. {s.title}
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value={CHECK_STEP}>
                  <span className="flex items-center gap-2">
                    <ClipboardCheck className="size-3.5" aria-hidden="true" />
                    {t("Pre-Submission Check", "Pagsusuri Bago Isumite")}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </aside>

      {/* Main panel */}
      <div className="min-w-0 flex-1">
        <StatusBanner status={submission.status} t={t} />

        {activeKey === CHECK_STEP ? (
          <PreCheckPanel
            validation={validation}
            progress={submission.progress}
            editable={editable}
            checking={checking}
            t={t}
            onRecheck={async () => {
              setChecking(true);
              await onReload();
              setChecking(false);
            }}
            onGoSection={setActiveKey}
            onBack={() => setActiveKey(sections[sections.length - 1]?.key ?? "")}
            onPreview={() => setPreviewOpen(true)}
            onSubmit={() => setSubmitOpen(true)}
          />
        ) : activeSection ? (
          <Card className="p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <SectionIcon icon={activeSection.icon} className="size-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("Section", "Seksyon")} {activeSection.order} / {sections.length}
                    {!activeSection.required && ` · ${t("Optional", "Opsyonal")}`}
                  </p>
                  <h2 className="text-lg font-semibold leading-snug">{activeSection.title}</h2>
                  {activeSection.desc && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{activeSection.desc}</p>
                  )}
                </div>
              </div>
              {editable && (
                <SaveIndicator
                  state={saveState}
                  onRetry={() => void runSave(values)}
                  savingLabel={t("Saving…", "Nagse-save…")}
                  savedLabel={t("All changes saved", "Naka-save ang lahat ng pagbabago")}
                  pendingLabel={t("Unsaved changes…", "May hindi pa naka-save…")}
                />
              )}
            </div>

            {editable && revComments.length > 0 && (
              <div className="mt-4 space-y-2">
                {revComments.map((c) => (
                  <Alert key={c.id} variant="destructive">
                    <AlertTriangle />
                    <AlertTitle>
                      {t("MDRRMO revision comment", "Komento ng MDRRMO")} · {formatDate(c.createdAt)}
                    </AlertTitle>
                    <AlertDescription>{c.comment}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            <Separator className="my-5" />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {activeSection.fields.map((f) =>
                editable ? (
                  <FieldControl
                    key={f.key}
                    field={f}
                    value={values[f.key]}
                    onChange={(v) => handleChange(f.key, v)}
                    lang={lang}
                  />
                ) : (
                  <ReadonlyField key={f.key} field={f} value={values[f.key]} lang={lang} />
                )
              )}
            </div>

            {activeSection.requiresUpload && (
              <UploadArea
                section={activeSection}
                files={files.filter((f) => f.sectionKey === activeSection.key)}
                editable={editable}
                t={t}
                onDone={() => {
                  void onReload();
                  onRefreshOverview();
                }}
              />
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              <Button variant="outline" onClick={goPrev} disabled={activeIndex <= 0}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                {t("Previous", "Nakaraan")}
              </Button>
              <Button onClick={goNext}>
                {activeIndex === sections.length - 1
                  ? t("Pre-Submission Check", "Pagsusuri Bago Isumite")
                  : t("Next Section", "Susunod na Seksyon")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </Card>
        ) : null}
      </div>

      <PreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        data={{ ...data, submission: { ...submission, values } }}
        values={values}
        barangayName={barangayName}
      />

      {/* Submit certification dialog */}
      <Dialog open={submitOpen} onOpenChange={(o) => !submitting && setSubmitOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {submission.version > 0
                ? t("Resubmit BDRRMP for Review", "Muling Isumite ang BDRRMP")
                : t("Submit BDRRMP for Review", "Isumite ang BDRRMP sa Pagsusuri")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Review your answers in the preview before submitting.",
                "Suriin ang inyong mga sagot sa preview bago magsumite."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/60 p-3 text-sm">
              <p className="font-medium">
                {t("Version", "Bersyon")}: v{submission.version + 1}
                {submission.version > 0 && ` (${t("resubmission", "muling pagsusumite")})`}
              </p>
              <p className="mt-1 text-muted-foreground">
                {t(
                  "The MDRRMO will be notified and your BDRRMP will be locked for editing while under review.",
                  "Abisuhan ang MDRRMO at maa-lock ang inyong BDRRMP habang sinusuri."
                )}
              </p>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-accent/50">
              <Checkbox
                checked={certified}
                onCheckedChange={(c) => setCertified(c === true)}
                className="mt-0.5"
                aria-label="Certification"
              />
              <span className="text-sm leading-snug">
                {t(
                  "I certify that the information submitted is complete and accurate to the best of my knowledge.",
                  "Ako'y nagpapatunay na ang impormasyon na isinumite ay kumpleto at tama ayon sa aking kaalaman."
                )}
                <span className="ml-0.5 text-destructive">*</span>
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)} disabled={submitting}>
              {t("Cancel", "Kanselahin")}
            </Button>
            <Button onClick={() => void doSubmit()} disabled={!certified || submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {submission.version > 0
                ? t("Resubmit for Review", "Muling Isumite")
                : t("Submit for Review", "Isumite sa Pagsusuri")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success dialog */}
      <Dialog open={success !== null} onOpenChange={(o) => !o && setSuccess(null)}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="rounded-full bg-primary/10 p-3">
              <CheckCircle2 className="size-8 text-primary" aria-hidden="true" />
            </div>
            <DialogTitle>{t("Submitted!", "Naisumite na!")}</DialogTitle>
            <DialogDescription>
              {success &&
                t(
                  `The MDRRMO has been notified (version v${success.version}). You will receive a notification once the review is complete.`,
                  `Naabisuhan na ang MDRRMO (bersyon v${success.version}). Makakatanggap kayo ng abiso kapag tapos na ang pagsusuri.`
                )}
            </DialogDescription>
            <Button onClick={() => setSuccess(null)}>{t("Done", "Tapos")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
