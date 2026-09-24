"use client";

// QAS33 — Users (SYSTEM_ADMIN only): ALL user accounts in one place.
// Tab 1 "Console Users": MDRRMO console accounts + role assignment (the only
//   place roles can be changed — /api/admin/users).
// Tab 2 "Barangay Accounts": the 33 barangay login accounts — access PIN
//   lifecycle (reset / revoke / reactivate), lockout clearing and enable /
//   disable, via the /api/admin/barangays credential actions.

import { useState } from "react";
import {
  Ban,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  LockOpen,
  MoreHorizontal,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users as UsersIcon,
  Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { api, formatDateTime } from "@/lib/qas33/api";
import { ADMIN_ROLE_META, normalizeAdminRole, type AdminRole, type SessionInfo } from "@/lib/qas33/types";
import { CopyButton, ErrorAlert, TableSkeleton, useLoad } from "./mdrrmo-shared";

type UsersResponse = Awaited<ReturnType<typeof api.adminUsers>>;
type AdminUserRow = UsersResponse["users"][number];

const ROLES: AdminRole[] = ["SYSTEM_ADMIN", "MDRRMO_OFFICER", "MDRRMO_STAFF"];

function RoleBadge({ role }: { role: string }) {
  const meta = ADMIN_ROLE_META[normalizeAdminRole(role)];
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        meta.badge
      )}
    >
      {meta.label}
    </span>
  );
}

// Looks-like-a-disabled-menu-item that carries a tooltip (disabled Radix items
// swallow pointer events, so we render a non-interactive lookalike instead).
function ProtectedAction({ icon: Icon, label, tooltip }: { icon: LucideIcon; label: string; tooltip: string }) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            role="button"
            aria-label={`${label} — ${tooltip}`}
            className="relative flex w-full cursor-not-allowed select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground outline-none opacity-50"
          >
            <Icon className="h-4 w-4" /> {label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-56 text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function MdrrmoUsers({ session }: { session: SessionInfo }) {
  const [tab, setTab] = useState<string>("console");
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <UsersIcon className="h-5 w-5 text-primary" /> Users
          </h1>
          <p className="text-sm text-muted-foreground">
            All user accounts &amp; role configuration — System Administrator only
          </p>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="console" className="gap-1.5">
            <UsersIcon className="h-4 w-4" /> Console Users
          </TabsTrigger>
          <TabsTrigger value="barangay" className="gap-1.5">
            <Building2 className="h-4 w-4" /> Barangay Accounts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="console" className="mt-4">
          <ConsoleUsers session={session} />
        </TabsContent>
        <TabsContent value="barangay" className="mt-4">
          <BarangayAccounts />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1 — console accounts (role editing, password resets, enable/disable)
// ---------------------------------------------------------------------------
function ConsoleUsers({ session }: { session: SessionInfo }) {
  const { toast } = useToast();
  const { data, loading, error, reload } = useLoad<UsersResponse>(() => api.adminUsers(), "admin-users");

  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [resetUser, setResetUser] = useState<AdminUserRow | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<AdminUserRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUserRow | null>(null);

  const users = data?.users ?? [];
  const selfId = session.admin?.id;

  const toggleUser = async (user: AdminUserRow) => {
    setBusy(true);
    try {
      await api.adminUpdateUser(user.id, { active: !user.active });
      toast({
        title: user.active ? "User disabled" : "User enabled",
        description: `${user.name} (${user.username}) ${user.active ? "can no longer sign in" : "can sign in again"}.`,
      });
      reload();
    } catch (e) {
      toast({
        title: "Could not update user",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const deleteUser = async (user: AdminUserRow) => {
    setBusy(true);
    try {
      await api.adminDeleteUser(user.id);
      toast({ title: "User deleted", description: `${user.name} (${user.username}) was removed.` });
      setConfirmDelete(null);
      reload();
    } catch (e) {
      toast({
        title: "Could not delete user",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Console accounts and role assignments — changes are recorded in the audit trail
        </p>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Role / permission model reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Roles &amp; Permissions</CardTitle>
          <CardDescription>What each console role can do in QAS33.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 p-6 pt-3 sm:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r} className="rounded-lg border p-3">
              <RoleBadge role={r} />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{ADMIN_ROLE_META[r].description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Console Accounts</CardTitle>
          <CardDescription>
            {loading ? "Loading accounts…" : `${users.length} account${users.length === 1 ? "" : "s"} • role changes are recorded in the audit trail`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pb-3">
          {error ? (
            <div className="p-4">
              <ErrorAlert message={error} onRetry={reload} />
            </div>
          ) : loading ? (
            <div className="p-4">
              <TableSkeleton rows={4} cols={7} />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <UsersIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No console users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[820px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Username</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="pr-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isSelf = u.id === selfId;
                    const isDefault = u.username === "sysadmin";
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="pl-4 font-mono text-xs">{u.username}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5 font-medium">
                            {u.name}
                            {isSelf && (
                              <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                you
                              </span>
                            )}
                            {isDefault && (
                              <span className="rounded-full border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                Default
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.position ?? "—"}</TableCell>
                        <TableCell>
                          <RoleBadge role={u.role} />
                        </TableCell>
                        <TableCell>
                          {u.active ? (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              <ShieldCheck className="h-3.5 w-3.5" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-red-600">
                              <Ban className="h-3.5 w-3.5" /> Disabled
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                aria-label={`Actions for ${u.username}`}
                                disabled={busy}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onClick={() => setEditUser(u)}>
                                <Pencil className="h-4 w-4" /> Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setResetUser(u)}>
                                <KeyRound className="h-4 w-4" /> Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {isDefault && !isSelf ? (
                                <>
                                  <ProtectedAction
                                    icon={u.active ? Ban : CheckCircle2}
                                    label={u.active ? "Disable User" : "Enable User"}
                                    tooltip="The default System Administrator account is protected"
                                  />
                                  <ProtectedAction
                                    icon={Trash2}
                                    label="Delete User"
                                    tooltip="The default System Administrator account is protected"
                                  />
                                </>
                              ) : isSelf ? null : (
                                <>
                                  <DropdownMenuItem onClick={() => setConfirmToggle(u)}>
                                    {u.active ? (
                                      <Ban className="h-4 w-4" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4" />
                                    )}{" "}
                                    {u.active ? "Disable User" : "Enable User"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setConfirmDelete(u)}
                                  >
                                    <Trash2 className="h-4 w-4" /> Delete User
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- add user ---- */}
      {addOpen && (
        <AddUserDialog
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false);
            reload();
          }}
        />
      )}

      {/* ---- edit user (name, position, role, active) ---- */}
      {editUser && (
        <EditUserDialog
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => {
            setEditUser(null);
            reload();
          }}
        />
      )}

      {/* ---- reset password ---- */}
      {resetUser && (
        <ResetPasswordDialog
          user={resetUser}
          onClose={() => setResetUser(null)}
          onDone={() => {
            setResetUser(null);
            reload();
          }}
        />
      )}

      {/* ---- disable / enable confirm ---- */}
      <AlertDialog open={!!confirmToggle} onOpenChange={(open) => !open && !busy && setConfirmToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmToggle?.active ? "Disable this user?" : "Enable this user?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggle?.active
                ? `${confirmToggle.name} (${confirmToggle.username}) will lose access to the MDRRMO console until re-enabled.`
                : `${confirmToggle?.name} (${confirmToggle?.username}) will regain access to the MDRRMO console.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => {
                const user = confirmToggle;
                setConfirmToggle(null);
                if (user) void toggleUser(user);
              }}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmToggle?.active ? "Disable User" : "Enable User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---- delete confirm ---- */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && !busy && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" /> Delete this user?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.name} ({confirmDelete?.username}) will be permanently removed. This action cannot be
              undone. The default System Administrator account and your own account cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={busy}
              onClick={() => {
                const user = confirmDelete;
                if (user) void deleteUser(user);
              }}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add user dialog (mounted only while open so the form resets on close)
// ---------------------------------------------------------------------------
function AddUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("MDRRMO_STAFF");
  const [saving, setSaving] = useState(false);

  const valid = username.trim().length >= 3 && name.trim().length > 0 && password.length >= 8;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await api.adminCreateUser({
        username: username.trim(),
        name: name.trim(),
        position: position.trim() || undefined,
        password,
        role,
      });
      toast({
        title: "User created",
        description: `${name.trim()} (${username.trim()}) can now sign in as ${ADMIN_ROLE_META[role].label}.`,
      });
      onCreated();
    } catch (e) {
      toast({
        title: "Could not create user",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !saving && !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Add Console User
          </DialogTitle>
          <DialogDescription>
            Create an account for the MDRRMO console. Username must be 3+ characters, password 8+.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="nu-username">Username</Label>
            <Input
              id="nu-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., mdrrmo2"
              autoComplete="off"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-name">Full name</Label>
            <Input id="nu-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Maria D. Santos" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-position">Position</Label>
            <Input
              id="nu-position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g., DRRM Staff"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-password">Password</Label>
            <Input
              id="nu-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-[11px] text-muted-foreground">Minimum 8 characters.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(normalizeAdminRole(v))}>
              <SelectTrigger id="nu-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ADMIN_ROLE_META[r].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid || saving} onClick={() => void submit()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit user dialog — name, position, ROLE and active flag
// ---------------------------------------------------------------------------
function EditUserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(user.name);
  const [position, setPosition] = useState(user.position ?? "");
  const [role, setRole] = useState<AdminRole>(normalizeAdminRole(user.role));
  const [active, setActive] = useState(user.active);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      toast({ title: "Full name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await api.adminUpdateUser(user.id, {
        name: name.trim(),
        position: position.trim(),
        role,
        active,
      });
      toast({
        title: "User updated",
        description: `${user.username} — changes saved and audit-logged.`,
      });
      onSaved();
    } catch (e) {
      toast({
        title: "Could not update user",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !saving && !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" /> Edit User
          </DialogTitle>
          <DialogDescription>
            Update <span className="font-mono text-xs">{user.username}</span>
            {user.position ? ` — ${user.position}` : ""}. Role changes are recorded in the audit trail.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="eu-name">Full name</Label>
            <Input id="eu-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eu-position">Position</Label>
            <Input
              id="eu-position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g., Municipal DRRM Officer"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eu-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(normalizeAdminRole(v))}>
              <SelectTrigger id="eu-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ADMIN_ROLE_META[r].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">{ADMIN_ROLE_META[role].description}</p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
            <div>
              <Label htmlFor="eu-active" className="text-sm font-medium">
                Active
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Disabled accounts cannot sign in to the console.
              </p>
            </div>
            <Switch id="eu-active" checked={active} onCheckedChange={setActive} disabled={saving} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void submit()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Reset password dialog
// ---------------------------------------------------------------------------
function ResetPasswordDialog({
  user,
  onClose,
  onDone,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const valid = password.length >= 8;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const res = await api.adminUpdateUser(user.id, { password });
      toast({
        title: "Password updated",
        description: res.message ?? `${user.username} must use the new password on next sign-in.`,
      });
      onDone();
    } catch (e) {
      toast({
        title: "Could not reset password",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !saving && !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Reset Password
          </DialogTitle>
          <DialogDescription>
            Set a new password for <span className="font-medium">{user.name}</span> (
            <span className="font-mono text-xs">{user.username}</span>). Active sessions for this account are revoked.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="rp-password">New password</Label>
          <Input
            id="rp-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            aria-invalid={!valid && password.length > 0}
          />
          <p className="text-[11px] text-muted-foreground">Minimum 8 characters.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid || saving} onClick={() => void submit()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Tab 2 — barangay accounts (33 login accounts: access PIN lifecycle)
// ---------------------------------------------------------------------------
type BarangayRowsResponse = Awaited<ReturnType<typeof api.adminBarangays>>;
type BarangayAccountRow = BarangayRowsResponse["barangays"][number];

function isLocked(lockedUntil: string | null | undefined): boolean {
  return Boolean(lockedUntil && new Date(lockedUntil).getTime() > Date.now());
}

function BarangayAccounts() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useLoad<BarangayRowsResponse>(() => api.adminBarangays("", "ALL"), "barangay-accounts");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tempPin, setTempPin] = useState<{ pin: string; barangay: string; code: string } | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<BarangayAccountRow | null>(null);

  const rows = data?.barangays ?? [];
  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || (r.captain ?? "").toLowerCase().includes(q))
    : rows;
  const pb = (r: BarangayAccountRow) => r.officials.find((o) => o.position === "PUNONG_BARANGAY")?.name ?? r.captain ?? "—";

  async function runAction(row: BarangayAccountRow, action: string, successTitle: string, successBody?: string) {
    setBusyId(row.id);
    try {
      const res = await api.adminBarangayAction(row.id, action);
      if (action === "reset-pin" && res.tempPin) {
        setTempPin({ pin: res.tempPin, barangay: row.name, code: row.code });
      } else {
        toast({ title: successTitle, description: successBody ?? `Barangay ${row.name} — done.` });
      }
      reload();
    } catch (e) {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Barangay Login Accounts</CardTitle>
          <CardDescription>
            {loading
              ? "Loading accounts…"
              : `${rows.length} barangay accounts • barangays sign in with their code + Access PIN — roles do not apply to these accounts`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3">
            <div className="relative min-w-0 flex-1 sm:max-w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                placeholder="Search barangay or captain…"
                className="pl-8"
                aria-label="Search barangay accounts"
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {error ? (
            <div className="px-4">
              <ErrorAlert message={error} onRetry={reload} />
            </div>
          ) : loading ? (
            <div className="px-4">
              <TableSkeleton rows={6} cols={7} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No barangay accounts match &ldquo;{search}&rdquo;.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[920px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Barangay</TableHead>
                    <TableHead>Punong Barangay</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Access PIN</TableHead>
                    <TableHead>Lockout</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="pr-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const locked = isLocked(r.credential?.lockedUntil);
                    const pinActive = r.credential?.active ?? false;
                    const busy = busyId === r.id;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="pl-4">
                          <div className="font-medium">{r.name}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">{r.code}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{pb(r)}</TableCell>
                        <TableCell>
                          {r.active ? (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              <ShieldCheck className="h-3.5 w-3.5" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-red-600">
                              <Ban className="h-3.5 w-3.5" /> Disabled
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {!r.credential ? (
                            <span className="text-xs text-muted-foreground">No PIN</span>
                          ) : pinActive ? (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              <KeyRound className="h-3.5 w-3.5" />
                              {r.credential.mustChangePin ? "Temp PIN pending" : "Active"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-red-600">
                              <Ban className="h-3.5 w-3.5" /> Revoked
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {locked ? (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-red-600">
                              <Lock className="h-3.5 w-3.5" /> Locked
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">OK</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {r.credential?.lastLoginAt ? formatDateTime(r.credential.lastLoginAt) : "Never"}
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Actions for ${r.name}`} disabled={busy}>
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onClick={() => void runAction(r, "reset-pin", "Temporary PIN issued")}>
                                <KeyRound className="h-4 w-4" /> Reset PIN
                              </DropdownMenuItem>
                              {locked && (
                                <DropdownMenuItem onClick={() => void runAction(r, "clear-lock", "Lockout cleared")}>
                                  <LockOpen className="h-4 w-4" /> Clear Lockout
                                </DropdownMenuItem>
                              )}
                              {r.credential && pinActive ? (
                                <DropdownMenuItem onClick={() => void runAction(r, "revoke-pin", "Access PIN revoked")}>
                                  <Ban className="h-4 w-4" /> Revoke PIN
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => void runAction(r, "activate-pin", "Access PIN re-activated")}>
                                  <CheckCircle2 className="h-4 w-4" /> Re-activate PIN
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setConfirmToggle(r)}>
                                {r.active ? (
                                  <>
                                    <Ban className="h-4 w-4" /> Disable Account
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4" /> Enable Account
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* One-time temporary PIN dialog */}
      <Dialog open={Boolean(tempPin)} onOpenChange={(next) => !next && setTempPin(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> One-Time Temporary PIN
            </DialogTitle>
            <DialogDescription>
              {tempPin && (
                <>
                  New temporary PIN for <span className="font-semibold">{tempPin.barangay}</span> ({tempPin.code}). Share
                  it securely — the barangay must change it on first login, and it will not be shown again.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {tempPin && (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/40 p-4">
              <span className="select-all font-mono text-2xl font-bold tracking-widest">{tempPin.pin}</span>
              <CopyButton value={tempPin.pin} label="Copy" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTempPin(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enable / disable confirmation */}
      <AlertDialog open={Boolean(confirmToggle)} onOpenChange={(next) => !next && setConfirmToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmToggle?.active ? "Disable this account?" : "Enable this account?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggle?.active
                ? `Barangay ${confirmToggle?.name} will not be able to sign in until the account is re-enabled.`
                : `Barangay ${confirmToggle?.name} will be able to sign in again with their Access PIN.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmToggle) {
                  const row = confirmToggle;
                  setConfirmToggle(null);
                  void runAction(
                    row,
                    "toggle-active",
                    row.active ? "Account disabled" : "Account enabled",
                    `Barangay ${row.name} — ${row.active ? "can no longer sign in" : "can sign in again"}.`
                  );
                }
              }}
            >
              {confirmToggle?.active ? "Disable Account" : "Enable Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
