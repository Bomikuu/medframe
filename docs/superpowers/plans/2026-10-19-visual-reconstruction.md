# Medframe Visual Reconstruction Implementation Plan

Execution: native in this chat, no subagents or per-component approvals. The user's complete brief authorizes this comprehensive UI batch. Preserve the saved implementation and data; no backend feature batch.

**Goal:** Reconstruct every existing Medframe surface around stronger hierarchy, readable typography, meaningful clinical color, purposeful components, and responsive task flows.

**Architecture:** Existing Django/GraphQL and authorization remain authoritative. Shared CSS tokens, shadcn/Radix primitives and application components carry the new system; feature components own information composition. Extend only the validated appearance font presets/default palette on the backend, with legacy preferences accepted and no schema migration.

**Stack:** Next.js App Router, next/font/google Manrope and Plus Jakarta Sans, Tailwind, actual shadcn/Radix, RHF/Zod, TanStack Table, Lucide, Sonner, existing React Three Fiber.

**Spec:** `docs/requirements/medframe-visual-reconstruction.txt`.

## Constraints and review focus

- Preserve private file authorization, uncropped clinical media, circular profile images, clinical record/version rules, realms, permissions and drafts.
- Use real query data; never create metrics, trends, notifications or clinical facts for visual effect.
- Default light, navy #102A43, teal #0D9488, app background #F7F9FC, white content, semantic tints. Existing saved branding still overrides defaults.
- Layout must follow container width in Sheets, not global desktop width. Test long names and date/select shrink behavior.
- Every implemented route participates through shared owners plus route-specific review; include staff, portal, auth/recovery, settings and exact historical views.
- Preserve keyboard focus, pending/error/empty states, read-only and access-denied handling, and destructive confirmations.
- One accumulated targeted verification pass. The latest brief authorizes visible UI repairs within this batch; log any remaining defects precisely, with no unrelated backend repair or broad test loops.

## Tool evidence

Graphify: tracked frontend code-only corpus, 185 files / 62,470 words; 1,027 nodes, 4,009 relationships, 39 communities, 0 external LLM tokens. Graph/query evidence stays under ignored `graphify-out/` and review artifacts. Queries identify EntrySheet, FormSelect, ThemeProvider, MetricCard, PatientOverview, DocumentPanel and shared primitives. Graph edges are navigation aids, verified against source; bounded query output was truncated.

Jev: authenticated TypeSafe model `jev-1.13.0`; sanitized brief/observations only, no patient data or secrets. Structured choice selected `form_geometry` (confidence 1.0; 580 input / 54 output tokens). This judgment supports prioritization, not proof of correctness or clinical authorization.

## Connected implementation

- [x] 1. Foundations: next/font in `app/layout.tsx`; semantic/default/dark tokens and typography/interactions in `app/globals.css`; validated font choices in branding schema/provider/settings; update DESIGN and UX contract.
- [x] 2. Shared geometry: `FormField`, `FormSelect`, Select, Dialog/Sheet, EntrySheet, tables, badges, empty states, page headers; strong focus and status semantics, controls 44px, container-responsive forms.
- [x] 3. Shell/auth/portal: clinical brand symbol, organization context, active/hover nav, compact account header, clearer notifications, consistent auth/portal surfaces.
- [x] 4. Dashboard/patients: purposeful metric and action treatments with real data, useful column proportions, preserved widget settings, compact identity and tabs, polished directory table/cards.
- [x] 5. Documents/records: compact primary filters with advanced disclosure/chips, actual table/card switch, file-type identity, protected preview/download, secondary action menus and version history from authorized data.
- [x] 6. Forms/operations/settings: reconstruct booking into patient/provider, visit, schedule and optional details; wide Sheet and visible actions; refine appointments, queue, schedules, templates, preferences, patient registration/history.
- [x] 7. Clinical/dental/treatments: shared clinical sections, usable consultation actions, full-height dental canvas, mobile layer/action corrections, semantic plan/status presentation; keep 2D and persisted 3D behavior.
- [x] 8. Format and verify once: focused lint/type/backend branding check, browser route inventory at 1440/1024/768/390, booking and registration panels, patient tabs/documents/dental, appearance preview/cancel, portal/auth states, keyboard and dark state; inspect screenshots. Capture exact findings and implement only in-scope final repairs.
- [x] 9. Record scope/evidence, preserve old runtime/artifact, activate locally after a usable result, and commit. No push/public deployment or replacement database.

## Completion evidence

Implementation and local activation are complete with explicit acceptance gaps. See `docs/operations/visual-reconstruction-verification.md` for final Graphify/Jev outputs, build/lint/backend results, 128 route/width captures, five passed interaction groups, the blocked dental group and rollback. UI-RECON-001/002 remain logged; the browser result is not an all-green pass. No additional repair loop was run.
