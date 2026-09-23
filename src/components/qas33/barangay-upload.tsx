"use client";

// QAS33 Barangay Portal — upload dropzone + per-section attachment list

import { useRef, useState } from "react";
import {
  FileText,
  Loader2,
  Lock,
  Paperclip,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { api, formatDate } from "@/lib/qas33/api";
import type { ClientSection, FileMeta } from "@/lib/qas33/types";
import { FileStatusBadge, errMsg, formatFileSize } from "./barangay-shared";

export function UploadArea({
  section,
  files,
  editable,
  t,
  onDone,
}: {
  section: ClientSection;
  files: FileMeta[];
  editable: boolean;
  t: (en: string, tl: string) => string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleFile(file: File) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!section.uploadFormats.includes(ext)) {
      toast({
        variant: "destructive",
        title: t("Invalid file type", "Maling uri ng file"),
        description: `".${ext}" — ${t("accepted", "tanggap")}: ${section.uploadFormats
          .map((f) => f.toUpperCase())
          .join(", ")}`,
      });
      return;
    }
    if (file.size > section.uploadMaxMB * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: t("File too large", "Masyadong malaki ang file"),
        description: `${formatFileSize(file.size)} — ${t("maximum", "hanggang")} ${section.uploadMaxMB} MB.`,
      });
      return;
    }
    setUploading(true);
    try {
      await api.uploadFile(section.key, file);
      toast({
        title: t("File uploaded", "Nai-upload ang file"),
        description: `${file.name} — ${t("pending MDRRMO review", "naka-queue sa pagsusuri ng MDRRMO")}.`,
      });
      onDone();
    } catch (e) {
      toast({ variant: "destructive", title: t("Upload failed", "Nabigo ang upload"), description: errMsg(e) });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.deleteFile(id);
      toast({ title: t("File deleted", "Nabura ang file") });
      onDone();
    } catch (e) {
      toast({ variant: "destructive", title: t("Delete failed", "Nabigo ang pagbura"), description: errMsg(e) });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2">
        <Paperclip className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold">
          {section.uploadLabel || t("Required attachment", "Kinakailangang kalakip")}
          {section.required && <span className="ml-0.5 text-destructive">*</span>}
        </h3>
      </div>

      {editable ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={t("Upload file", "Mag-upload ng file")}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          className={cn(
            "mt-2 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent/40",
            uploading && "pointer-events-none opacity-60"
          )}
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
          ) : (
            <UploadCloud className="size-6 text-muted-foreground" aria-hidden="true" />
          )}
          <p className="text-sm font-medium">
            {uploading
              ? t("Uploading…", "Nag-a-upload…")
              : t("Drag & drop a file here, or click to browse", "Hilahin ang file dito, o i-click para mag-browse")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("Accepted", "Tinatanggap")}: {section.uploadFormats.map((f) => f.toUpperCase()).join(", ")} ·{" "}
            {t("Max", "Hanggang")} {section.uploadMaxMB} MB
          </p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={section.uploadFormats.map((f) => `.${f}`).join(",")}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </div>
      ) : (
        <p className="mt-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
          <Lock className="mr-1 inline size-3" aria-hidden="true" />
          {t("Uploads are locked while under review or approved.", "Naka-lock ang upload habang sinusuri o aprubado.")}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-lg border p-3">
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(f.size)} · {t("uploaded", "ina-upload")} {formatDate(f.uploadedAt)} · v{f.version}
                </p>
              </div>
              <FileStatusBadge status={f.status} />
              {editable && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={t("Delete file", "Burahin ang file")}
                      disabled={deletingId === f.id}
                    >
                      {deletingId === f.id ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="size-4" aria-hidden="true" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("Delete this file?", "Burahin ang file na ito?")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t(
                          `"${f.filename}" will be permanently removed.`,
                          `"${f.filename}" ay tuluyang mabubura.`
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("Cancel", "Kanselahin")}</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => void handleDelete(f.id)}
                      >
                        {t("Delete", "Burahin")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
