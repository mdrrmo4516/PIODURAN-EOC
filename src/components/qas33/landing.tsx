"use client";

// QAS33 – BDRRMP public landing page
// Municipality of Pio Duran, MDRRMO — Province of Albay, Philippines

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  Copy,
  Download,
  Eye,
  FileCheck,
  FileClock,
  FileSearch,
  FileText,
  Info,
  KeyRound,
  Landmark,
  Loader2,
  Lock,
  LogIn,
  MessageSquareWarning,
  MousePointerClick,
  Send,
  ShieldCheck,
  UserRound,
  Zap,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api, formatDateTime } from "@/lib/qas33/api";
import type { SessionInfo } from "@/lib/qas33/types";
import { useToast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type VerifyResult = Awaited<ReturnType<typeof api.verify>>;

const CONTAINER = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

const EXAMPLE_DOC_ID = "QAS33-BDRRMP-26-006-V2";

const HERO_GRID_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg width='56' height='56' viewBox='0 0 56 56' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='1'%3E%3Cpath d='M0 .5h56M.5 0v56'/%3E%3C/g%3E%3C/svg%3E\")";

const HERO_STATS = [
  { value: "33", label: "Barangays Connected" },
  { value: "2026", label: "BDRRMP Planning Cycle" },
  { value: "12", label: "Stage Tracking" },
  { value: "QR", label: "Verified Documents" },
] as const;

const STEPS = [
  {
    icon: LogIn,
    title: "Login & Select Template",
    description: "Sign in with your barangay code and choose the English or Tagalog BDRRMP template.",
  },
  {
    icon: FileText,
    title: "Fill Out & Upload",
    description: "Complete the plan sections and upload the required barangay attachments.",
  },
  {
    icon: FileCheck,
    title: "Validate & Preview",
    description: "The system checks completeness; preview the whole plan before submitting.",
  },
  {
    icon: Send,
    title: "Submit for Review",
    description: "Submit to the MDRRMO with Punong Barangay certification.",
  },
  {
    icon: MessageSquareWarning,
    title: "Revise per Comments",
    description: "Address MDRRMO review comments section by section, then resubmit.",
  },
  {
    icon: Download,
    title: "Download Signed BDRRMP",
    description: "Download the final, MDRRMO-signed plan — QR-verified and tamper-evident.",
  },
] as const;

const FEATURES = [
  {
    icon: Zap,
    title: "Faster",
    description: "Digital submission and automated tracking cut processing from weeks to days.",
  },
  {
    icon: MousePointerClick,
    title: "Simpler",
    description: "Guided English & Tagalog forms with built-in validation — nothing to retype.",
  },
  {
    icon: Eye,
    title: "Transparent",
    description: "Real-time status and visible review comments for every barangay, at every stage.",
  },
  {
    icon: FileClock,
    title: "Accountable",
    description: "Full audit trail, versioned submissions, and QR-verified signed documents.",
  },
] as const;

const DEMO_ACCOUNTS = [
  {
    label: "Barangay — final document ready",
    note: "Buenavista: approved plan, signed QR-verified PDF ready for download",
    user: "PD-BRG-006",
    secret: "QAS33-006",
    secretLabel: "PIN",
  },
  {
    label: "Barangay — needs revision",
    note: "Baliana: returned by MDRRMO with review comments to address",
    user: "PD-BRG-004",
    secret: "QAS33-004",
    secretLabel: "PIN",
  },
  {
    label: "MDRRMO Admin",
    note: "Full review, tracking, rating, and monitoring dashboard",
    user: "mdrrmo",
    secret: "PioDuran2026!",
    secretLabel: "Password",
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path below
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function errMsg(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="mx-auto max-w-2xl text-center"
    >
      <div className="text-xs font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</div>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h2>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
      ) : null}
    </motion.div>
  );
}

function CopyValue({ value, label }: { value: string; label: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      toast({ title: "Copied to clipboard", description: value });
      window.setTimeout(() => setCopied(false), 1500);
    } else {
      toast({
        title: "Copy failed",
        description: `${label}: ${value} — please copy it manually.`,
        variant: "destructive",
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy ${label}: ${value}`}
      className="group inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
    >
      <span>{value}</span>
      {copied ? (
        <Check className="size-3.5 text-green-600" />
      ) : (
        <Copy className="size-3.5 opacity-60 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Landing page (default export)
// ---------------------------------------------------------------------------

export default function Landing({
  initialVerifyDocId,
  onAuth,
}: {
  initialVerifyDocId?: string | null;
  onAuth: (session: SessionInfo) => void;
}) {
  const [brgyOpen, setBrgyOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const scrollToVerify = useCallback(() => {
    document.getElementById("verify")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Government identity strip */}
      <div className="bg-emerald-950 text-emerald-100/70">
        <div
          className={`${CONTAINER} flex items-center justify-center gap-1.5 py-1.5 text-center text-[10px] font-medium uppercase tracking-[0.16em] sm:text-[11px]`}
        >
          <Landmark className="hidden size-3.5 shrink-0 text-emerald-300/60 sm:block" />
          <span>
            Republic of the Philippines <span className="mx-1 text-emerald-400/50">•</span> Province
            of Albay <span className="mx-1 text-emerald-400/50">•</span> Municipality of Pio Duran{" "}
            <span className="mx-1 text-emerald-400/50">•</span> MDRRMO
          </span>
        </div>
      </div>

      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className={`${CONTAINER} flex h-16 items-center justify-between gap-3`}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="size-5" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="text-lg font-bold tracking-tight">QAS33</div>
              <div className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                BDRRMP Monitoring System
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={scrollToVerify} className="gap-1.5">
            <FileSearch className="size-4" />
            <span className="hidden sm:inline">Verify Document</span>
            <span className="sm:hidden">Verify</span>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <Hero
          onBarangayLogin={() => setBrgyOpen(true)}
          onAdminLogin={() => setAdminOpen(true)}
          onVerify={scrollToVerify}
        />
        <HowItWorks />
        <FeatureStrip />
        <VerifySection initialDocId={initialVerifyDocId} />
        <DemoAccounts />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-emerald-900/40 bg-emerald-950 text-emerald-100">
        <div className={`${CONTAINER} flex flex-col items-center gap-2.5 py-9 text-center`}>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-md bg-emerald-800 text-emerald-100">
              <ShieldCheck className="size-4" />
            </span>
            QAS33 – BDRRMP System
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-emerald-100/70 sm:text-sm">
            Municipality of Pio Duran, Province of Albay — Municipal Disaster Risk Reduction and
            Management Office
          </p>
          <Separator className="max-w-xs bg-emerald-800/60" />
          <p className="text-[11px] text-emerald-200/50">
            © 2026 MDRRMO Pio Duran. Faster. Simpler. Transparent.
          </p>
        </div>
      </footer>

      <BarangayLoginDialog open={brgyOpen} onOpenChange={setBrgyOpen} onAuth={onAuth} />
      <AdminLoginDialog open={adminOpen} onOpenChange={setAdminOpen} onAuth={onAuth} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero({
  onBarangayLogin,
  onAdminLogin,
  onVerify,
}: {
  onBarangayLogin: () => void;
  onAdminLogin: () => void;
  onVerify: () => void;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-700 text-white">
      {/* subtle grid pattern + glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: HERO_GRID_PATTERN }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-emerald-400/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-teal-300/10 blur-3xl"
      />

      <div className={`${CONTAINER} relative py-16 sm:py-20 lg:py-24`}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-900/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
            <Landmark className="size-3.5" />
            Municipality of Pio Duran — MDRRMO
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            QAS33 <span className="text-emerald-300">–</span> BDRRMP
          </h1>

          <p className="mt-4 max-w-2xl text-lg font-medium leading-snug text-emerald-50 sm:text-xl">
            Barangay DRRM Plan Review, Tracking, Submission &amp; Management System
          </p>

          <blockquote className="mt-5 max-w-2xl border-l-2 border-emerald-300/50 pl-4 text-sm italic leading-relaxed text-emerald-100/85 sm:text-base">
            &ldquo;Connecting the 33 Barangays of Pio Duran with the MDRRMO through faster, simpler,
            transparent, and accountable digital transactions.&rdquo;
          </blockquote>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={onBarangayLogin}
              className="h-12 gap-2 bg-white px-7 text-base font-semibold text-emerald-900 shadow-lg shadow-emerald-950/25 hover:bg-emerald-50"
            >
              <LogIn className="size-5" />
              Barangay Login
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onAdminLogin}
              className="h-12 gap-2 border-emerald-200/40 bg-white/5 px-7 text-base font-semibold text-white backdrop-blur hover:bg-white/15 hover:text-white"
            >
              <ShieldCheck className="size-5" />
              MDRRMO Login
            </Button>
          </div>

          <button
            type="button"
            onClick={onVerify}
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-200/80 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            <FileSearch className="size-3.5" />
            Verify a signed BDRRMP document (QR)
          </button>
        </motion.div>

        {/* Stats */}
        <motion.dl
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15, ease: "easeOut" }}
          className="relative mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/10 sm:grid-cols-4"
        >
          {HERO_STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col bg-emerald-950/50 px-4 py-4 text-center sm:py-5"
            >
              <dd className="order-1 text-2xl font-bold text-white sm:text-3xl">{stat.value}</dd>
              <dt className="order-2 mt-1 text-[11px] font-medium uppercase tracking-wider text-emerald-200/80">
                {stat.label}
              </dt>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// How it works
// ---------------------------------------------------------------------------

function HowItWorks() {
  return (
    <section className="bg-muted/40 py-16 sm:py-20">
      <div className={CONTAINER}>
        <SectionHeading
          eyebrow="The Process"
          title="How It Works"
          description="From template selection to a signed, QR-verified plan — six clear steps for every barangay of Pio Duran."
        />
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {STEPS.map((step, i) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
            >
              <Card className="h-full gap-0 py-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-3 px-5">
                  <div className="flex items-start justify-between">
                    <div className="flex size-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
                      <step.icon className="size-5" />
                    </div>
                    <span className="text-3xl font-bold leading-none text-emerald-900/10">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold leading-snug">{step.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Features strip
// ---------------------------------------------------------------------------

function FeatureStrip() {
  return (
    <section className="py-16 sm:py-20">
      <div className={CONTAINER}>
        <SectionHeading
          eyebrow="The QAS33 Promise"
          title="Faster. Simpler. Transparent. Accountable."
          description="One system for the 2026 BDRRMP cycle — built for barangays and the MDRRMO to work together."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
            >
              <Card className="h-full gap-0 py-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-3 px-5">
                  <div className="flex size-10 items-center justify-center rounded-lg border border-amber-200 bg-amber-100 text-amber-700">
                    <feature.icon className="size-5" />
                  </div>
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Verify a document
// ---------------------------------------------------------------------------

function VerifySection({ initialDocId }: { initialDocId?: string | null }) {
  const { toast } = useToast();
  const [docId, setDocId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  const runVerify = useCallback(
    async (rawId: string) => {
      const id = rawId.trim();
      if (!id) {
        toast({
          title: "Enter a Document ID",
          description: "Type the Document ID printed on the signed BDRRMP (e.g. QAS33-BDRRMP-26-006-V2).",
          variant: "destructive",
        });
        return;
      }
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const res = await api.verify(id);
        if (res.valid) {
          setResult(res);
        } else {
          setError(res.error || "Document not found or not valid.");
        }
      } catch (err) {
        setError(errMsg(err, "Verification failed. Please try again."));
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Auto-run verification once when arriving via a QR link (/?verify=<docId>)
  useEffect(() => {
    if (initialDocId && initialDocId.trim() && !autoRan.current) {
      autoRan.current = true;
      setDocId(initialDocId.trim());
      void runVerify(initialDocId.trim());
      // Bring the verification result into view when arriving via a QR link
      window.setTimeout(() => {
        document.getElementById("verify")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 350);
    }
  }, [initialDocId, runVerify]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void runVerify(docId);
  };

  return (
    <section id="verify" className="scroll-mt-20 bg-muted/40 py-16 sm:py-20">
      <div className={CONTAINER}>
        <SectionHeading
          eyebrow="Public Service"
          title="Verify a Document"
          description="Scan the QR code on a signed BDRRMP or enter its Document ID below to confirm its authenticity — no account needed."
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="mx-auto mt-10 max-w-2xl"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSearch className="size-5 text-primary" />
                Document Verification
              </CardTitle>
              <CardDescription>
                Enter the Document ID printed on the signed BDRRMP or embedded in its QR code.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  placeholder="Enter Document ID (e.g. QAS33-BDRRMP-26-006-V2)"
                  className="h-11 font-mono text-sm"
                  aria-label="Document ID"
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 gap-2 font-semibold sm:w-36"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <BadgeCheck className="size-4" />
                  )}
                  {loading ? "Verifying…" : "Verify"}
                </Button>
              </form>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDocId(EXAMPLE_DOC_ID);
                    void runVerify(EXAMPLE_DOC_ID);
                  }}
                  className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
                >
                  Try a sample ID: {EXAMPLE_DOC_ID}
                </button>
                {loading ? (
                  <span className="text-xs text-muted-foreground">Checking official records…</span>
                ) : null}
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertTriangle />
                  <AlertTitle>Verification Failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              {result && result.valid ? <VerifySuccessCard result={result} /> : null}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

function VerifyDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-green-800/70">
        {label}
      </dt>
      <dd className="truncate text-sm font-medium text-green-950" title={value}>
        {value}
      </dd>
    </div>
  );
}

function VerifySuccessCard({ result }: { result: VerifyResult }) {
  return (
    <div className="overflow-hidden rounded-xl border border-green-300 bg-green-50">
      <div className="flex flex-wrap items-center gap-3 border-b border-green-200 bg-green-100/60 px-4 py-3 sm:px-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
          <BadgeCheck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-green-800">
            QAS33 Document Verification
          </div>
          <div className="truncate font-mono text-sm font-semibold text-green-900">
            {result.docId}
          </div>
        </div>
        <Badge className="border-transparent bg-green-600 text-white">
          {result.status || "VALID — APPROVED"}
        </Badge>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-4 py-4 sm:grid-cols-3 sm:px-5">
        <VerifyDetail label="Document" value={result.document || "—"} />
        <VerifyDetail label="Barangay" value={result.barangay || "—"} />
        <VerifyDetail label="Year" value={result.year ? String(result.year) : "—"} />
        <VerifyDetail label="Version" value={result.version ? `V${result.version}` : "—"} />
        <div className="flex min-w-0 flex-col gap-1">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-green-800/70">
            Status
          </dt>
          <dd>
            <Badge className="border-transparent bg-green-600 text-white">
              {result.status || "VALID — APPROVED"}
            </Badge>
          </dd>
        </div>
        <VerifyDetail label="Signed By" value={result.signedBy || "—"} />
        <VerifyDetail label="Date Signed" value={formatDateTime(result.signedAt ?? null)} />
        <VerifyDetail label="Generated" value={formatDateTime(result.generatedAt ?? null)} />
        <VerifyDetail
          label="Downloads"
          value={result.downloadCount != null ? String(result.downloadCount) : "—"}
        />
      </dl>
      <div className="border-t border-green-200 bg-green-100/40 px-4 py-2.5 text-[11px] leading-relaxed text-green-800/80 sm:px-5">
        This document was generated and signed by the MDRRMO of Pio Duran. The signature and QR code
        on the PDF match the official record above.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo accounts (collapsible)
// ---------------------------------------------------------------------------

function DemoAccounts() {
  return (
    <section className="py-12 sm:py-14">
      <div className={CONTAINER}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mx-auto max-w-2xl"
        >
          <Card className="border-dashed bg-muted/20 py-4">
            <CardContent className="px-4 sm:px-6">
              <Accordion type="single" collapsible>
                <AccordionItem value="demo-accounts" className="border-none">
                  <AccordionTrigger className="py-2 text-sm font-semibold text-muted-foreground hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Info className="size-4 text-amber-600" />
                      Demonstration Accounts
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <div className="flex flex-col gap-2.5">
                      {DEMO_ACCOUNTS.map((account) => (
                        <div
                          key={account.user}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2.5"
                        >
                          <div className="flex min-w-0 flex-col">
                            <span className="text-sm font-medium">{account.label}</span>
                            <span className="text-xs text-muted-foreground">{account.note}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <CopyValue label="Code" value={account.user} />
                            <CopyValue label={account.secretLabel} value={account.secret} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      These accounts are for demonstration and evaluation of the QAS33 system only.
                      Official barangay credentials are issued by the MDRRMO of Pio Duran.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Barangay login dialog (with forced PIN change)
// ---------------------------------------------------------------------------

function BarangayLoginDialog({
  open,
  onOpenChange,
  onAuth,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuth: (session: SessionInfo) => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<"login" | "change-pin">("login");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset the flow whenever the dialog is (re)opened
  useEffect(() => {
    if (open) {
      setStep("login");
      setCode("");
      setPin("");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setLoading(false);
    }
  }, [open]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    if (!code.trim() || !pin) {
      toast({
        title: "Incomplete credentials",
        description: "Enter both your Barangay Code and Access PIN.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      await api.loginBarangay(code.trim(), pin);
      const { session } = await api.me();
      if (!session) {
        toast({
          title: "Login failed",
          description: "No active session was created. Please try again.",
          variant: "destructive",
        });
        return;
      }
      if (session.mustChangePin) {
        setStep("change-pin");
        setPin("");
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
        toast({
          title: "Security check required",
          description: "You must change your temporary PIN before continuing.",
        });
        return;
      }
      onAuth(session);
    } catch (err) {
      toast({
        title: "Login failed",
        description: errMsg(err, "Unable to sign in. Please check your credentials."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    if (!currentPin || !newPin || !confirmPin) {
      toast({
        title: "Incomplete form",
        description: "Fill in all three PIN fields to continue.",
        variant: "destructive",
      });
      return;
    }
    if (newPin.length < 6) {
      toast({
        title: "PIN too short",
        description: "Your new PIN must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    if (newPin !== confirmPin) {
      toast({
        title: "PINs do not match",
        description: "New PIN and Confirm New PIN must be identical.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      await api.changePin(currentPin, newPin, confirmPin);
      toast({ title: "PIN changed", description: "Your new PIN is now active." });
      const { session } = await api.me();
      if (!session) {
        toast({
          title: "Session expired",
          description: "Please sign in again with your new PIN.",
          variant: "destructive",
        });
        return;
      }
      onAuth(session);
    } catch (err) {
      toast({
        title: "PIN change failed",
        description: errMsg(err, "Unable to change PIN. Please try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "login" ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <LogIn className="size-4" />
                </span>
                Barangay Login
              </DialogTitle>
              <DialogDescription>
                Sign in with your barangay code and access PIN issued by the MDRRMO.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="brgy-code">Barangay Code</Label>
                <Input
                  id="brgy-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="PD-BRG-014"
                  autoComplete="username"
                  className="font-mono"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="brgy-pin">Access PIN</Label>
                <Input
                  id="brgy-pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button type="submit" disabled={loading} className="w-full gap-2 font-semibold">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                {loading ? "Signing in…" : "Sign In as Barangay"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Lost or locked out? Contact the MDRRMO of Pio Duran to reset your PIN.
              </p>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleChangePin} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <KeyRound className="size-4" />
                </span>
                Change Your PIN
              </DialogTitle>
              <DialogDescription>
                For security, you must change your temporary PIN before continuing.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="current-pin">Current (Temporary) PIN</Label>
                <Input
                  id="current-pin"
                  type="password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-pin">New PIN</Label>
                <Input
                  id="new-pin"
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm-pin">Confirm New PIN</Label>
                <Input
                  id="confirm-pin"
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Repeat your new PIN"
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full gap-2 font-semibold">
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}
                {loading ? "Saving…" : "Save New PIN & Continue"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// MDRRMO admin login dialog
// ---------------------------------------------------------------------------

function AdminLoginDialog({
  open,
  onOpenChange,
  onAuth,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuth: (session: SessionInfo) => void;
}) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setUsername("");
      setPassword("");
      setLoading(false);
    }
  }, [open]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    if (!username.trim() || !password) {
      toast({
        title: "Incomplete credentials",
        description: "Enter both your username and password.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      await api.loginAdmin(username.trim(), password);
      const { session } = await api.me();
      if (!session) {
        toast({
          title: "Login failed",
          description: "No active session was created. Please try again.",
          variant: "destructive",
        });
        return;
      }
      onAuth(session);
    } catch (err) {
      toast({
        title: "Login failed",
        description: errMsg(err, "Unable to sign in. Please check your credentials."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-800 text-white">
                <ShieldCheck className="size-4" />
              </span>
              MDRRMO Login
            </DialogTitle>
            <DialogDescription>
              Sign in with your MDRRMO account to review, track, and manage barangay BDRRMP
              submissions.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="admin-username" className="flex items-center gap-1.5">
                <UserRound className="size-3.5 text-muted-foreground" />
                Username
              </Label>
              <Input
                id="admin-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="mdrrmo"
                autoComplete="username"
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="admin-password" className="flex items-center gap-1.5">
                <Lock className="size-3.5 text-muted-foreground" />
                Password
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button type="submit" disabled={loading} className="w-full gap-2 font-semibold">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              {loading ? "Signing in…" : "Sign In as MDRRMO"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              For MDRRMO Pio Duran personnel only. All actions are logged in the audit trail.
            </p>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
