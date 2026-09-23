# Task 9-c — MDRRMO Admin Console UI (QAS33 – BDRRMP)

Agent: full-stack-developer
Status: COMPLETE — tsc 0 errors, lint 0 errors/warnings on all `mdrrmo-*` files, SSR smoke test ALL PASS (12/12 components).

## Files created (all in `src/components/qas33/`, all `"use client"`)

- `mdrrmo-app.tsx` — default export `MdrrmoApp({ session, onLogout })`. Sticky header (Q33 mark, "MDRRMO Console", user name/position, notifications bell w/ unread badge, logout), desktop sidebar + mobile top scrollable nav. Internal view state, **Review Queue is default**. Review Detail overlays the current view via `detailId` state (Back returns to originating view). `dataVersion` counter refreshes list views after review actions; unread bell count refetches via tick.
- `mdrrmo-shared.tsx` — `StatusBadge` (STATUS_META + dot), `ActorBadge`, `useLoad` hook (loader-ref pattern, stale-while-revalidate, all setState in promise callbacks — satisfies `react-hooks/set-state-in-effect`), `useDebounced`, `ErrorAlert`, `TableSkeleton`/`CardsSkeleton`, `CopyButton`, `fileSize`, `templateBadge`, `FileStatusBadge`.
- `mdrrmo-dashboard.tsx` — 8 stat cards (2 rows), status distribution w/ proportional bars, recent activity feed (actor badges, mono action codes).
- `mdrrmo-barangays.tsx` — debounced search + status Select, sticky-header table (max-h-[65vh]), credential icons (Lock/KeyRound/Ban/CircleSlash), actions dropdown: View Submission, Generate/Reset PIN (temp PIN dialog, shown-once warning, copy), Revoke/Activate PIN (confirm), Clear Lockout, Disable/Enable Account (confirm).
- `mdrrmo-queue.tsx` — 10 filter chips + search, table w/ contextual action buttons (Review / Continue Review / amber Finalize / View), rating "total/max", template EN/TL, last update.
- `mdrrmo-review.tsx` — **the centerpiece**: header card w/ contextual actions (Start Review, Add Comments, Request Revision, Approve, Finalize Document w/ FileSignature, Regenerate Final Document, Archive), NEEDS_REVISION amber banner, read-only banner for drafts. Tabs: Submission (accordion sections, per-section complete/comment/paperclip indicators, definition-grid field renderer incl. checkbox arrays + whitespace-pre-wrap long text, file list w/ view links `/api/admin/files?fileId=`, existing + pending section comments, per-section comment box) | Evaluation (criteria score inputs 0..max, live total, remarks, save via `adminRating`, prefilled from existing rating) | History (review timeline w/ action badges, versions, final document card). Sticky action bar "N pending comments" → Submit Comments / Request Revision (dialog w/ overallComment) / Approve (disabled + tooltip "Complete the evaluation first" while rating is null). Finalize dialog: checklist (Reviewed/Approved/Rated), signatory prefill from `adminSettings()`, "Generating PDF..." loading, success dialog w/ docId + copy + size + verify URL link.
- `mdrrmo-requirements.tsx` — sections table (Order, EN+TL titles, fields, Required Switch, Upload-required Switch, formats, max MB, Edit dialog) + Template Preview card (bilingual titles, descriptions, field counts, upload rules).
- `mdrrmo-tutorials.tsx` — cards w/ active Switch + Edit dialog (titleEn/titleTl/bodyEn/bodyTl), bold/lists formatting hint.
- `mdrrmo-reports.tsx` — summary cards, status chips, full monitoring table (sticky header, max-h-[60vh]), Export CSV (`<a href="/api/admin/reports?export=csv" download>`), Print (window.print()).
- `mdrrmo-notifications.tsx` — inbox w/ type-colored icons, unread dots, Mark all read (refreshes header bell via callback).
- `mdrrmo-users.tsx` — users table (mono username, role badges, active, last login), Add User dialog (username/name/position/password/role → `adminSaveSettings({newUser})`), toggle active w/ confirm (hidden for self).
- `mdrrmo-audit.tsx` — search + actor filter, immutable-trail note, mono table w/ Load more (offset += 100), request-token race guard.
- `mdrrmo-settings.tsx` — General card (plan year, signatory, municipality, province, motto) + Rating Criteria editor (add/remove rows, keys auto-slugified from names, live total).

## Key decisions

1. **Contract-driven deviations**: `signatureHash` is NOT in `DocumentInfo`/admin detail payload → replaced with "Digitally signed… verifiable via QR" note. Requirements PUT ignores `descEn/descTl` → descriptions shown read-only in edit dialog (no fake-saving). Revision requires ≥1 pending section comment (backend enforces; "existing comments only" would fail server-side).
2. `Regenerate Final Document` only for READY_FOR_DOWNLOAD (finalize endpoint rejects DOWNLOADED with 409); DOWNLOADED shows document card + Archive.
3. New eslint react-hooks v6 rules (`set-state-in-effect`, refs-in-render) forced a fetch pattern where **all setState lives in promise callbacks**; filter resets happen in event handlers; dialogs remount via `key` to seed form state instead of effects.
4. `useLoad` = stale-while-revalidate (no skeleton flash on refetch); skeletons only on first load.
5. Emerald/green theme only (STATUS_META + primary); no blue/indigo. No emojis, Lucide only. Toasts via `useToast` (Toaster already in layout.tsx).
6. Fixed initial TS errors: Skeleton import source, `st` undefined narrowing, removed DocumentInfo.signatureHash usage.

## Integration note for page.tsx owner

```tsx
import MdrrmoApp from "@/components/qas33/mdrrmo-app";
// session.role === "ADMIN" → <MdrrmoApp session={session} onLogout={...} />
```
`MdrrmoApp` needs no other props. Barangay app files (`barangay-app.tsx`, `landing.tsx`) already exist from agent 9-a/9-b.

## Test results

- `bunx tsc --noEmit` → 0 errors in mdrrmo-* (other agents' barangay-misc.tsx has 3 pre-existing errors, not mine).
- `bun run lint` → 0 errors/warnings in mdrrmo-* (barangay-* files have their own, untouched).
- SSR smoke test (renderToString, project React): 12/12 components PASS.
- Live API verified with admin cookie: overview, submissions (search+ALL filter), barangays (search), submission detail (sections/files/comments/reviews/rating/criteria/document), settings (settings+criteria+users), requirements, tutorials, notifications, audit, reports CSV export (200 text/csv).
