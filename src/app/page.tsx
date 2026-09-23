"use client";

// QAS33 – BDRRMP System — single-page application shell
// The public sees the landing page; logged-in barangays and MDRRMO staff
// get their respective application consoles (client-side view switching).

import { useCallback, useEffect, useState } from "react";
import Landing from "@/components/qas33/landing";
import BarangayApp from "@/components/qas33/barangay-app";
import MdrrmoApp from "@/components/qas33/mdrrmo-app";
import { api } from "@/lib/qas33/api";
import type { SessionInfo } from "@/lib/qas33/types";

export default function Home() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyDocId, setVerifyDocId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Read ?verify=DOCID for QR-code verification links (post-hydration)
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const params = new URLSearchParams(window.location.search);
        const v = params.get("verify");
        if (v) setVerifyDocId(v.trim());
      } catch {
        // ignore
      }
    });
    // Restore session on load / refresh
    api
      .me()
      .then((res) => {
        if (!cancelled) setSession(res.session);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAuth = useCallback((s: SessionInfo | null) => {
    setSession(s);
  }, []);

  const handleLogout = useCallback(() => {
    api
      .logout()
      .catch(() => undefined)
      .finally(() => {
        setSession(null);
        // Clear the verify param so the user returns to a clean landing page
        try {
          window.history.replaceState({}, "", "/");
        } catch {
          // ignore
        }
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-6 w-6 text-primary-foreground"
            >
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight">QAS33</div>
            <div className="text-xs text-muted-foreground">BDRRMP Monitoring System</div>
          </div>
        </div>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
        <p className="text-xs text-muted-foreground">Municipality of Pio Duran — MDRRMO</p>
      </div>
    );
  }

  // QR verification links (?verify=DOCID) always show the public verification
  // view — even for signed-in users — with a way back to their console.
  if (verifyDocId && session) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="bg-primary text-primary-foreground px-4 py-2 text-center text-sm">
          You are signed in as{" "}
          <strong>
            {session.role === "ADMIN"
              ? `${session.admin?.name ?? "MDRRMO"} (MDRRMO)`
              : `Barangay ${session.barangay?.name ?? ""}`}
          </strong>
          .{" "}
          <button
            className="underline underline-offset-2 font-medium cursor-pointer"
            onClick={() => {
              setVerifyDocId(null);
              try {
                window.history.replaceState({}, "", "/");
              } catch {
                // ignore
              }
            }}
          >
            Return to your console
          </button>
        </div>
        <div className="flex-1">
          <Landing initialVerifyDocId={verifyDocId} onAuth={handleAuth} />
        </div>
      </div>
    );
  }

  if (session?.role === "BARANGAY") {
    return <BarangayApp session={session} onLogout={handleLogout} />;
  }

  if (session?.role === "ADMIN") {
    return <MdrrmoApp session={session} onLogout={handleLogout} />;
  }

  return <Landing initialVerifyDocId={verifyDocId} onAuth={handleAuth} />;
}
