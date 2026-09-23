"use client";

// MDRRMO Console — Admin user management (from /api/admin/settings)
import { useState } from "react";
import { Ban, MoreHorizontal, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api, formatDateTime } from "@/lib/qas33/api";
import type { SessionInfo } from "@/lib/qas33/types";
import { cn } from "@/lib/utils";
import { ErrorAlert, TableSkeleton, useLoad } from "./mdrrmo-shared";

type SettingsData = Awaited<ReturnType<typeof api.adminSettings>>;
type AdminUserRow = SettingsData["users"][number];

export default function MdrrmoUsers({ session }: { session: SessionInfo }) {
  const { toast } = useToast();
  const { data, loading, error, reload } = useLoad<SettingsData>(() => api.adminSettings());
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<AdminUserRow | null>(null);

  const toggleUser = async (user: AdminUserRow) => {
    setBusy(true);
    try {
      await api.adminSaveSettings({ toggleUser: user.id });
      toast({ title: user.active ? `User '${user.username}' disabled` : `User '${user.username}' enabled` });
      reload();
    } catch (e) {
      toast({
        title: "Failed to update user",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const users = data?.users ?? [];
  const selfId = session.admin?.id;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">MDRRMO console accounts and their access</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Console Accounts</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-3">
          {error ? (
            <div className="p-4">
              <ErrorAlert message={error} onRetry={reload} />
            </div>
          ) : loading ? (
            <div className="p-4">
              <TableSkeleton rows={4} cols={5} />
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
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
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="pl-4 font-mono text-xs">{u.username}</TableCell>
                      <TableCell className="font-medium">
                        {u.name}
                        {u.id === selfId && <span className="ml-2 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">you</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.position ?? "—"}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            u.role === "SYSTEM_ADMIN"
                              ? "border-slate-300 bg-slate-100 text-slate-700"
                              : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                          )}
                        >
                          {u.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        {u.active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            <ShieldCheck className="h-3.5 w-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <Ban className="h-3.5 w-3.5" /> Disabled
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</TableCell>
                      <TableCell className="pr-4 text-right">
                        {u.id === selfId ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={`Actions for ${u.username}`} disabled={busy}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setConfirmToggle(u)}>
                                <Ban className="h-4 w-4" /> {u.active ? "Disable User" : "Enable User"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add user dialog */}
      <AddUserDialog
        open={addOpen}
        busy={busy}
        onOpenChange={setAddOpen}
        onCreated={async () => {
          setAddOpen(false);
          reload();
        }}
      />

      {/* Toggle confirm */}
      <AlertDialog open={!!confirmToggle} onOpenChange={(open) => !open && setConfirmToggle(null)}>
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const user = confirmToggle;
                setConfirmToggle(null);
                if (user) void toggleUser(user);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddUserDialog({
  open,
  busy,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("MDRRMO_ADMIN");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api.adminSaveSettings({
        newUser: { username: username.trim(), name: name.trim(), position: position.trim(), password, role },
      });
      toast({ title: "User created", description: `${name || username} can now sign in to the console.` });
      setUsername("");
      setName("");
      setPosition("");
      setPassword("");
      setRole("MDRRMO_ADMIN");
      await onCreated();
    } catch (e) {
      toast({
        title: "Could not create user",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const valid = username.trim().length >= 3 && password.length >= 8 && name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Add Console User
          </DialogTitle>
          <DialogDescription>Create an account for MDRRMO staff. Username must be 3+ characters, password 8+.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="nu-username">Username</Label>
            <Input id="nu-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g., mdrrmo2" autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-name">Full name</Label>
            <Input id="nu-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Maria D. Santos" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-position">Position</Label>
            <Input id="nu-position" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g., DRRM Staff" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-password">Password</Label>
            <Input id="nu-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nu-role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="nu-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MDRRMO_ADMIN">MDRRMO Admin</SelectItem>
                <SelectItem value="SYSTEM_ADMIN">System Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving || busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || saving || busy} onClick={() => void submit()}>
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
