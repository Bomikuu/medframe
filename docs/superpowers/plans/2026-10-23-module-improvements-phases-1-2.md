# Medframe module improvements, Phases 1–2 Implementation Plan

> Execution: native implementation in this chat, no subagents, as explicitly selected by the user. User visual-only verification overrides automated-test/build steps in generic skill templates.

**Goal:** Deliver the first two approved audit phases as one connected reliability and clinical-continuity batch.

**Architecture:** Preserve native permission and clinical mutation owners. Add shared URL/search/presentation helpers; retain the existing single React Hook Form/versioned encounter aggregate. Scope retained dashboard data to the same organization and branch; use the clinical patient queryset before exposing optional portrait IDs. No new schema migration, external integration or AI connection.

**Tech stack:** Existing Next.js/React, Tailwind, shadcn/Radix, Django/Strawberry.

**Spec:** `docs/operations/2026-10-23-module-improvement-audit.md`, Phases 1 and 2 approved together in chat.

## Constraints and review focus

- No builds, automated tests, lint or typecheck; Prettier/Ruff formatting and one bounded native visual pass.
- Preserve dirty source, original data, authentication, clinical access and existing upload/scan/revision owners.
- Never retain one clinic's data across a scope change; revocation/error handling must clear rejected data.
- Never expose clinical images to a demographics-only reader.
- URL state contains navigation/filter values, never clinical draft contents; preserve clinic/branch parameters.
- Surface saved/unsaved/conflict/read-only truth; do not autosave or finalize implicitly.
- Keep Appointments/Queue manual and AI disconnected. Activate locally via root launcher.

## Task 1 — Preserve source and implement shared reliability

- [x] Save exact affected source versions privately before edits.
- [x] Add `features/workspace/use-url-state.ts` for native-history query updates, preserving existing scope. Apply to non-sensitive patient sort, Services availability/tab and Dashboard tab selection. Patient search text/cursors remain memory-only under UX-CONTRACT.md.
- [x] Add a shared clearable/debounced search input; apply to Services and patient directory without changing search authorization.
- [x] Update `dashboard/use-daily-work.ts`/`today-workspace.tsx` to retain same-scope content during refresh, show updating/failure status and explicitly label retained results while request parameters differ.
- [x] Remove Dashboard's duplicate branch-switch action.

## Task 2 — Authorized photo propagation

- [x] Add a bulk optional portrait projection using the existing clinical patient scope and clean same-patient portrait map.
- [x] Expose optional portrait IDs on GraphQL directory and encounter DTOs, regenerate schema/client artifacts without a build, and use them in shared avatars. Preserve demographics-only placeholders.

## Task 3 — Clinical continuity and focused presentation

- [x] Extract a focused encounter save-state component distinguishing unsaved session-only edits, saved version/time, saving, conflict/error and read-only history; retain existing save/finalization controls and expose a truthful final-review checklist.
- [x] Improve recent-care resume labeling and next-action context using already authorized saved records.
- [x] Add a shared document-scan explanation to existing collections; download/attachment/scan-retry authorization remains native.
- [x] Add diagnostic progress/next-owner presentation from actual request/result/review/sharing fields, including terminal exception states.
- [x] Add compact chart-selection/read-only/current-state context and illustration legend without altering geometry or clinical findings.

## Task 4 — Native activation and bounded visual acceptance

- [x] Prettier/Ruff-format supported changed files; Graphify refresh source-only scope and Jev sanitized risk review.
- [x] Start normal local development services through `./medframe`; no migrations or production build.
- [x] Use isolated synthetic native browser data for desktop/phone search/filter/refresh, authorized identity, saved/editing presentation and scan/progress/chart states. One inspection and at most one focused correction confirmation.
- [x] Remove temporary preview routes, revoke synthetic access, restore normal config; retain active dev runtime and record actual acceptance gaps in operations evidence/error log.

Execution evidence and explicit remaining acceptance limits: `docs/operations/module-improvements-phases-1-2-verification.md`. No claim of complete security/3D/browser-history acceptance is implied by implementation completion.
