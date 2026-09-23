"use client";

// QAS33 Barangay Portal — reusable BDRRMP field renderer + read-only display

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { fieldLabel } from "@/lib/qas33/api";
import type { TemplateFieldDef } from "@/lib/qas33/types";

// ---------------------------------------------------------------------------
// Value helpers
// ---------------------------------------------------------------------------

/** Mirrors the server-side fieldHasValue logic (template.ts). */
export function fieldHasValue(field: TemplateFieldDef, value: unknown): boolean {
  if (field.type === "checkbox") return Array.isArray(value) && value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  return value !== undefined && value !== null;
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

/** Human-readable value for previews / read-only views. Returns null when empty. */
export function fieldDisplayValue(field: TemplateFieldDef, value: unknown): string | string[] | null {
  if (field.type === "checkbox") {
    const arr = asArray(value);
    return arr.length > 0 ? arr : null;
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (value !== null && value !== undefined && value !== "") return String(value);
  return null;
}

// ---------------------------------------------------------------------------
// Editable field control
// ---------------------------------------------------------------------------

export function FieldControl({
  field,
  value,
  onChange,
  disabled,
  lang,
}: {
  field: TemplateFieldDef;
  value: unknown;
  onChange: (next: unknown) => void;
  disabled?: boolean;
  lang: string | null;
}) {
  const label = fieldLabel(field, lang);
  const help = lang === "TL" ? field.helpTl : field.helpEn;
  const fieldId = `fld-${field.key}`;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        field.width === "full" ? "md:col-span-2" : "md:col-span-1"
      )}
    >
      <Label htmlFor={fieldId} className="text-sm font-medium leading-snug">
        {label}
        {field.required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>

      {field.type === "text" && (
        <Input
          id={fieldId}
          value={asText(value)}
          placeholder={field.placeholder || undefined}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === "number" && (
        <div className="relative">
          <Input
            id={fieldId}
            type="number"
            inputMode="numeric"
            value={asText(value)}
            placeholder={field.placeholder || undefined}
            disabled={disabled}
            className={field.unit ? "pr-16" : undefined}
            onChange={(e) => onChange(e.target.value === "" ? "" : e.target.value)}
          />
          {field.unit && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
              {field.unit}
            </span>
          )}
        </div>
      )}

      {field.type === "textarea" && (
        <Textarea
          id={fieldId}
          rows={4}
          value={asText(value)}
          placeholder={field.placeholder || undefined}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === "select" && (
        <Select
          key={asText(value)}
          value={asText(value) || undefined}
          onValueChange={(v) => onChange(v)}
          disabled={disabled}
        >
          <SelectTrigger id={fieldId} className="w-full">
            <SelectValue placeholder={lang === "TL" ? "Pumili..." : "Select..."} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.type === "radio" && (
        <RadioGroup
          value={asText(value) || undefined}
          onValueChange={(v) => onChange(v)}
          disabled={disabled}
          className="flex flex-row flex-wrap gap-x-6 gap-y-2"
        >
          {(field.options ?? []).map((opt, i) => (
            <div key={opt} className="flex items-center gap-2">
              <RadioGroupItem id={`${fieldId}-${i}`} value={opt} />
              <Label htmlFor={`${fieldId}-${i}`} className="cursor-pointer font-normal text-sm">
                {opt}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {field.type === "checkbox" && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(field.options ?? []).map((opt, i) => {
            const checked = asArray(value).includes(opt);
            return (
              <div key={opt} className="flex items-start gap-2">
                <Checkbox
                  id={`${fieldId}-${i}`}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(c) => {
                    const current = asArray(value);
                    onChange(c ? [...current, opt] : current.filter((v) => v !== opt));
                  }}
                  className="mt-0.5"
                />
                <Label htmlFor={`${fieldId}-${i}`} className="cursor-pointer font-normal text-sm leading-snug">
                  {opt}
                </Label>
              </div>
            );
          })}
        </div>
      )}

      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Read-only field display (locked mode)
// ---------------------------------------------------------------------------

export function ReadonlyField({
  field,
  value,
  lang,
}: {
  field: TemplateFieldDef;
  value: unknown;
  lang: string | null;
}) {
  const label = fieldLabel(field, lang);
  const display = fieldDisplayValue(field, value);

  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/30 px-3 py-2.5",
        field.width === "full" ? "md:col-span-2" : "md:col-span-1"
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {display === null ? (
        <p className="mt-1 text-sm italic text-muted-foreground">—</p>
      ) : Array.isArray(display) ? (
        <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-sm">
          {display.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-sm">{display}</p>
      )}
    </div>
  );
}
