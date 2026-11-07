# Clinical UI refinements implementation plan

The user approved the three-phase UI suggestions in chat. Execute natively in this chat without delegation. This refines existing flows; it introduces no new backend subsystem.

**Goal:** Put daily clinical tasks first, make tablet controls consistent, and simplify financial presentation while preserving native authorization, patient context and financial calculations.

**Architecture:** Existing scoped GraphQL documents and shared remote/recovery owners power the daily workspace. Existing PatientActionsDialog remains the single mutation entry point. Sidebar preferences store only route paths, scoped to user and organization in this browser; patient information is never persisted there. Existing shadcn/Radix, semantic tokens and Tailwind remain authoritative.

**Approved design:** The preceding in-chat UI audit and three implementation phases, October 23, 2026.

## Constraints

- No builds, automated tests, typechecks or lint runs. Prettier formats supported edited sources. Use one bounded visual review; log unrelated findings without repair.
- Preserve exact pre-edit source copies and an encrypted checkpoint verified in an isolated database before editing. Never restore over the source database.
- Keep all existing clinical/financial permission checks, versioned mutation owners, unsaved-work guards, MFA and delegated Station scope.
- Do not enable appointment/queue polling, AI, messages, online payments or public publication.
- Preserve white, navy and teal identity, fonts, circular portraits and full clinical-image framing.

## Phase 1 Daily work

- [x] Add a permission-gated Today workspace above historical Dashboard charts, using native appointment/queue/dashboard reads, clinic-local dates and explicit manual refresh. Show honest pagination and scope labels.
- [x] Keep daily links visible, move occasional configuration into a collapsible Settings group, retain route labels, auto-reveal the current settings route, and allow browser-local pins without changing access.
- [x] Prioritize available patient actions using the already-loaded patient summary; retain full grouped/searchable actions and native Station filtering. Never imply a draft or booking exists without summary evidence.

## Phase 2 Device usability

- [x] Normalize shared button sizes with a monotonic scale and at least 44px touch height on narrow/coarse-pointer devices; preserve explicit canvas/editor overrides.
- [x] Replace the phone schedule section scroller with a labeled selector that navigates existing sections. Reduce duplicate instructions; retain hours-versus-bookings context and selected-day/provider information.
- [x] Simplify invoice preview copy, lead with the exact proposed agreement, disclose full payment dates and amounts, and retain unsaved/no-payment wording and native recalculation.

## Phase 3 Consistency and completion

- [x] Use semantic notice colors in both themes; remove redundant photo upload controls while preserving circular change/remove affordances.
- [x] Keep modal/drawer focus and existing layer contracts; do not repair unrelated historical editor defects. Preserve meaningful reduced-motion loading feedback.
- [x] Format edited sources with Prettier, inspect desktop/phone with synthetic data, log gaps and remove review access/routes. Activate locally with the root launcher; no production build.

## Review focus

Permission-restricted users must not trigger unauthorized Today reads or acquire actions through pins. Clinic/branch/user changes must drop prior context. No upcoming booking is inferred from incomplete lists; pagination is disclosed. Financial previews remain unsaved and server-calculated. Keyboard focus, collapsed sidebar, phone navigation, empty data and dark notices remain usable.

## Preservation and tool evidence

Pre-edit sources: `.medframe-runtime/ui-workflow-before`. Checkpoint `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261023-071020-a89bd41`; separate restored database `medframe_django_ui_workflow_20261023`, 167 tables verified, original source not written. Graphify queried the existing 14-file UI graph (78 nodes/127 edges); current implementation refresh follows. Jev chose native scoped reuse over inferred clinical/payment state; exact output is recorded with phase evidence.

Implementation and bounded visual evidence: `docs/operations/clinical-ui-refinements-verification.md`. UI-WORKFLOW-001 activation repair is confirmed; non-blocking spacing and selector-focus follow-ups remain logged. No full keyboard/physical-device or restricted-role acceptance claim.
