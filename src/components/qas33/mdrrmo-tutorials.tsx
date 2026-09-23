"use client";

// MDRRMO Console — Tutorials management (bilingual help articles)
import { useState } from "react";
import { BookOpen, Lock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/qas33/api";
import { isSystemAdmin, type SessionInfo } from "@/lib/qas33/types";
import { ErrorAlert, useLoad } from "./mdrrmo-shared";

type TutorialsData = Awaited<ReturnType<typeof api.adminTutorials>>;
type TutorialRow = TutorialsData["tutorials"][number];

export default function MdrrmoTutorials({ session }: { session: SessionInfo }) {
  // Tutorial management (listing + editing) is reserved for the System Administrator;
  // other console roles get an explanatory read-only view (the admin API is role-gated).
  if (!isSystemAdmin(session.admin?.role)) return <TutorialsReadonly />;
  return <TutorialsManager />;
}

function TutorialsReadonly() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Tutorials</h1>
        <p className="text-sm text-muted-foreground">
          Help articles shown to barangays in the portal — bilingual (English / Tagalog)
        </p>
      </header>
      <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
        <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
        Tutorial content is managed by the System Administrator.
      </p>
      <Card>
        <CardContent className="flex items-start gap-3 p-6 text-sm text-muted-foreground">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Help articles are written and maintained by the System Administrator. Barangays can read them anytime from the Tutorials tab of
            their portal.
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

function TutorialsManager() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useLoad<TutorialsData>(() => api.adminTutorials());
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<TutorialRow | null>(null);

  const save = async (payload: Record<string, unknown>, successTitle: string) => {
    setBusy(true);
    try {
      await api.adminUpdateTutorial(payload);
      toast({ title: successTitle });
      reload();
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const tutorials = data?.tutorials ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Tutorials</h1>
        <p className="text-sm text-muted-foreground">
          Help articles shown to barangays in the portal — bilingual (English / Tagalog)
        </p>
      </header>

      {error ? (
        <ErrorAlert message={error} onRetry={reload} />
      ) : loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tutorials.map((t) => (
            <Card key={t.key} className="gap-3">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BookOpen className="h-4 w-4 shrink-0 text-primary" /> {t.titleEn}
                    </CardTitle>
                    <CardDescription>{t.titleTl}</CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Switch
                      checked={t.active}
                      disabled={busy}
                      aria-label={`Toggle visibility of ${t.titleEn}`}
                      onCheckedChange={(v) => void save({ key: t.key, active: v }, v ? "Tutorial shown to barangays" : "Tutorial hidden")}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">{t.bodyEn}</p>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <EditTutorialDialog
          key={editing.key}
          tutorial={editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            await save(payload, "Tutorial updated");
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditTutorialDialog({
  tutorial,
  busy,
  onClose,
  onSave,
}: {
  tutorial: TutorialRow;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [titleEn, setTitleEn] = useState(tutorial.titleEn);
  const [titleTl, setTitleTl] = useState(tutorial.titleTl);
  const [bodyEn, setBodyEn] = useState(tutorial.bodyEn);
  const [bodyTl, setBodyTl] = useState(tutorial.bodyTl);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Edit Tutorial
          </DialogTitle>
          <DialogDescription>{tutorial.key.replace(/_/g, " ")} — shown in the barangay portal help pages.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tut-title-en">Title (English)</Label>
              <Input id="tut-title-en" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tut-title-tl">Title (Tagalog)</Label>
              <Input id="tut-title-tl" value={titleTl} onChange={(e) => setTitleTl(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tut-body-en">Body (English)</Label>
            <Textarea id="tut-body-en" rows={8} value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} className="font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tut-body-tl">Body (Tagalog)</Label>
            <Textarea id="tut-body-tl" rows={8} value={bodyTl} onChange={(e) => setBodyTl(e.target.value)} className="font-mono text-xs" />
          </div>
          <p className="rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
            Formatting: <span className="font-mono">**bold**</span> for bold text, and lines starting with <span className="font-mono">1.</span>{" "}
            or <span className="font-mono">-</span> render as lists.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || !titleEn.trim() || !bodyEn.trim()}
            onClick={() =>
              void onSave({
                key: tutorial.key,
                titleEn: titleEn.trim(),
                titleTl: titleTl.trim(),
                bodyEn,
                bodyTl,
              })
            }
          >
            Save Tutorial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
