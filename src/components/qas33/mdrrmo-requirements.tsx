"use client";

// MDRRMO Console — Requirements configuration + Template preview
import { useState } from "react";
import { FileText, ListChecks, Pencil, Paperclip } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/qas33/api";
import { ErrorAlert, TableSkeleton, useLoad } from "./mdrrmo-shared";

type RequirementsData = Awaited<ReturnType<typeof api.adminRequirements>>;
type SectionRow = RequirementsData["sections"][number];

export default function MdrrmoRequirements() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useLoad<RequirementsData>(() => api.adminRequirements());
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<SectionRow | null>(null);

  const update = async (payload: Record<string, unknown>, successTitle: string) => {
    setBusy(true);
    try {
      await api.adminUpdateRequirement(payload);
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

  const sections = data?.sections ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Requirements &amp; Template</h1>
        <p className="text-sm text-muted-foreground">
          Configure the BDRRMP template sections barangays must fill in — titles, required fields and upload rules
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template Sections &amp; Requirements</CardTitle>
          <CardDescription>Changes apply immediately to all barangay forms for the current cycle.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 pb-3">
          {error ? (
            <div className="p-4">
              <ErrorAlert message={error} onRetry={reload} />
            </div>
          ) : loading ? (
            <div className="p-4">
              <TableSkeleton rows={11} cols={6} />
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="w-12 pl-4">#</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead className="text-center">Fields</TableHead>
                    <TableHead className="text-center">Required</TableHead>
                    <TableHead className="text-center">Upload Required</TableHead>
                    <TableHead>Formats</TableHead>
                    <TableHead className="text-center">Max MB</TableHead>
                    <TableHead className="pr-4 text-right">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.map((s) => (
                    <TableRow key={s.key}>
                      <TableCell className="pl-4 text-xs tabular-nums text-muted-foreground">{s.order}</TableCell>
                      <TableCell>
                        <div className="font-medium">{s.titleEn}</div>
                        <div className="text-xs text-muted-foreground">{s.titleTl}</div>
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">{s.fieldCount}</TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={s.required}
                          disabled={busy}
                          aria-label={`Toggle required for ${s.titleEn}`}
                          onCheckedChange={(v) => void update({ key: s.key, required: v }, v ? "Section marked required" : "Section set optional")}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={s.requiresUpload}
                          disabled={busy}
                          aria-label={`Toggle upload requirement for ${s.titleEn}`}
                          onCheckedChange={(v) => void update({ key: s.key, requiresUpload: v }, v ? "File upload required" : "File upload optional")}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.uploadFormats.join(", ")}</TableCell>
                      <TableCell className="text-center text-sm tabular-nums">{s.uploadMaxMB}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template preview — read-only summary of the same configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" /> Template Preview
          </CardTitle>
          <CardDescription>
            How the BDRRMP template is presented to barangays — bilingual section titles with their field and upload requirements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {sections.map((s) => (
              <div key={s.key} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      <span className="mr-1.5 text-muted-foreground">{s.order}.</span>
                      {s.titleEn}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.titleTl}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {s.required && (
                      <span className="rounded-full border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                        required
                      </span>
                    )}
                    {s.requiresUpload && (
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        <Paperclip className="h-2.5 w-2.5" /> upload
                      </span>
                    )}
                  </div>
                </div>
                {(s.descEn || s.descTl) && (
                  <p className="mt-2 text-xs text-muted-foreground">{s.descEn}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {s.fieldCount} field{s.fieldCount === 1 ? "" : "s"}
                  {s.requiresUpload && s.uploadLabelEn ? ` · ${s.uploadLabelEn} (${s.uploadFormats.join(", ")}, max ${s.uploadMaxMB} MB)` : ""}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog — remounted per section via key so the form always starts fresh */}
      {editing && (
        <EditSectionDialog
          key={editing.key}
          section={editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            await update(payload, "Section updated");
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditSectionDialog({
  section,
  busy,
  onClose,
  onSave,
}: {
  section: SectionRow;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [titleEn, setTitleEn] = useState(section.titleEn);
  const [titleTl, setTitleTl] = useState(section.titleTl);
  const [formats, setFormats] = useState(section.uploadFormats.join(", "));
  const [maxMB, setMaxMB] = useState(String(section.uploadMaxMB));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" /> Edit Section
          </DialogTitle>
          <DialogDescription>
            {section.key.replace(/_/g, " ")} · {section.fieldCount} fields — titles apply to all barangay forms.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="req-title-en">Title (English)</Label>
            <Input id="req-title-en" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="req-title-tl">Title (Tagalog)</Label>
            <Input id="req-title-tl" value={titleTl} onChange={(e) => setTitleTl(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="req-desc">Description (English)</Label>
            <p id="req-desc" className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {section.descEn || "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">Descriptions are part of the locked template content.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="req-formats">Upload formats (comma-separated)</Label>
              <Input id="req-formats" value={formats} onChange={(e) => setFormats(e.target.value)} placeholder="pdf, jpg, png" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-maxmb">Max size (MB)</Label>
              <Input id="req-maxmb" type="number" min={1} max={50} value={maxMB} onChange={(e) => setMaxMB(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || !titleEn.trim() || !titleTl.trim()}
            onClick={() =>
              void onSave({
                key: section.key,
                titleEn: titleEn.trim(),
                titleTl: titleTl.trim(),
                uploadFormats: formats.split(",").map((f) => f.trim().toLowerCase()).filter(Boolean).join(","),
                uploadMaxMB: Number(maxMB) || 10,
              })
            }
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
