// QAS33 — Database Management registry & generic CRUD service (SYSTEM_ADMIN only)
// Provides table metadata (labels, field types) plus safe, audit-logged CRUD
// used by /api/admin/database*. All operations go through the Prisma client.
import { db } from "@/lib/db";
import { logAudit } from "@/lib/qas33/audit";

export type DbFieldType = "string" | "number" | "boolean" | "datetime" | "json";

export interface DbFieldDef {
  name: string; // Prisma field name
  label: string; // UI label
  type: DbFieldType;
  required?: boolean; // required when creating a row
  nullable?: boolean; // accepts empty -> null
  readonly?: boolean; // id / createdAt / updatedAt (shown but not editable)
  fk?: string; // referenced table key for a nicer picker hint
  help?: string;
}

export interface DbTableDef {
  key: string; // URL key, e.g. "barangays"
  model: string; // Prisma delegate name, e.g. "barangay"
  label: string;
  group: "People & Access" | "Barangay Data" | "Plans & Reviews" | "Documents" | "System";
  desc: string;
  idField: string; // "id" (or "key" for system_settings)
  orderBy: { field: string; dir: "asc" | "desc" };
  searchFields: string[];
  fields: DbFieldDef[];
}

const idField = (label = "ID"): DbFieldDef => ({ name: "id", label, type: "string", readonly: true, help: "Auto-generated (cuid)" });
const createdAtField: DbFieldDef = { name: "createdAt", label: "Created At", type: "datetime", readonly: true };
const updatedAtField: DbFieldDef = { name: "updatedAt", label: "Updated At", type: "datetime", readonly: true };

export const DB_TABLES: DbTableDef[] = [
  {
    key: "admin_users",
    model: "adminUser",
    label: "Admin Users",
    group: "People & Access",
    desc: "Console accounts — MDRRMO Officer, MDRRMO Staff and System Administrators.",
    idField: "id",
    orderBy: { field: "createdAt", dir: "asc" },
    searchFields: ["username", "name", "position", "role"],
    fields: [
      idField(),
      { name: "username", label: "Username", type: "string", required: true },
      { name: "passwordHash", label: "Password Hash", type: "string", required: true, help: "scrypt hash — normally managed via the Users module" },
      { name: "name", label: "Full Name", type: "string", required: true },
      { name: "position", label: "Position", type: "string", nullable: true },
      { name: "role", label: "Role", type: "string", required: true, help: "SYSTEM_ADMIN | MDRRMO_OFFICER | MDRRMO_STAFF" },
      { name: "active", label: "Active", type: "boolean" },
      { name: "lastLoginAt", label: "Last Login", type: "datetime", nullable: true },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: "barangays",
    model: "barangay",
    label: "Barangays",
    group: "Barangay Data",
    desc: "The 33 barangays of Pio Duran with profile data.",
    idField: "id",
    orderBy: { field: "code", dir: "asc" },
    searchFields: ["code", "name", "captain"],
    fields: [
      idField(),
      { name: "code", label: "Code", type: "string", required: true, help: "e.g. PD-BRG-001" },
      { name: "name", label: "Barangay Name", type: "string", required: true },
      { name: "captain", label: "Punong Barangay", type: "string", nullable: true },
      { name: "population", label: "Population", type: "number", nullable: true },
      { name: "households", label: "Households", type: "number", nullable: true },
      { name: "puroks", label: "Puroks", type: "number", nullable: true },
      { name: "landArea", label: "Land Area (ha)", type: "number", nullable: true },
      { name: "active", label: "Active", type: "boolean" },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: "barangay_officials",
    model: "barangayOfficial",
    label: "Barangay Officials",
    group: "Barangay Data",
    desc: "Sangguniang Barangay council members for each barangay.",
    idField: "id",
    orderBy: { field: "order", dir: "asc" },
    searchFields: ["name", "position", "committee"],
    fields: [
      idField(),
      { name: "barangayId", label: "Barangay", type: "string", required: true, fk: "barangays" },
      { name: "name", label: "Official Name", type: "string", required: true },
      { name: "position", label: "Position", type: "string", required: true, help: "PUNONG_BARANGAY | KAGAWAD | SK_CHAIRPERSON | SECRETARY | TREASURER" },
      { name: "committee", label: "Committee", type: "string", nullable: true },
      { name: "order", label: "Order", type: "number" },
      { name: "active", label: "Active", type: "boolean" },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: "barangay_credentials",
    model: "barangayCredential",
    label: "Barangay Credentials",
    group: "People & Access",
    desc: "Barangay login PINs (hashed), lockout and first-login state.",
    idField: "id",
    orderBy: { field: "createdAt", dir: "asc" },
    searchFields: ["tempPin", "lastLoginIp"],
    fields: [
      idField(),
      { name: "barangayId", label: "Barangay", type: "string", required: true, fk: "barangays" },
      { name: "pinHash", label: "PIN Hash", type: "string", required: true },
      { name: "tempPin", label: "Temp PIN", type: "string", nullable: true },
      { name: "mustChangePin", label: "Must Change PIN", type: "boolean" },
      { name: "active", label: "Active", type: "boolean" },
      { name: "failedAttempts", label: "Failed Attempts", type: "number" },
      { name: "lockedUntil", label: "Locked Until", type: "datetime", nullable: true },
      { name: "lastLoginAt", label: "Last Login", type: "datetime", nullable: true },
      { name: "lastLoginIp", label: "Last Login IP", type: "string", nullable: true },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: "sessions",
    model: "session",
    label: "Sessions",
    group: "People & Access",
    desc: "Active login sessions. Deleting a row forces that user to sign in again.",
    idField: "id",
    orderBy: { field: "createdAt", dir: "desc" },
    searchFields: ["token", "role", "ip", "userAgent"],
    fields: [
      idField(),
      { name: "token", label: "Token", type: "string", required: true },
      { name: "role", label: "Role", type: "string", required: true, help: "BARANGAY | ADMIN" },
      { name: "barangayId", label: "Barangay ID", type: "string", nullable: true, fk: "barangays" },
      { name: "adminId", label: "Admin ID", type: "string", nullable: true, fk: "admin_users" },
      { name: "ip", label: "IP", type: "string", nullable: true },
      { name: "userAgent", label: "User Agent", type: "string", nullable: true },
      { name: "expiresAt", label: "Expires At", type: "datetime", required: true },
      createdAtField,
    ],
  },
  {
    key: "template_sections",
    model: "templateSection",
    label: "Template Sections",
    group: "System",
    desc: "BDRRMP plan sections (References) shown to barangays in both languages.",
    idField: "id",
    orderBy: { field: "order", dir: "asc" },
    searchFields: ["key", "titleEn", "titleTl"],
    fields: [
      idField(),
      { name: "key", label: "Key", type: "string", required: true, help: "e.g. hazard_assessment" },
      { name: "order", label: "Order", type: "number", required: true },
      { name: "titleEn", label: "Title (EN)", type: "string", required: true },
      { name: "titleTl", label: "Title (TL)", type: "string", required: true },
      { name: "descEn", label: "Description (EN)", type: "string", nullable: true },
      { name: "descTl", label: "Description (TL)", type: "string", nullable: true },
      { name: "icon", label: "Icon", type: "string", nullable: true },
      { name: "requiresUpload", label: "Requires Upload", type: "boolean" },
      { name: "uploadLabelEn", label: "Upload Label (EN)", type: "string", nullable: true },
      { name: "uploadLabelTl", label: "Upload Label (TL)", type: "string", nullable: true },
      { name: "uploadFormats", label: "Upload Formats", type: "string" },
      { name: "uploadMaxMB", label: "Upload Max (MB)", type: "number" },
      { name: "required", label: "Required", type: "boolean" },
      { name: "active", label: "Active", type: "boolean" },
      { name: "fieldsJson", label: "Fields (JSON)", type: "json" },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: "submissions",
    model: "submission",
    label: "Submissions",
    group: "Plans & Reviews",
    desc: "One BDRRMP submission per barangay per year with its status.",
    idField: "id",
    orderBy: { field: "updatedAt", dir: "desc" },
    searchFields: ["status", "valuesJson"],
    fields: [
      idField(),
      { name: "barangayId", label: "Barangay", type: "string", required: true, fk: "barangays" },
      { name: "year", label: "Year", type: "number", required: true },
      { name: "status", label: "Status", type: "string" },
      { name: "templateLang", label: "Template Language", type: "string", nullable: true, help: "EN | TL" },
      { name: "valuesJson", label: "Form Values (JSON)", type: "json" },
      { name: "progress", label: "Progress", type: "number" },
      { name: "version", label: "Version", type: "number" },
      { name: "submittedAt", label: "Submitted At", type: "datetime", nullable: true },
      { name: "resubmittedAt", label: "Resubmitted At", type: "datetime", nullable: true },
      { name: "underReviewAt", label: "Under Review At", type: "datetime", nullable: true },
      { name: "approvedAt", label: "Approved At", type: "datetime", nullable: true },
      { name: "finalizedAt", label: "Finalized At", type: "datetime", nullable: true },
      { name: "downloadedAt", label: "Downloaded At", type: "datetime", nullable: true },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: "submission_versions",
    model: "submissionVersion",
    label: "Submission Versions",
    group: "Plans & Reviews",
    desc: "Immutable snapshots of every submitted version (v1, v2, …).",
    idField: "id",
    orderBy: { field: "submittedAt", dir: "desc" },
    searchFields: ["note"],
    fields: [
      idField(),
      { name: "submissionId", label: "Submission", type: "string", required: true, fk: "submissions" },
      { name: "version", label: "Version", type: "number", required: true },
      { name: "valuesJson", label: "Values (JSON)", type: "json", required: true },
      { name: "filesJson", label: "Files (JSON)", type: "json" },
      { name: "note", label: "Note", type: "string", nullable: true },
      { name: "submittedAt", label: "Submitted At", type: "datetime" },
    ],
  },
  {
    key: "submission_files",
    model: "submissionFile",
    label: "Submission Files",
    group: "Documents",
    desc: "Uploaded supporting documents per submission section.",
    idField: "id",
    orderBy: { field: "uploadedAt", dir: "desc" },
    searchFields: ["filename", "sectionKey", "mimeType", "uploadedBy"],
    fields: [
      idField(),
      { name: "submissionId", label: "Submission", type: "string", required: true, fk: "submissions" },
      { name: "sectionKey", label: "Section Key", type: "string", required: true },
      { name: "filename", label: "Filename", type: "string", required: true },
      { name: "storageKey", label: "Storage Key", type: "string", required: true },
      { name: "mimeType", label: "MIME Type", type: "string", required: true },
      { name: "size", label: "Size (bytes)", type: "number", required: true },
      { name: "version", label: "Version", type: "number" },
      { name: "status", label: "Status", type: "string" },
      { name: "uploadedBy", label: "Uploaded By", type: "string", required: true },
      { name: "uploadedAt", label: "Uploaded At", type: "datetime" },
    ],
  },
  {
    key: "stored_files",
    model: "storedFile",
    label: "File Library",
    group: "Documents",
    desc: "Documents & images uploaded by any user (barangays and console users) via the File Library.",
    idField: "id",
    orderBy: { field: "createdAt", dir: "desc" },
    searchFields: ["originalName", "title", "ownerName", "category", "mimeType"],
    fields: [
      idField(),
      { name: "ownerType", label: "Owner Type", type: "string", required: true, help: "BARANGAY | ADMIN" },
      { name: "barangayId", label: "Barangay", type: "string", nullable: true, fk: "barangays", help: "Set when a barangay uploaded the file" },
      { name: "adminId", label: "Console User", type: "string", nullable: true, fk: "admin_users", help: "Set when a console user uploaded the file" },
      { name: "ownerName", label: "Owner Name", type: "string", required: true },
      { name: "category", label: "Category", type: "string", required: true },
      { name: "title", label: "Title", type: "string", nullable: true },
      { name: "description", label: "Description", type: "string", nullable: true },
      { name: "originalName", label: "Original Filename", type: "string", required: true },
      { name: "storageKey", label: "Storage Key", type: "string", required: true },
      { name: "mimeType", label: "MIME Type", type: "string", required: true },
      { name: "kind", label: "Kind", type: "string", required: true, help: "IMAGE | DOCUMENT" },
      { name: "size", label: "Size (bytes)", type: "number", required: true },
      { name: "downloads", label: "Downloads", type: "number" },
      createdAtField,
    ],
  },
  {
    key: "reviews",
    model: "review",
    label: "Reviews",
    group: "Plans & Reviews",
    desc: "Review actions (started / commented / revision requested / approved).",
    idField: "id",
    orderBy: { field: "createdAt", dir: "desc" },
    searchFields: ["reviewerName", "action", "overallComment"],
    fields: [
      idField(),
      { name: "submissionId", label: "Submission", type: "string", required: true, fk: "submissions" },
      { name: "version", label: "Version", type: "number", required: true },
      { name: "reviewerId", label: "Reviewer ID", type: "string", required: true, fk: "admin_users" },
      { name: "reviewerName", label: "Reviewer", type: "string", required: true },
      { name: "action", label: "Action", type: "string", required: true },
      { name: "overallComment", label: "Overall Comment", type: "string", nullable: true },
      createdAtField,
    ],
  },
  {
    key: "review_comments",
    model: "reviewComment",
    label: "Review Comments",
    group: "Plans & Reviews",
    desc: "Section-level review comments attached to a review.",
    idField: "id",
    orderBy: { field: "createdAt", dir: "desc" },
    searchFields: ["sectionKey", "comment"],
    fields: [
      idField(),
      { name: "reviewId", label: "Review", type: "string", required: true, fk: "reviews" },
      { name: "sectionKey", label: "Section Key", type: "string", required: true },
      { name: "comment", label: "Comment", type: "string", required: true },
      { name: "requiresRevision", label: "Requires Revision", type: "boolean" },
      createdAtField,
    ],
  },
  {
    key: "rating_criteria",
    model: "ratingCriterion",
    label: "Rating Criteria",
    group: "System",
    desc: "Configurable evaluation criteria and their maximum scores.",
    idField: "id",
    orderBy: { field: "order", dir: "asc" },
    searchFields: ["key", "name"],
    fields: [
      idField(),
      { name: "key", label: "Key", type: "string", required: true },
      { name: "name", label: "Name", type: "string", required: true },
      { name: "maxScore", label: "Max Score", type: "number", required: true },
      { name: "order", label: "Order", type: "number", required: true },
      { name: "active", label: "Active", type: "boolean" },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: "ratings",
    model: "rating",
    label: "Ratings",
    group: "Plans & Reviews",
    desc: "Evaluation scores given to submissions.",
    idField: "id",
    orderBy: { field: "createdAt", dir: "desc" },
    searchFields: ["scoresJson", "remarks", "ratedByName"],
    fields: [
      idField(),
      { name: "submissionId", label: "Submission", type: "string", required: true, fk: "submissions" },
      { name: "scoresJson", label: "Scores (JSON)", type: "json", required: true },
      { name: "total", label: "Total", type: "number", required: true },
      { name: "remarks", label: "Remarks", type: "string", nullable: true },
      { name: "ratedBy", label: "Rated By (ID)", type: "string", required: true, fk: "admin_users" },
      { name: "ratedByName", label: "Rated By", type: "string", nullable: true },
      createdAtField,
    ],
  },
  {
    key: "generated_documents",
    model: "generatedDocument",
    label: "Generated Documents",
    group: "Documents",
    desc: "Final signed BDRRMP PDFs with document IDs.",
    idField: "id",
    orderBy: { field: "generatedAt", dir: "desc" },
    searchFields: ["docId", "signedBy", "fileKey"],
    fields: [
      idField(),
      { name: "submissionId", label: "Submission", type: "string", required: true, fk: "submissions" },
      { name: "docId", label: "Document ID", type: "string", required: true },
      { name: "version", label: "Version", type: "number", required: true },
      { name: "fileKey", label: "File Key", type: "string", required: true },
      { name: "lang", label: "Language", type: "string" },
      { name: "signed", label: "Signed", type: "boolean" },
      { name: "signedBy", label: "Signed By", type: "string", nullable: true },
      { name: "signedAt", label: "Signed At", type: "datetime", nullable: true },
      { name: "signatureHash", label: "Signature Hash", type: "string", nullable: true },
      { name: "generatedAt", label: "Generated At", type: "datetime" },
    ],
  },
  {
    key: "download_logs",
    model: "downloadLog",
    label: "Download Logs",
    group: "Documents",
    desc: "Who downloaded which final document and when.",
    idField: "id",
    orderBy: { field: "createdAt", dir: "desc" },
    searchFields: ["downloadedBy", "ip"],
    fields: [
      idField(),
      { name: "documentId", label: "Document", type: "string", required: true, fk: "generated_documents" },
      { name: "downloadedBy", label: "Downloaded By", type: "string", required: true },
      { name: "ip", label: "IP", type: "string", nullable: true },
      createdAtField,
    ],
  },
  {
    key: "notifications",
    model: "notification",
    label: "Notifications",
    group: "System",
    desc: "In-app notifications for barangays and the MDRRMO.",
    idField: "id",
    orderBy: { field: "createdAt", dir: "desc" },
    searchFields: ["title", "body", "type"],
    fields: [
      idField(),
      { name: "barangayId", label: "Barangay", type: "string", nullable: true, fk: "barangays" },
      { name: "audience", label: "Audience", type: "string", required: true, help: "BARANGAY | ADMIN" },
      { name: "type", label: "Type", type: "string", required: true },
      { name: "title", label: "Title", type: "string", required: true },
      { name: "body", label: "Body", type: "string", nullable: true },
      { name: "link", label: "Link", type: "string", nullable: true },
      { name: "read", label: "Read", type: "boolean" },
      createdAtField,
    ],
  },
  {
    key: "audit_logs",
    model: "auditLog",
    label: "Audit Logs",
    group: "System",
    desc: "Full audit trail of every action in the system.",
    idField: "id",
    orderBy: { field: "createdAt", dir: "desc" },
    searchFields: ["actorName", "action", "detail", "ip"],
    fields: [
      idField(),
      { name: "actorType", label: "Actor Type", type: "string", required: true },
      { name: "actorName", label: "Actor", type: "string", required: true },
      { name: "action", label: "Action", type: "string", required: true },
      { name: "detail", label: "Detail", type: "string", nullable: true },
      { name: "barangayId", label: "Barangay", type: "string", nullable: true, fk: "barangays" },
      { name: "ip", label: "IP", type: "string", nullable: true },
      createdAtField,
    ],
  },
  {
    key: "tutorials",
    model: "tutorial",
    label: "Tutorials",
    group: "System",
    desc: "Help guides shown inside the barangay portal (EN + TL).",
    idField: "id",
    orderBy: { field: "order", dir: "asc" },
    searchFields: ["key", "titleEn", "titleTl"],
    fields: [
      idField(),
      { name: "key", label: "Key", type: "string", required: true },
      { name: "titleEn", label: "Title (EN)", type: "string", required: true },
      { name: "titleTl", label: "Title (TL)", type: "string", required: true },
      { name: "bodyEn", label: "Body (EN)", type: "string", required: true },
      { name: "bodyTl", label: "Body (TL)", type: "string", required: true },
      { name: "order", label: "Order", type: "number", required: true },
      { name: "active", label: "Active", type: "boolean" },
      createdAtField,
      updatedAtField,
    ],
  },
  {
    key: "system_settings",
    model: "systemSetting",
    label: "System Settings",
    group: "System",
    desc: "Key–value application settings (JSON-encoded values).",
    idField: "key",
    orderBy: { field: "key", dir: "asc" },
    searchFields: ["key", "value"],
    fields: [
      { name: "key", label: "Key", type: "string", required: true },
      { name: "value", label: "Value (JSON)", type: "json", required: true },
    ],
  },
];

export function getTableDef(key: string): DbTableDef | undefined {
  return DB_TABLES.find((t) => t.key === key);
}

// Minimal structural type so we can address Prisma models dynamically
// without pulling the full Prisma client types into this module.
interface DynamicModel {
  count: (args?: any) => Promise<number>;
  findMany: (args?: any) => Promise<any[]>;
  findUnique: (args: any) => Promise<any | null>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
}

function getModel(def: DbTableDef): DynamicModel {
  const models = db as unknown as Record<string, DynamicModel>;
  const model = models[def.model];
  if (!model) throw new Error(`Unknown Prisma model: ${def.model}`);
  return model;
}

export interface TableSummary {
  key: string;
  label: string;
  group: string;
  desc: string;
  count: number;
  fields: DbFieldDef[];
  idField: string;
  orderBy: { field: string; dir: "asc" | "desc" };
  searchFields: string[];
}

export async function listTables(): Promise<TableSummary[]> {
  const out: TableSummary[] = [];
  for (const def of DB_TABLES) {
    const count = await getModel(def).count().catch(() => 0);
    out.push({
      key: def.key,
      label: def.label,
      group: def.group,
      desc: def.desc,
      count,
      fields: def.fields,
      idField: def.idField,
      orderBy: def.orderBy,
      searchFields: def.searchFields,
    });
  }
  return out;
}

function buildSearchWhere(def: DbTableDef, search: string) {
  if (!search) return undefined;
  return { OR: def.searchFields.map((f) => ({ [f]: { contains: search } })) };
}

export async function listRows(
  tableKey: string,
  opts: { page: number; pageSize: number; search: string }
): Promise<{ rows: Record<string, unknown>[]; total: number; page: number; pageSize: number }> {
  const def = getTableDef(tableKey);
  if (!def) throw new Error("Unknown table");
  const model = getModel(def);
  const page = Math.max(1, opts.page);
  const pageSize = Math.min(100, Math.max(5, opts.pageSize));
  const where = buildSearchWhere(def, opts.search);
  const [rows, total] = await Promise.all([
    model.findMany({
      where,
      orderBy: { [def.orderBy.field]: def.orderBy.dir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    model.count({ where }),
  ]);
  return { rows: rows as Record<string, unknown>[], total, page, pageSize };
}

// Coerce and validate a raw payload against the table's field definitions.
// Returns { data } ready for Prisma, or throws with a readable message.
export function coerceRowData(
  def: DbTableDef,
  body: Record<string, unknown>,
  mode: "create" | "update"
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of def.fields) {
    const present = Object.prototype.hasOwnProperty.call(body, field.name);
    if (mode === "create") {
      if (field.readonly) continue; // auto-generated
      if (!present) {
        if (field.required) throw new Error(`Field "${field.label}" is required.`);
        continue; // optional fields fall back to Prisma defaults
      }
    } else {
      if (!present || field.readonly) continue;
    }
    const raw = body[field.name];
    if (raw === null || raw === "" || raw === undefined) {
      if (field.type === "boolean") {
        data[field.name] = false;
        continue;
      }
      if (field.nullable) {
        data[field.name] = null;
        continue;
      }
      if (mode === "update") continue; // skip clearing non-nullable fields
      throw new Error(`Field "${field.label}" cannot be empty.`);
    }
    switch (field.type) {
      case "number": {
        const n = Number(raw);
        if (!Number.isFinite(n)) throw new Error(`Field "${field.label}" must be a number.`);
        data[field.name] = n;
        break;
      }
      case "boolean":
        data[field.name] = raw === true || raw === "true" || raw === 1 || raw === "1";
        break;
      case "datetime": {
        const d = new Date(String(raw));
        if (isNaN(d.getTime())) throw new Error(`Field "${field.label}" must be a valid date/time.`);
        data[field.name] = d;
        break;
      }
      case "json": {
        try {
          const parsed = JSON.parse(String(raw));
          data[field.name] = JSON.stringify(parsed);
        } catch {
          throw new Error(`Field "${field.label}" must contain valid JSON.`);
        }
        break;
      }
      default:
        data[field.name] = String(raw);
    }
  }
  if (Object.keys(data).length === 0) throw new Error("Nothing to save — no editable fields were provided.");
  return data;
}

export async function createRow(
  tableKey: string,
  body: Record<string, unknown>,
  actor: { name: string; ip?: string }
): Promise<Record<string, unknown>> {
  const def = getTableDef(tableKey);
  if (!def) throw new Error("Unknown table");
  const data = coerceRowData(def, body, "create");
  try {
    const row = (await getModel(def).create({ data })) as Record<string, unknown>;
    await logAudit({
      actorType: "ADMIN",
      actorName: actor.name,
      action: "DB_CREATE",
      detail: `Created row in ${def.label} (${def.idField}=${String(row[def.idField])}) via Database Management`,
      ip: actor.ip,
    });
    return row;
  } catch (e) {
    throw new Error(friendlyDbError(e, def.label, "create"));
  }
}

export async function updateRow(
  tableKey: string,
  id: string,
  body: Record<string, unknown>,
  actor: { name: string; ip?: string }
): Promise<Record<string, unknown>> {
  const def = getTableDef(tableKey);
  if (!def) throw new Error("Unknown table");
  const model = getModel(def);
  const existing = await model.findUnique({ where: { [def.idField]: id } });
  if (!existing) throw new Error("Row not found.");
  const data = coerceRowData(def, body, "update");
  try {
    const row = (await model.update({ where: { [def.idField]: id }, data })) as Record<string, unknown>;
    await logAudit({
      actorType: "ADMIN",
      actorName: actor.name,
      action: "DB_UPDATE",
      detail: `Updated row in ${def.label} (${def.idField}=${id}) via Database Management`,
      ip: actor.ip,
    });
    return row;
  } catch (e) {
    throw new Error(friendlyDbError(e, def.label, "update"));
  }
}

export async function deleteRow(
  tableKey: string,
  id: string,
  actor: { id: string; name: string; ip?: string }
): Promise<void> {
  const def = getTableDef(tableKey);
  if (!def) throw new Error("Unknown table");
  const model = getModel(def);
  const existing = await model.findUnique({ where: { [def.idField]: id } });
  if (!existing) throw new Error("Row not found.");

  // Guardrails for the admin_users table
  if (def.key === "admin_users") {
    const row = existing as unknown as { id: string; username: string; role: string; active: boolean };
    if (row.id === actor.id) throw new Error("You cannot delete your own account.");
    if (row.username === "sysadmin") throw new Error("The default System Administrator account (sysadmin) cannot be deleted.");
    if (row.role === "SYSTEM_ADMIN") {
      const admins = await db.adminUser.findMany({ where: { role: "SYSTEM_ADMIN", active: true } });
      if (admins.length <= 1) throw new Error("Cannot delete the last active System Administrator account.");
    }
  }

  try {
    await model.delete({ where: { [def.idField]: id } });
    await logAudit({
      actorType: "ADMIN",
      actorName: actor.name,
      action: "DB_DELETE",
      detail: `Deleted row from ${def.label} (${def.idField}=${id}) via Database Management`,
      ip: actor.ip,
    });
  } catch (e) {
    throw new Error(friendlyDbError(e, def.label, "delete"));
  }
}

function friendlyDbError(e: unknown, label: string, verb: string): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("UNIQUE constraint failed")) {
    return `A row with the same unique value already exists in ${label}.`;
  }
  if (msg.includes("FOREIGN KEY constraint failed")) {
    return `Cannot ${verb} this ${label} row — other records reference it.`;
  }
  if (msg.includes("Required value missing")) {
    return `A required field is missing for ${label}.`;
  }
  return `Could not ${verb} the ${label} row: ${msg.slice(0, 200)}`;
}
