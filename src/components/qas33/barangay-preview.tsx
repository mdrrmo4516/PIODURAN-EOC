"use client";

// QAS33 Barangay Portal — full-screen BDRRMP document preview

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Paperclip } from "lucide-react";
import { fieldLabel } from "@/lib/qas33/api";
import type { BarangaySubmissionData, TemplateFieldDef } from "@/lib/qas33/types";
import { fieldDisplayValue } from "./barangay-fields";

function DocValue({ field, value, lang }: { field: TemplateFieldDef; value: unknown; lang: string | null }) {
  const display = fieldDisplayValue(field, value);
  if (display === null) return <span className="italic text-neutral-400">—</span>;
  if (Array.isArray(display)) {
    return (
      <ul className="list-inside list-disc space-y-0.5">
        {display.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return <span className="whitespace-pre-wrap">{display}</span>;
}

export function PreviewDialog({
  open,
  onOpenChange,
  data,
  values,
  barangayName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: BarangaySubmissionData;
  values: Record<string, unknown>;
  barangayName: string;
}) {
  const lang = data.submission.templateLang;
  const t = (en: string, tl: string) => (lang === "TL" ? tl : en);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[94vh] w-[96vw] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <div className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3">
          <div>
            <DialogTitle className="text-base">{t("BDRRMP Preview", "Preview ng BDRRMP")}</DialogTitle>
            <DialogDescription className="text-xs">
              {t("Unofficial preview of your answers", "Hindi opisyal na preview ng inyong mga sagot")}
            </DialogDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/50 p-3 sm:p-8">
          <article
            className="mx-auto max-w-[740px] rounded-sm bg-white px-6 py-8 text-neutral-900 shadow-lg sm:px-12"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {/* Letterhead */}
            <header className="border-b-4 border-double border-neutral-800 pb-4 text-center">
              <p className="text-[11px] tracking-wide">REPUBLIC OF THE PHILIPPINES</p>
              <p className="text-[11px] tracking-wide">PROVINCE OF ALBAY</p>
              <p className="mt-1 text-sm font-bold tracking-wide">MUNICIPALITY OF PIO DURAN</p>
              <p className="text-[10px] leading-tight">
                OFFICE OF THE MUNICIPAL DISASTER RISK REDUCTION AND MANAGEMENT OFFICER
              </p>
              <p className="mt-3 text-2xl font-bold tracking-[0.35em]">QAS33</p>
            </header>

            {/* Title block */}
            <div className="mt-6 text-center">
              <h1 className="text-lg font-bold uppercase leading-snug">
                {t(
                  "Barangay Disaster Risk Reduction and Management Plan (BDRRMP)",
                  "Plano ng Pagbabawas ng Panganib at Pamamahala sa Barangay (BDRRMP)"
                )}
              </h1>
              <p className="mt-2 text-base font-bold uppercase text-emerald-800">
                {t("Barangay", "Barangay")} {barangayName.toUpperCase()}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {t("Fiscal Year", "Taong Pananalapi")} {data.submission.year}
              </p>
            </div>

            {/* Sections */}
            {data.sections.map((section) => {
              const sFiles = data.files.filter((f) => f.sectionKey === section.key);
              return (
                <section key={section.key} className="mt-7">
                  <h2 className="border-b border-neutral-300 pb-1 text-[13px] font-bold uppercase tracking-wide">
                    {section.order}. {section.title}
                  </h2>
                  {section.desc && (
                    <p className="mt-1 text-[11px] italic text-neutral-500">{section.desc}</p>
                  )}
                  <dl className="mt-2.5 space-y-1.5">
                    {section.fields.map((field) => (
                      <div key={field.key} className="grid grid-cols-[8.5rem_1fr] gap-3 text-[12.5px] leading-snug">
                        <dt className="font-semibold">{fieldLabel(field, lang)}</dt>
                        <dd>
                          <DocValue field={field} value={values[field.key]} lang={lang} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {sFiles.length > 0 && (
                    <div className="mt-2 rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11.5px]">
                      <p className="flex items-center gap-1.5 font-semibold">
                        <Paperclip className="size-3" /> {t("Attachments", "Mga Kalakip")} ({sFiles.length})
                      </p>
                      <ul className="mt-1 list-inside list-disc text-neutral-600">
                        {sFiles.map((f) => (
                          <li key={f.id}>{f.filename}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              );
            })}

            {/* Certification footer */}
            <footer className="mt-10 border-t border-neutral-300 pt-6 text-center text-[11.5px] leading-relaxed text-neutral-600">
              <p className="mx-auto max-w-md">
                {t(
                  "I hereby certify that the information stated in this Barangay Disaster Risk Reduction and Management Plan is true and correct to the best of my knowledge.",
                  "Ako'y nagpapatunay na ang impormasyon sa planong ito ay tama at totoo ayon sa aking kaalaman."
                )}
              </p>
              <div className="mt-10 flex items-end justify-around">
                <div className="w-56 border-t border-neutral-500 pt-1">
                  <p className="font-semibold text-neutral-800">
                    {String(values.barangay_captain ?? "Punong Barangay").trim() || "Punong Barangay"}
                  </p>
                  <p>{t("Punong Barangay", "Punong Barangay")}</p>
                </div>
                <div className="w-56 border-t border-neutral-500 pt-1">
                  <p className="font-semibold text-neutral-800">Municipal DRRM Officer</p>
                  <p>{t("Reviewed and Approved — MDRRMO", "Sinuri at Aprubado — MDRRMO")}</p>
                </div>
              </div>
              <p className="mt-8 text-[10px] text-neutral-400">
                QAS33 · {t("Generated by the Barangay Portal preview", "Gawa ng preview ng Barangay Portal")}
              </p>
            </footer>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}
