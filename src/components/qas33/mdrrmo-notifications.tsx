"use client";

// MDRRMO Console — Notifications center
import { useState } from "react";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Download,
  FileSignature,
  Info,
  MessageSquare,
  RefreshCw,
  Send,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api, formatDateTime } from "@/lib/qas33/api";
import type { NotificationItem } from "@/lib/qas33/types";
import { cn } from "@/lib/utils";
import { ErrorAlert, useLoad } from "./mdrrmo-shared";

type NotificationsData = Awaited<ReturnType<typeof api.adminNotifications>>;

const TYPE_META: Record<string, { icon: typeof Bell; cls: string }> = {
  SUBMITTED: { icon: Send, cls: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400" },
  RESUBMITTED: { icon: RefreshCw, cls: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-400" },
  REVISION: { icon: AlertTriangle, cls: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400" },
  COMMENT: { icon: MessageSquare, cls: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400" },
  APPROVED: { icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
  FINALIZED: { icon: FileSignature, cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
  DOWNLOAD: { icon: Download, cls: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400" },
  SYSTEM: { icon: Info, cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

export default function MdrrmoNotifications({ onRead }: {
  /** Called after marking read so the header bell count refreshes */
  onRead?: () => void;
}) {
  const { toast } = useToast();
  const { data, loading, error, reload } = useLoad<NotificationsData>(() => api.adminNotifications());
  const [busy, setBusy] = useState(false);

  const markAll = async () => {
    setBusy(true);
    try {
      await api.adminMarkNotificationsRead();
      toast({ title: "All notifications marked as read" });
      reload();
      onRead?.();
    } catch (e) {
      toast({
        title: "Failed to update notifications",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const notifications = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "You are all caught up"}
          </p>
        </div>
        <Button variant="outline" disabled={busy || unread === 0} onClick={() => void markAll()}>
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inbox</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-3">
          {error ? (
            <div className="p-4">
              <ErrorAlert message={error} onRetry={reload} />
            </div>
          ) : loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <p className="px-4 pb-2 text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="max-h-[65vh] divide-y overflow-y-auto">
              {notifications.map((n) => (
                <NotificationRow key={n.id} item={n} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const meta = TYPE_META[item.type] ?? { icon: Bell, cls: "bg-muted text-muted-foreground" };
  const Icon = meta.icon;
  return (
    <li className={cn("flex items-start gap-3 px-4 py-3", !item.read && "bg-primary/5")}>
      <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", meta.cls)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{item.title}</span>
          {!item.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="unread" />}
        </div>
        {item.body && <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>}
        <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(item.createdAt)}</p>
      </div>
    </li>
  );
}
