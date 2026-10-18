# Medframe Complete UI/UX Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **User override:** work natively in this chat. No subagents, delegated reviews, or separate chats. One comprehensive UI batch; internal work packages are not separate feature releases. Later roadmap batches are paused.

**Goal:** Refine all 27 existing page entry points and their shared components into a coherent, information-efficient healthcare workspace, preserving working clinical and operations behavior.

**Architecture:** Keep Next.js routes, Django domains, separate typed GraphQL clients, native auth/MFA, clinical forms and persistence. Expand the actual shadcn/Radix component kit; build shared application composition on it; migrate every existing surface. Only minimal authorized read-query additions required for truthful totals, sorting or filters are permitted; no database schema or unrelated backend feature work.

**Tech Stack:** Existing Next.js 16.4.2, React, TypeScript, Tailwind, Inter, configured Radix Nova shadcn source components, Lucide, RHF/Zod, native Django/Strawberry contracts; add missing shadcn components, TanStack Table and Sonner once as needed.

**Spec:** user-authored `docs/requirements/medframe-ui-revamp.txt`, preserved verbatim. Baseline and route matrix: `docs/operations/2026-10-19-ui-revamp-audit.md`.

## Global constraints

- The user explicitly requests improving the entire existing application together: dashboard, patients, consultation/dental/treatments/documents, operations, settings, authentication and portal. Do not stop at the dashboard or typography.
- White main background, white sidebar, white cards, white header, subtle borders, minimal shadows, restrained brand color; Inter. Primary `#0F2D4A`, secondary `#0EA5A4`, accent `#22C1B6`, background `#FFFFFF`, secondary surface `#F8FAFC`, borders `#E2E8F0`, primary text `#1E293B`, secondary text `#475569`.
- Theme variables remain authoritative; organization branding and saved personal preferences continue to work. No screen-local hardcoded palette, external fonts, gradients or arbitrary CSS customization.
- Preserve business logic, GraphQL integration, Django models, permissions, clinical evidence, finalization/amendment semantics, session realms and protected file access. No patient image service or fabricated metrics/clinical facts.
- Use actual installed/registry shadcn source components, not visual approximations. Keep the existing Radix variant; do not migrate to the newer documentation's default Base UI variant accidentally. Read the installed Next.js guides before changing routes/layouts.
- Native execution without subagents. Use the in-thread degraded Impeccable finish/documentation guidance where its generic handoffs request agents; the user's no-agent instruction takes precedence.
- One integrated verification pass after implementation; no builds after isolated styling edits and no repeated full backend/E2E suites. This UI request authorizes fixing UI defects. Unrelated functional defects remain logged; do not turn the revamp into backend repair work.
- Preserve active Batch 3 on 3000/8000, its original database, credentials and checkpoints until the new build is ready. No deployment/push/reset/checkpoint deletion.

## Review focus

1. Switching patient or consultation tabs must preserve unsaved registered fields, draft values, upload state and existing save/finalization coordination; no silent unmount data loss. Task 5/6 assertions.
2. A demographic administrator must not receive clinical summaries, tooth charts, document metadata or count leaks through new tabs, dashboard metrics or read queries. Task 4/5/9 assertions.
3. Table sorting/filtering must cover the authorized result set rather than silently rearranging only one cursor page. Cursors must remain bound to query/filter/sort and permission scope. Task 4 assertions.
4. Portalled clinical entry forms and previews must preserve form context, focus, one form owner, memory-only drafts, request cancellation and short-lived private download authorization. Task 6/7 assertions.
5. Collapsed navigation, narrow toolbars, long names and 3D canvases must fit the actual 703px browser and smaller screens without trapping the user behind chrome or clipping controls. Task 2/6/10 assertions.

## Direction contract

Mode: **Operate**. Extend the confirmed Medframe identity; replace weak composition. The detailed user brief settles the visual world, so no unrelated concept tournament, imagery or logo invention is needed. The useful signature is a persistent **clinical context rail**: patient identity, certainty/review status and selected-tooth details remain close to the task. Brand expression comes from quiet navy actions, teal active state, compact Inter hierarchy and consistent row/detail alignment.

- Typography: Inter 26–30px/600 page titles, 18–20px/600 section titles, 14px body/control text with readable line-height, 12–13px secondary metadata, tabular numerals for counts/dates. Honor existing font/size preference overrides.
- Geometry: controlled 8–10px component corners, circular avatars only, 1px semantic borders, flat surfaces. Desktop gutters 24–32px; narrow gutters 16–20px; primary section gaps 24px and related form gaps 16px. Preserve 44px touch targets even where dense desktop visuals use compact rows.
- Desktop shell: grouped collapsible Sidebar, compact account header, breadcrumb then page title/actions outside cards. At tablet/mobile the sidebar becomes a Sheet; no wrapped horizontal navigation grid consuming the page.
- Dashboard: useful metric row, recent-consultation table as the main region, recent patients/activity/quick actions in balanced supporting regions. Existing dashboard visibility/order/size preferences still apply.
- Patient: identity/action header, truthful compact summaries, then lazy controlled Tabs: Overview, Medical History, Consultations, Dental Chart, Treatments, Documents, and permission-gated Access/Shared Records. Never render all tab forms at once.
- Consultation: identity/status/save header and current patient context; task-focused content with visible save actions; desktop clinical rail, stacked/Sheet context on smaller screens. Dental controls and selected-tooth detail become one workspace rather than disconnected blocks.

```text
Desktop clinic                         Narrow clinic
┌──────────┬────────────────────────┐  ┌─────────────────────────┐
│ Sidebar  │ Breadcrumb · account   │  │ Menu · clinic · account │
│          ├────────────────────────┤  ├─────────────────────────┤
│ Clinical │ Page title    actions  │  │ Page title     action   │
│          │ Compact toolbar        │  │ Scrollable tabs/filter │
│ Operate  ├──────────────┬─────────┤  ├─────────────────────────┤
│          │ Main task    │ Context │  │ Active task/content     │
│ Settings │ Table/form   │ summary │  │ Context opens in Sheet  │
└──────────┴──────────────┴─────────┘  └─────────────────────────┘
```

## Task 1: Preserve the active UI and install the real component foundation

**Files:** `apps/web/components.json`, `apps/web/package.json`, root npm lock, `apps/web/components/ui/*`, `docs/operations/2026-10-19-ui-revamp-audit.md`.

- [ ] Create a Git checkpoint for current Batch 3 and branch `codex/ui-revamp` without overwriting existing refs. Keep the active production artifact and private synthetic review credentials outside Git.
- [ ] Read Impeccable craft-floor immediately before UI edits, relevant premium interaction/data-entry/async/permission references, and installed Next.js layout/route guides. Map existing canonical owners; retain PRODUCT.md/brand authority and update DESIGN.md/.impeccable/design.json only for approved durable changes.
- [ ] Inspect the installed shadcn registry/config, then install missing Radix-compatible components once: Card, Badge, Avatar, Tabs, Table, Sidebar, Breadcrumb, Separator, Skeleton, Alert, Empty, Progress, Tooltip, Dialog, AlertDialog, Sheet, DropdownMenu, Popover, Accordion/Collapsible, ScrollArea and Sonner as needed. Retain existing customized Button/Input/Select/Checkbox/Textarea owners unless an intentional compatible adjustment is necessary. Add `@tanstack/react-table` once.
- [ ] Record dependency provenance and shared component ownership. No component is installed merely because it appears in the brief; omit unused Chart/Resizable/Drawer/ContextMenu until an actual interaction needs it.

## Task 2: Shared composition, navigation and feedback

**Files:** `apps/web/app/layout.tsx`, `app/globals.css`, `features/workspace/clinic-shell.tsx`, `organization-switcher.tsx`, `notifications.tsx`, `safety-provider.tsx`, `features/patients/feedback.tsx`, new `components/application/{page-header,metric-card,status-badge,empty-state,section-header,view-switcher,patient-avatar,data-table,filter-toolbar}.tsx`, `components/ui/sonner.tsx`, DESIGN.md, UX-CONTRACT.md, `.impeccable/design.json`.

**Interfaces:** `PageHeader({title,description,breadcrumbs,actions,metadata})`; `MetricCard({label,value:number|null,icon,description,href})`; `StatusBadge({domain,value})` with explicit text; `PatientAvatar({name,authorizedSrc?})`; `DataTable<T>({columns,data,sorting,onSortingChange,pagination,loading,empty,columnVisibility})`; `ViewSwitcher({value:'table'|'cards',onChange})`. Reuse existing behavior owners instead of duplicating transport/session/confirmation logic.

- [ ] Compose the configured Sidebar with groups Dashboard, Clinical, Operations and Settings; only authorized existing destinations. Replace narrow wrapping navigation with a compact header and mobile Sheet. Move account actions to a DropdownMenu; keep organization switching guarded by existing unsaved-state behavior.
- [ ] Make the current PageHeading a compatible adapter to shared PageHeader, so existing callers retain behavior while headings become consistent. Nested patient/clinical sections use proper H2/H3 levels rather than a second H1.
- [ ] Register one themed Sonner provider at the app root. Trigger generic non-sensitive success only after confirmed writes; preserve critical field/error/conflict/save status inline. Do not toast on render/refetch or duplicate existing success messages.
- [ ] Recompose the existing SafetyProvider confirmation using shadcn AlertDialog while preserving its promise API, focus restoration, navigation guard and draft map. Use Dialog/Sheet for editing, not confirmation. Bound overlay height and keep close/actions reachable.
- [ ] Add contextual skeletons and Empty/Alert variants for collections, forms and permission/session errors. Remove patient-specific error/loading copy from unrelated operations/settings flows without weakening backend error handling.

## Task 3: Dashboard with real information and retained personalization

**Files:** `features/workspace/clinic-overview.tsx`, `clinical-widgets.tsx`, existing GraphQL dashboard documents; minimal `services/api/api_graphql/workspace.py` read-query changes only when required.

- [ ] Show Dashboard header, current organization and permission-gated primary actions, then metric cards for exact patient/open-draft/pending-treatment counts already available. Add a scoped finalized-consultation aggregate only if needed; never substitute a page length for a total. Unavailable metrics say unavailable.
- [ ] Replace recent-consultation text lists with a compact table of patient, date, responsible provider when supplied, status and action. Existing rows missing a provider use an explicit unavailable label unless an authorized read field is added.
- [ ] Compose recent-patient Avatar rows, actionable pending work, quick actions and attributed activity in a balanced responsive grid. Keep user widget visibility/order/size preferences; do not turn them into permanent duplicate dashboard sections.
- [ ] Add focused assertions for real count display and clinical-denied metrics/sections; no fabricated empty-state values.

## Task 4: Patient directory and appropriate collection views

**Files:** `features/patients/patient-directory.tsx`, new `patient-columns.tsx`, `patient-card.tsx`, `use-collection-view.ts`, shared DataTable/ViewSwitcher; optional minimal `api_graphql/patients.py`, `patient_types.py`, `patients/services.py`, existing GraphQL documents/generated clients if query features require them.

- [ ] Implement shadcn Table with TanStack column visibility, authorized name/reference search, real sorting, filters and existing cursor pagination. Row actions use DropdownMenu with real links; no fake patient status or last-visit value.
- [ ] Keep existing query signature/defaults compatible. If global sort/filter cannot be expressed by the existing endpoint, add optional read-only arguments and a separately signed query/filter/sort-bound cursor path; preserve existing UUID-cursor callers. Test scope isolation and cross-page order rather than mislabeling client page sorting as global sorting.
- [ ] Provide compact Card view with initials Avatar, name, reference, computed age and supplied authorized visit metadata. Missing patient photo support stays initials; no external avatars or unrelated storage implementation.
- [ ] Persist presentation mode using a user/organization-scoped UI preference key containing only table/card choice, not patient data or drafts. Keep page/filter/column controls coherent between modes. Provide clear count, skeleton, no-results, first-patient and retry states.

## Task 5: Patient profile and history as a medical workspace

**Files:** `features/patients/patient-overview.tsx`, `patient-form.tsx`, `identity-fields.tsx`, `contact-fields.tsx`, `clinical-history-form.tsx`, `clinical-summary.tsx`, `patient-timeline.tsx`, `patient-access.tsx`, `features/portal/access/patient-portal-access.tsx`, `staff-releases.tsx`, `report-review.tsx`; shared patient/detail components.

- [ ] Create a patient identity header with Avatar, age/reference/branch metadata and clear Start Consultation/Edit/Add Document/More actions according to existing permissions. Summaries use authorized totals only; missing totals remain explicitly unavailable or omitted.
- [ ] Use URL-backed controlled Tabs for Overview, Medical History, Consultations, Dental Chart, Treatments and Documents; add permission-gated Access and Shared Records/Reports sections. Mount only active content. Deep links must preserve organization and patient scope. Tab switches respect dirty forms or restore memory-only drafts without silently discarding input.
- [ ] Overview groups identity, contact, emergency/guardian details in meaningful panels. Medical history separates conditions, allergies, medications and procedures with review-state badges. History route presents attributed revisions in a structured timeline/detail view.
- [ ] Put a real current read-only chart in the Dental Chart tab using the existing authorized DentalChart query and ChartView, with historical comparison alongside it. Editing still belongs to a permitted consultation; an absent chart says no recorded chart rather than synthesizing healthy teeth.
- [ ] Use focused registration/edit Sheet/Dialog entry points while preserving standalone deep routes. Keep existing RHF/Zod schema, field grouping, request receipts, versions and save redirects. Access/release actions stay explicitly confirmed and separately authorized.

## Task 6: Consultation and dental workspaces

**Files:** `features/consultations/{encounter-editor,consultation-pages,filtered-consultations,soap-fields,diagnosis-fields,procedure-fields,patient-context}.tsx`; `features/dental/{dental-editor,dental-3d,dental-chart-grid,chart-view,chart-comparison,tooth-history}.tsx`; shared entry sheets and status badges.

- [ ] Build a consultation identity/date/provider/status/save header outside content cards. Keep save/finalization context visible and patient/allergy/medication context in a supporting rail on desktop, with a small-screen disclosure/Sheet.
- [ ] Group SOAP editors and move diagnosis/observation/procedure entry into focused Dialog/Sheet interactions with structured existing entries and certainty/status badges. Do not invent a validated terminology catalog; searchable selection only searches actual supplied terms/entries.
- [ ] Keep one parent RHF/FormProvider and existing autosave, IME coordination, lifecycle guards, upload pending state and exact-revision logic. Tab/overlay changes must not unregister or mutate hidden findings. Portalled fields retain form context and explicit form ownership; avoid nested forms.
- [ ] Integrate the existing WebGL renderer, keyboard 2D chart, visible model controls and selected-tooth panel. Show tooth identity/surfaces/findings/history/actions together, with Findings/Treatments/History tabs and recording in a Sheet. Maintain explicit FDI IDs, schematic label, 2D fallback, fixed responsive canvas region and all existing controls.
- [ ] Preserve significant-action AlertDialog confirmation, completion/finalization distinction, historical read-only views and attributed amendment behavior. No automatic finalization or silently relabeled clinical states.

## Task 7: Treatment plans and secure documents

**Files:** `features/treatments/{treatment-plans,plan-work,follow-ups}.tsx`, `features/documents/{document-panel,document-preview,upload-control,secure-image}.tsx`, `features/records/{history-records,record-filters}.tsx`.

- [ ] Show treatment plan Cards with real progress via Progress, status, next active step and relevant supplied metadata. Steps use structured rows/timeline; cancelled items stay out of the existing denominator. Preserve evidence checks on completed treatments and versioned plan/follow-up history.
- [ ] Convert document collections to Table/file-card patterns with actual type/version/scan state and supplied author/date/encounter metadata. Missing metadata is unavailable, never invented. Preview/download/replace/retry are contextual actions with current permissions.
- [ ] Put protected existing PDF/image previews in accessible Dialog/Sheet while retaining fresh authorization tickets, scan gating, original downloads, full image framing, PDF worker/text alternative, bounded canvases, revocation behavior and cleanup/cancellation.
- [ ] Replace permanently visible upload/plan/follow-up entry fields with focused entry patterns where helpful, preserving RHF validation and upload/save feedback.

## Task 8: Operations, settings, authentication and portal

**Files:** all `features/operations/*.tsx`; `features/branding/appearance-page.tsx`; `features/consultations/templates/*.tsx`; all `features/auth/*.tsx`; `features/portal/{portal-provider,portal-dashboard,portal-reports,release-view}.tsx`, `auth/*.tsx`, `operations/*.tsx`; route wrappers for all 27 matrix entries.

- [ ] Recompose appointment agenda as a structured day view/table with filters, explicit statuses and booking/reschedule Sheet. Queue uses compact ticket rows/cards, grouped call/service/delay/move actions and a contextual clinical handoff. Show actual update/stale/estimate data and preserve reservation/state/replay services.
- [ ] Schedule/resource/override settings use tables and focused editors. Appearance uses real Tabs/grouped controls and an authentic preview with unchanged save/cancel/reset/branding precedence. Template versions use a list/detail editor and existing archive confirmation.
- [ ] Staff and patient authentication get a deliberate compact frame, clear identity/MFA/recovery steps, field sizing/errors and accessible keyboard flow. Do not change authentication lifecycle, invitation claims, recovery codes or password/MFA rules. Authentication facts/copy remain truthful.
- [ ] Patient portal uses the same visual vocabulary with simpler own-record navigation, relationship switcher, released-record Cards/panels, treatment progress, protected previews, separate reports, appointments and own queue. Do not mount staff components or leak unreleased information.
- [ ] Verify that every route in the audit matrix is deliberately addressed, including invalid/expired token, denied, empty and redirect states. No unimplemented Staff/Treatments/Records destination is invented merely to fill navigation; contextual tabs/actions are sufficient.

## Task 9: Contract and interaction integration

**Files:** GraphQL documents/generated clients only when approved read additions require them; DESIGN.md, UX-CONTRACT.md, `.impeccable/design.json`; focused UI tests under `apps/web/tests/`; narrow backend query tests if changed.

- [ ] Integrate confirmed mutation feedback through shared Sonner without patient names or clinical text. Keep persistent inline errors/conflicts, actionable retry and native request scope cancellation; confirm finalization/destructive actions through SafetyProvider/AlertDialog.
- [ ] Add focused assertions for dirty tab switches, diagnosis/procedure sheet save/cancel, chart selection consistency, view persistence/sort/pagination, preview close cleanup, appearance save/cancel and clinical/portal permission boundaries. Use observed current MFA labels in the UI verification helper; do not rerun the previously broken Batch 3 journey unchanged.
- [ ] Regenerate both contracts once only if GraphQL fields changed; no database migrations for styling. Self-review all 27 route entries and updated canonical owners, then format with Prettier/Ruff and preserve semantic heading/accessibility structure.

## Task 10: Bounded integrated verification, documentation and native activation

**Files:** new `docs/operations/ui-revamp-verification.md`, updated audit coverage matrix and issue log; ignored screenshots under `.impeccable/review/ui-revamp/`.

- [ ] Run targeted type/lint checks and focused interaction/query assertions once after the integrated change. Do not run full historical backend/E2E suites or repeated vulnerability scans for this UI batch. Log unrelated functional failures without expanding scope.
- [ ] Inspect all renderable page/state templates in one batched viewport round across mobile, tablet, desktop and large desktop; include the actual 703px browser. Reuse shared authenticated synthetic fixtures and existing assets. Record routes that cannot be rendered without fresh token fixtures; never call a skipped route a pass.
- [ ] Capture and inspect meaningful screenshots, including dashboard, directory table/cards, patient tabs, consultation/dental workspace, plan/document preview, operations, settings and auth/portal. Check keyboard/focus/overlays, no horizontal page overflow, fixed model sizing, table adaptation, light/dark, confirmation and preserved save behavior. Static audits do not substitute for these interactions.
- [ ] Fix UI findings together in one batch when necessary; at most one confirmation round, only for the affected findings. This user request authorizes those UI corrections; it does not authorize open-ended polishing or unrelated backend repairs. One final production build is the default; a second build is only necessary if the bounded UI correction batch changes compiled source.
- [ ] Perform the Impeccable detector once, then native self-review using its degraded reviewer/documenter guidance rather than agents. Maintain token-bearing DESIGN.md and design.json plus canonical behavior documentation. Record review scope honestly; no independent-review claim.
- [ ] Retain the original Batch 3 production build, commit reviewable changes and activate the completed UI locally only after important build/interaction blockers are addressed. Do not change original credentials or database records for convenience. If activation is blocked, preserve the old app and record the exact blocker.
- [ ] Deliver actual pages reviewed/improved, components introduced, significant UX changes, checks run, remaining UI issues and local URLs. Include useful final screenshots rather than a claim based only on source edits.

## Self-review and handoff

The user's 26 brief sections map to the foundation, dashboard, patient, clinical/dental, treatment/document, operations/settings/auth/portal and final verification tasks above. All 27 page entry points are covered by the attached audit matrix. The five high-risk cases have owning assertions. No new product domain, database schema, fictional dataset, inaccessible navigation destination, or identity rebrand is proposed. Native execution and bounded verification are preserved.

Status: audit and plan prepared for user review. No application UI code, product dependency or runtime build has been changed in this planning turn.
