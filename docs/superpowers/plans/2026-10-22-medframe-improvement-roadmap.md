# Medframe improvement roadmap and implementation plan

**Goal:** Make existing clinical, operational and patient workflows feel like one reliable workspace, delivered in six connected phases.

**Execution:** Native implementation in this chat only. No subagents or independent reviewer chats. This preserves the user's explicit execution method and overrides generic planning-skill delegation guidance. This document is a proposal; the current request authorizes auditing/planning, not implementing all six phases.

**Architecture:** Retain Django persistence/authentication/permissions/audit and existing mutation services. Refine the Next.js shared interaction owners and their consumers. Avoid parallel data stores, duplicate form owners and a new design system.

**Stack:** Existing Next.js App Router, TypeScript, Tailwind/shadcn, React Hook Form/Zod, Django/PostgreSQL, Three/R3F and current call transport.

**Audit/spec:** `docs/operations/2026-10-22-application-improvement-audit.md`. A01–A10 are source findings; historical acceptance gaps and proposed enhancements are identified separately there.

## Global constraints

- Preserve current source/data/accounts/MFA/grants/private storage and all unrelated dirty changes. Do not touch the user's preserved clinic-shell width snippet.
- No builds or automated tests; bounded native visual verification only. Prettier for supported files, Ruff formatting only for Python.
- Deliver multiple connected improvements in each phase, activate locally with ./medframe after implementation, and record actual evidence and limits.
- One batched desktop/tablet/phone visual round per phase; only necessary activation-blocker repair gets one focused confirmation. Log other findings without a repair/retest loop.
- Use Graphify first for impact relationships, verify source, refresh relevant stale corpus. Use sanitized Jev prioritization; no clinical/private data transmission.
- Keep header-owned branch selection, patient-action hub, circular portraits/placeholders, full-frame clinical imagery, written date presentation, native permission checks and existing dirty-work guards.
- Normal patient terminals remain identifier-only as explicitly requested. No password or repeat task code added; strict patient mode stays separate.
- No public deployment, live payments, external messages or AI integration. Provider/email/call activation requires its separate operational work.

## Review focus across phases

1. Switching patient/branch/device while a request is pending must not restore stale information.
2. Staff exit must disclose whether it signs out other tabs; patient session clearing must not masquerade as staff authentication.
3. Unsaved clinical input and confirmed data must survive only according to the actual form/draft owner; never promise unimplemented preservation.
4. Instant/scheduled rooms, completed-day comparisons and current balances must keep distinct time meanings.
5. Tablet/phone dialogs, drawers and 3D fallbacks must retain reachable controls and native permissions.

These are bounded manual review cases, not authorization to run automated suites. No phase may claim role/security/media acceptance from visual presentation alone.

## Phase 1 — Shared reliability and truthful feedback

**Priority:** First. Fix common causes of confusion before expanding workflows. Addresses A01, A04, A05 and audit status ambiguity.

**Owners:**

- `apps/web/features/patients/feedback.tsx`
- `apps/web/components/application/loading-information.tsx`
- `apps/web/components/application/recovery-state.tsx`
- `apps/web/features/auth/session-recovery.tsx`
- `apps/web/features/auth/google-sign-in.tsx`
- `apps/web/features/workspace/clinic-page-loading.tsx`
- `apps/web/features/stations/kiosk/assisted-kiosk.tsx`
- New `docs/operations/current-acceptance-status.md`, linking historical evidence without deleting it.

- [x] Replace unconditional preservation/authenticator claims with owner-aware, policy-neutral wording.
- [x] Name staff sign-out explicitly and disclose its browser/session scope while retaining fail-closed behavior.
- [x] Align initial load, refresh, unavailable, expired and restricted presentations around the existing shared container. Retain loaded data for transient refreshes; clear rejected patient scope through its native owner.
- [x] Create a current status index distinguishing repaired, deferred, unverified and configuration-dependent items.
- [x] Visually review one accepted navigation, one expired/restricted recovery and one transient refresh with synthetic state. Confirm the visible action matches its actual behavior and only one page-loading container is mounted.

**Done when:** Users can tell what is loading, what failed, whether work exists and what one action to take next. No new preservation mechanism or authentication bypass is implied.

## Phase 2 — Stations and fast patient terminals

**Depends on:** Phase1 feedback/session contracts. Addresses A02/A03 and completes the latest terminal workflow.

**Owners:** `apps/web/features/stations/kiosk/{terminal-entry,assisted-kiosk,kiosk-screen,kiosk-journey}.tsx`, `use-kiosk.ts`; native `services/api/medframe_apps/stations/{kiosk_terminal,kiosk_identity,kiosk_views}.py` only if necessary for the approved session behavior.

- [x] Introduce one selected-patient context bar and remove duplicate assisted Change/Finish controls.
- [x] Carry truthful entry-method wording through bill loading, check-in, review and completion. Give unknown/shared-email users a clear clinic-ID/reception route without public directory suggestions.
- [x] Show a concise completed-action summary and next step; retain one-session multi-task behavior and clear Finish semantics.
- [x] Keep selected staff patient/action available without another handoff; distinguish permission-unavailable actions from device-disabled services.
- [ ] Complete the remaining narrow acceptance: arbitrary slow request during clear and the intermediate staff inactivity warning/Keep open action. Native ID→ticket→bill review→Finish, staff search→select→change, automatic idle sign-out and strict-code presentation were observed; see improvements-phase-1-2-verification.md.

**Done when:** A patient identifies once and completes the intended visit tasks; staff select once and assist directly. No old patient state returns after clearing. Full booking/strict/security acceptance is reported only if actually exercised.

**Phase1–2 implementation is active locally.** Bounded visual results and retained acceptance gaps: `docs/operations/improvements-phase-1-2-verification.md`. New mobile Find-button naming issue is deferred as IMPROVEMENTS12-001; no broad retest or additional phase is implied.

## Phase 3 — Doctor-first patient profile and clinical editor continuity

**Depends on:** Phase1; reuses Phase2 identity/context patterns. Addresses A07 and historical editor navigation/drawer gaps.

**Owners:** `apps/web/features/patients/patient-overview.tsx`, `profile/{patient-profile-tabs,patient-actions-dialog,patient-clinical-context,patient-profile-sidebar}.tsx`; `features/dental/dental-editor.tsx`; `features/anatomy/anatomy-editor.tsx`; `features/assistant/clinical-assistant-drawer.tsx`; relevant Station editor containers.

- [x] Refine the existing Overview around actual reviewed history/alerts, current visit, latest consultation and next step. Preserve the five grouped tabs and central action modal.
- [x] Use shared photo/placeholder identities consistently in summaries; do not request unauthorized image URLs.
- [x] Attempt the exact saved-editor navigation sequence behind TABLET-IMPROVE-002 before selecting a repair. Current development probe did not reproduce it; historical production issue remains open, with no speculative portal/Three rewrite.
- [x] Improve narrow Notes controls, shared drawer close target/safe areas and opener-focus handling. Phone dental Escape/focus and anatomy close/navigation were observed; broader GPU/save acceptance remains partial. AI stays disconnected.
- [ ] Complete remaining dirty-exit/new-save/reopen and GPU acceptance. Native overview/actions→saved read-only draft→dental→notes→anatomy→patient was observed, with WebGL-disabled fallbacks; no new save or lease bypass. See improvements-phase-3-verification.md.

**Done when:** The doctor sees meaningful patient context first and moves through notes/charts without losing orientation or confirmed work. This phase does not change clinical validation or introduce AI advice.

**Phase3 implementation:** local activation and precise scoped evidence are recorded in `docs/operations/improvements-phase-3-verification.md`. Historical navigation/GPU and unexercised write acceptance remain open.

## Phase 4 — Scheduling, appointments and online-room continuity

**Depends on:** Phase1; Phase3 identity components. Addresses A06–A08/A10 and historical schedule/call gaps.

**Owners:** `apps/web/features/operations/{schedule-week,appointment-month,appointment-day-dialog,appointment-details}.tsx`, `use-operations.ts`; `features/calls/{room-information,patient-waiting-room,connection-recovery}.tsx`, `use-call-room.ts`; existing launcher environment owner if transport configuration needs correction.

- [x] Reproduce historical schedule page overflow and fix its actual ancestor if still present. Add a narrow provider/day presentation while preserving the useful desktop week grid.
- [x] Preserve bounded month cells and day-modal details; show patient/provider identities, current care status and reschedule/edit next steps with existing permission/version checks.
- [x] Correct room-information instant/scheduled timestamps and identity context; standardize the admission banner. Existing media connecting/reconnecting states remain distinct. Remaining instant-room stage/footer wording is logged separately.
- [x] Derive dormant operations transport from the selected API address before any later re-enablement. Keep appointment/queue live updates disabled under the user's standing preference.
- [x] Implement coalesced authoritative call invalidations, serialized snapshots, disconnected fallback and quiet connected safety refresh, retaining backend expiry/admission reauthorization. Native room/socket behavior and admission transition observed; request-count/performance, forced transport races and deadline-extension acceptance remain unmeasured.
- [x] Review native schedule phone/tablet/desktop layout, three-booking day modal, edit entry and scheduled/instant room presentation. Synthetic admission transition and local unsent draft observed with connection warnings. Full media/transport/portal/theme acceptance remains open; no internet-readiness claim.

**Done when:** Clinic availability and appointment context are clear on tablet/phone, and online-room states explain what is happening. Public DNS/HTTPS/TURN/hosting remain explicit prerequisites, not assumed deliverables.

### Phase4 implementation order (authorized continuation, October22)

1. Preserve the exact changed sources and fresh encrypted/restore-verified local checkpoint. Reproduce the narrow schedule before choosing containment repair.
2. Share `scheduleHours(setup, providerId, day)` between the desktop week and new narrow `ScheduleDay`; expose day selection, native availability/saved-window entry and real closure/override labels. Contain positioned screen-reader labels inside their own schedule section.
3. Retain bounded calendar/day-dialog owners; add visit reason and full timezone/time range to native appointment details. Preserve edit/version checks and patient/provider identities.
4. Refine native room information and waiting state; keep identity placeholders within existing private snapshots and semantic theme tokens. Separate instant creation from scheduled appointment time.
5. Let `useRoomUpdates(roomId, authorized, refresh)` coalesce authoritative invalidations, use disconnected fallback checks and quiet connected safety refresh. Serialize snapshot refresh with one queued follow-up, guard old generations and let Django confirm expiry/extensions. Retain existing backend reauthorization/media controls.
6. Supply dormant operations socket configuration from the launcher's selected API address. Keep appointment/queue live hooks unmounted. One final batched native desktop/tablet/phone review; log remaining issues without a repair loop. Remove review routes, expire/deactivate synthetic access and activate with the launcher; no builds/automated tests.

Review cases: ordinary hours versus same-date closure; day/week navigation and mobile containment; crowded day with bounded cells; details→edit entry; instant/scheduled semantics; waiting admission/device context; snapshot updates retain a local composer draft. Real two-party media, forced network races and hardware permissions remain separate acceptance.

**Phase4 implementation:** `docs/operations/improvements-phase-4-verification.md` records native visual evidence, fixture correction, runtime activation and remaining transport/copy acceptance. Phases5–6 are still pending.

## Phase 5 — Financial decisions and service-payment clarity

**Depends on:** Phase1 and Phase3 patient actions. Addresses A09 and financial usability opportunities.

**Owners:** `apps/web/features/analytics/{analytics-page,period-comparison-chart,report-range-controls}.tsx`; `features/billing/{invoice-form,installment-editor}.tsx`; `features/billing/analytics/financial-overview.tsx`; `features/services/service-billing.tsx`; existing billing list/filter owners.

- [x] Preserve the combined Dashboard's operations-first, financials-second structure and existing graphs/exact tables.
- [x] Provide scoped drill-downs from receivables/overdue summaries to native invoice/service lists, retaining selected branch and meaningful date filters.
- [x] Preview installment deposit, monthly terms, first/final due dates and remaining balance before issue using server-authoritative calculations; retain native month-end/rounding rules.
- [x] Use written DateInput for installment dates; clearly separate proposed draft total, issued obligations, recorded payments, refunds and current balance.
- [ ] Review a synthetic installment draft/issued schedule and dashboard comparison→invoice path, including empty/zero/partial states. No live charge or new payment connector.

**Status:** Implemented and active locally. One visual pass confirmed issued-date/overdue drill-downs, month-end/remainder preview, changed-field invalidation, zero-deposit draft save and service navigation. A later Billing return showed record-unavailable recovery; future-only and empty-branch checks remain unverified. See `docs/operations/improvements-phase-5-verification.md` and IMPROVEMENTS5-001. The final acceptance checkbox remains open.

**Done when:** A user understands what is due, why, when and where to act, without confusing chart-period totals with current receivables.

### Phase5 implementation order (authorized continuation)

1. Preserve exact changed sources and a fresh encrypted/restore-verified local checkpoint. Retain all unrelated dirty work and clinic-shell width changes.
2. Extend the existing JSON billing preview with optional read-only installment results, reusing `draft_totals`/`build_schedule` and native financial-patient scope. Accept an uncreated case only for arithmetic; retain full native case validation at Save/Issue. Display only the preview matching current fields.
3. Add invoice-specific balance/date-basis/currency filter validation. Use the existing due projection for all scoped candidates before pagination, retaining ledger precision and cursor binding. Existing record-date callers keep their created-date default.
4. Route current balance and issued-period actions through scoped invoice URLs. Separate current balances from report dates, retain branch/currency/report context, expose explicit filter meaning and clearing.
5. Use written DateInput for installment/invoice dates, show server-calculated financed/monthly/final dates and amounts, and distinguish draft proposal from issued charge/payment/refund/current obligation. Preserve existing service/financial mutation owners.
6. Run one batched native visual pass at desktop/tablet/phone using synthetic draft/issued/partial/overdue/settled/empty records. No build/automated tests. Log new findings without a repair loop; deactivate synthetic access/remove review routes/restore config and activate through ./medframe.

Manual cases: branch-scoped current overdue versus future obligations; issued-date report link versus created-date list; zero/empty/partial summaries; preview month-end/remainder and zero deposit; changed fields invalidate preview; native saved schedule/issue acknowledgement and service link. Full denial/race/high-volume/security/real-payment acceptance remains separate.

## Phase 6 — Onboarding, team access and accessibility completion

**Depends on:** Shared contracts from Phases1–5. Completes setup clarity and remaining cross-screen consistency.

**Owners:** `apps/web/features/onboarding/{onboarding-progress,onboarding-flow,step-form}.tsx`; `features/staff/{staff-modals,staff-onboarding}.tsx`; `features/portal/registration/{registration-review,registration-review-detail}.tsx`; `features/auth/recovery-request-form.tsx`; shared identity/button/token owners only where necessary.

- [x] Make clinic/staff/patient invitation states and pending review next steps clear, with resumable entry and explicit copy-link paths when delivery is unavailable.
- [x] Explain effective doctor/station/billing access before inviting or saving, using existing permission rules. No role grants as an audit side effect.
- [x] Expose real delivery/call setup readiness to administrators; distinguish local Mailpit, queued delivery, failure and configured external service. Do not reveal secrets or send messages.
- [ ] Review custom/dark theme semantic statuses, long names, circular uploads, touch target comfort, focus return, keyboard traversal and reduced-motion feedback. Fix only verified scoped issues.
- [x] Perform one representative onboarding→pending review and staff invitation presentation pass, plus keyboard/theme sampling. Record unexercised delivery/account activation/security cases honestly.

**Status:** Implemented and active locally. Native clinic save/pause, verified patient submission→pending, staff invitation copy/access presentation, phone/desktop and dark theme samples are recorded in `docs/operations/improvements-phase-6-verification.md`. Full keyboard/custom palette/reduced-motion coverage remains open. SMTP/SMS/media configuration is not delivery/connectivity proof; the existing reminder log is not a per-invitation mail tracker. Real platform fresh-link mutation, account/MFA/delivery/security acceptance remains IMPROVEMENTS6-001.

**Done when:** A clinic knows how to finish setup, a patient knows whether their request is pending and staff understand their effective access. The representative workflows remain usable without relying on hover, color alone or decorative imagery.

### Phase6 implementation order (authorized continuation)

1. Preserve exact scoped sources/config and a fresh encrypted restore-verified checkpoint; retain unrelated dirty work.
2. Expose current role-permission metadata and read-only sanitized configuration readiness through the existing administrator-only Staff snapshot. Reuse the native billing override function for public invitation access explanations; no role grants or message sending.
3. Add one reusable access summary to staff edit/invite/onboarding. Label real branch/workspace/billing limits, missing selections and patient-grant requirements before saving. Keep self-access controls read-only.
4. Return fresh clinic invitation links only to the existing platform-authorized create/replace operation, with explicit copy/manual fallback. Existing hash-only invitations retain replacement semantics; queued is not delivered. No schema or token persistence changes.
5. Clarify clinic pause/resume and patient pending/accepted/declined next steps. Preserve references, verification, clinic review and account activation owners. Focus new step headings, name toggle controls, use semantic status tokens and reduced-motion feedback.
6. Format only; restart through ./medframe. One synthetic native desktop/phone onboarding/pending and staff presentation/keyboard/theme pass, no builds/tests. Log findings without a repair loop, remove review routes/config exception, revoke synthetic access and finish local activation. Delivery/account/MFA/security/hardware acceptance stays explicitly separate.

## Sequencing and scope control

Implement1→2→3→4→5→6, with each phase delivering its connected features together. Phase5 can follow Phase3 before Phase4 if financial workflow becomes the user's immediate priority. No deadlines or effort estimates are asserted without sizing the approved phase.

AI integration, public hosting, real SMS/email delivery activation, live digital payments, new specialties and new backend batches are separate decisions. Do not hide these expansions inside UI improvements. Revisit only the relevant phase's evidence rather than rerunning the historical full application suite.

### Authorized follow-up Phase7 — October23

After the original six-phase implementation, the user selected navigation/recovery reliability. Scoped implementation/evidence is in `2026-10-23-navigation-recovery-phase-7.md` and `docs/operations/improvements-phase-7-verification.md`. This does not retroactively close unexecuted acceptance from earlier phases.
