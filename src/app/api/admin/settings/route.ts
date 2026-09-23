import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, hashSecret } from "@/lib/qas33/auth";
import { getSettings, saveSettings } from "@/lib/qas33/server";
import { logAudit } from "@/lib/qas33/audit";

// GET — settings + rating criteria + admin users
export async function GET() {
  const resolved = await requireAdmin();
  if (!resolved || !resolved.admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getSettings();
  const criteria = await db.ratingCriterion.findMany({ orderBy: { order: "asc" } });
  const users = await db.adminUser.findMany({
    select: { id: true, username: true, name: true, position: true, role: true, active: true, lastLoginAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    settings,
    criteria: criteria.map((c) => ({ id: c.id, key: c.key, name: c.name, maxScore: c.maxScore, order: c.order, active: c.active })),
    users: users.map((u) => ({ ...u, lastLoginAt: u.lastLoginAt?.toISOString() ?? null })),
  });
}

// PUT — update settings, rating criteria (full replace), add admin user
export async function PUT(request: NextRequest) {
  const resolved = await requireAdmin();
  if (!resolved || !resolved.admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();

  if (body.settings) {
    const s = body.settings;
    await saveSettings({
      planYear: Number(s.planYear) || undefined,
      signatoryName: s.signatoryName ? String(s.signatoryName).slice(0, 120) : undefined,
      signatoryPosition: s.signatoryPosition ? String(s.signatoryPosition).slice(0, 200) : undefined,
      municipality: s.municipality ? String(s.municipality).slice(0, 80) : undefined,
      province: s.province ? String(s.province).slice(0, 80) : undefined,
      motto: s.motto ? String(s.motto).slice(0, 160) : undefined,
    });
    await logAudit({ actorType: "ADMIN", actorName: resolved.admin.name, action: "SETTINGS_UPDATED", detail: "System settings updated" });
  }

  if (Array.isArray(body.criteria)) {
    const incoming = body.criteria as Array<{ key: string; name: string; maxScore: number }>;
    const seen = new Set<string>();
    for (const c of incoming) {
      const key = String(c.key || "").trim().toLowerCase().replace(/\s+/g, "_");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const maxScore = Math.max(1, Math.min(100, Number(c.maxScore) || 25));
      await db.ratingCriterion.upsert({
        where: { key },
        create: { key, name: String(c.name).slice(0, 80), maxScore, order: incoming.indexOf(c) + 1 },
        update: { name: String(c.name).slice(0, 80), maxScore, order: incoming.indexOf(c) + 1, active: true },
      });
    }
    // deactivate criteria not in the list
    const keys = Array.from(seen);
    await db.ratingCriterion.updateMany({ where: { key: { notIn: keys } }, data: { active: false } });
    await logAudit({ actorType: "ADMIN", actorName: resolved.admin.name, action: "CRITERIA_UPDATED", detail: `Rating criteria updated (${keys.length} criteria)` });
  }

  if (body.newUser) {
    const u = body.newUser;
    const username = String(u.username || "").trim().toLowerCase();
    const password = String(u.password || "");
    if (username.length < 3 || password.length < 8) {
      return NextResponse.json({ error: "Username must be 3+ chars and password 8+ chars." }, { status: 400 });
    }
    const exists = await db.adminUser.findUnique({ where: { username } });
    if (exists) return NextResponse.json({ error: "Username already exists." }, { status: 409 });
    const user = await db.adminUser.create({
      data: {
        username,
        passwordHash: hashSecret(password),
        name: String(u.name || username).slice(0, 120),
        position: u.position ? String(u.position).slice(0, 120) : null,
        role: u.role === "SYSTEM_ADMIN" ? "SYSTEM_ADMIN" : "MDRRMO_ADMIN",
      },
    });
    await logAudit({ actorType: "ADMIN", actorName: resolved.admin.name, action: "USER_CREATED", detail: `Created admin user '${username}' (${user.role})` });
  }

  if (body.toggleUser) {
    const u = await db.adminUser.findUnique({ where: { id: String(body.toggleUser) } });
    if (u) {
      if (u.id === resolved.admin.id) {
        return NextResponse.json({ error: "You cannot disable your own account." }, { status: 400 });
      }
      await db.adminUser.update({ where: { id: u.id }, data: { active: !u.active } });
      await logAudit({ actorType: "ADMIN", actorName: resolved.admin.name, action: u.active ? "USER_DISABLED" : "USER_ENABLED", detail: `${u.active ? "Disabled" : "Enabled"} admin user '${u.username}'` });
    }
  }

  const settings = await getSettings();
  const criteria = await db.ratingCriterion.findMany({ where: { active: true }, orderBy: { order: "asc" } });
  return NextResponse.json({ ok: true, settings, criteria });
}
