// QAS33 server helpers: settings, doc IDs
import { db } from "@/lib/db";
import type { SettingValues } from "./types";

const DEFAULT_SETTINGS: SettingValues = {
  planYear: 2026,
  signatoryName: "Jose R. Salazar",
  signatoryPosition: "Municipal Disaster Risk Reduction and Management Officer",
  municipality: "Pio Duran",
  province: "Albay",
  region: "Bicol Region (Region V)",
  motto: "Faster. Simpler. Transparent.",
};

export async function getSettings(): Promise<SettingValues> {
  const rows = await db.systemSetting.findMany();
  const map: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      map[r.key] = JSON.parse(r.value);
    } catch {
      map[r.key] = r.value;
    }
  }
  return { ...DEFAULT_SETTINGS, ...(map as Partial<SettingValues>) };
}

export async function saveSettings(values: Partial<SettingValues>) {
  const current = await getSettings();
  const merged = { ...current, ...values };
  for (const key of Object.keys(merged) as Array<keyof SettingValues>) {
    const json = JSON.stringify(merged[key]);
    await db.systemSetting.upsert({
      where: { key },
      create: { key, value: json },
      update: { value: json },
    });
  }
  return merged;
}

export function buildDocId(barangayCode: string, year: number, version: number): string {
  const num = barangayCode.replace(/\D/g, "").padStart(3, "0");
  const yy = String(year % 100).padStart(2, "0");
  return version > 1 ? `QAS33-BDRRMP-${yy}-${num}-V${version}` : `QAS33-BDRRMP-${yy}-${num}`;
}

export function getBaseUrl(request: Request): string {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}
