# Services and Installment Plans Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` after this plan is approved. The user requires native implementation in this chat, without subagents, delegated review or separate chats. All tasks form one connected milestone; do not hand off a partial feature after an internal task.

**Goal:** Let clinics define reusable services, track each patient's workflow and issue accurate monthly installment agreements through native billing.

**Architecture:** A focused Django services app owns catalog definitions and nonclinical patient cases. Billing owns one installment agreement per invoice and a shared deterministic due projection over existing payment/refund/credit entries. Existing authenticated GraphQL, profile, financial, portal, communications and kiosk boundaries consume these owners without a parallel monetary ledger.

**Tech Stack:** Existing Django/PostgreSQL/Strawberry, Next.js App Router/TypeScript, Tailwind, real shadcn/Radix, RHF/Zod and incumbent GraphQL code generation. No new dependency is planned.

**Spec:** `docs/superpowers/specs/2026-10-20-service-catalog-payment-plans.md`, approved October 20, 2026.

## Global Constraints

- Deliver the catalog, per-patient workflow, service selection in billing, schedule generation/confirmation, due-aware reporting and patient statement display as one connected milestone.
- Fixed-price PHP services; interest-free monthly installments, partial payments and early payments. At most forty workflow steps and one through sixty monthly installments.
- Example: PHP60,000 total, PHP12,000 down payment plus twenty-four monthly payments of PHP2,000. The deposit is additional to the installment count.
- Django owns integer-minor-unit arithmetic, exact versions, authorization, idempotency, persistence, migrations and audit. No automatic charging or fabricated payment receipt.
- Preserve issued records, existing clinical permissions, native MFA/realm/branch/device boundaries and the pre-existing uncommitted `clinic-shell.tsx` width edit. New service-only grants do not expand clinical/financial access.
- Native execution only. Readable focused modules, Prettier/Ruff, Tailwind, shared form controls/toggles. Read installed Next guides and Impeccable craft-floor immediately before UI work.
- User's bounded verification overrides per-task red/green loops: write meaningful assertions before implementation, accumulate checks and run the targeted pass once after the connected feature is assembled. Log unrelated failures; only necessary activation blockers permit a bounded repair/confirmation.
- One batched desktop/tablet/phone browser journey, at most one focused confirmation. No third browser/polish round. No live messages, money movement, public deployment, reset or review-data import.
- Always activate locally after implementation through a fresh encrypted checkpoint, isolated verified restore, original fingerprints/storage checks and additive migrations. Retain the previous UI artifact.

## Review Focus

1. A draft reviewed before clinic midnight must not issue with a now-past deposit date; Task3 pins issue-time date revalidation and review-digest mismatch.
2. A credit or refund must change current installment coverage without rewriting a historic receipt or marking a future unpaid amount as overdue; Tasks2/4 pin tail credits, net coverage and date aging.
3. A double submission or two staff issuing the same case must produce one agreement/invoice and a stable authorized retry result; Task3 pins locking/idempotency/conflict behavior.
4. A workflow-only doctor or receptionist in a restricted branch must not gain patient financial or clinical fields from a service DTO, search result or error path; Tasks1/5 pin serialized omissions and real request/device context.
5. A queued manual reminder reviewed before a payment must not send an outdated amount after that payment; Task4 pins explicit obligation selection, snapshot comparison and existing dispatch cancellation.

## File and interface map

- New `services/api/medframe_apps/services/`: `models.py`, `apps.py`, `admin.py`, `inputs.py`, `policy.py`, `catalog.py`, `cases.py`, `queries.py`, `serialization.py`, migrations. Catalog/case action owners use existing audit/idempotency helpers.
- New billing modules: `installment_models.py`, `installment_inputs.py`, `installment_schedule.py`, `installment_projection.py`, `installment_actions.py`, `service_sources.py`. Import focused models through `billing/models.py` for Django discovery.
- Modify billing `inputs.py`, `invoices.py`, `queries.py`, `analytics.py`; existing money and financial-entry owners remain authoritative. Add immutable service-charge source metadata through a new one-to-one InvoiceLine source model rather than changing an issued line.
- New `api_graphql/services.py`; extend `api_graphql/billing.py`, private schema composition and generated staff contracts. Portal invoice operations remain on their existing verified portal schema.
- New `apps/web/features/services/`: `schema.ts`, `use-services.ts`, `services-page.tsx`, `service-form.tsx`, `workflow-fields.tsx`, `patient-services.tsx`, `service-case.tsx`. New `/clinic/services` route.
- New billing UI modules: `service-picker.tsx`, `installment-editor.tsx`, `installment-schedule.tsx`; extend existing invoice/payment/detail/portal/analytics controls and schemas.
- Modify profile `features/patients/patient-overview.tsx`, shell navigation, `features/stations/kiosk/types.ts` and `kiosk-journey.tsx`; no new Station authoring or public website source joins.
- Extend communications `models.py`, `inputs.py`, `reminders.py`, `delivery.py`, `queries.py` plus focused `installments.py` and its additive migration. Update frontend reminder form/schema only for obligation selection and preview.
- New focused Django test modules `test_service_catalog.py`, `test_service_cases.py`, `test_installment_schedule.py`, `test_installment_billing.py`, `test_installment_reporting.py`, `test_installment_reminders.py`. Reuse existing synthetic fixtures; do not weaken conclusive scan or financial SQL guards.

## Task 1: Versioned service catalog and patient workflows

**Files:** New services app above; modify `config/settings/base.py` and `medframe_apps/organizations/policy.py`; create service migrations and catalog/case tests.

**Interfaces:** `catalog_action(request, organization_id, action, data, request_id) -> dict`; `case_action(request, organization_id, action, data, request_id) -> dict`; `catalog_page(request, organization_id, branch_id, filters, after=None) -> dict`; `case_page(request, organization_id, branch_id, filters, patient_id=None, after=None) -> dict`; `case_detail(request, organization_id, case_id) -> dict`. All action input schemas reject extra fields and use exact expected versions. DTOs serialize UUID/date/time consistently with incumbent JSON contracts.

- [ ] Write fixture-backed assertions for catalog admin scope, absent MFA/wrong realm, foreign branches, workflow-only price omission, restricted-branch case search and delegated device denial. Test `services.read/work` do not confer billing or clinical fields.
- [ ] Define `ServiceDefinition` with organization/name/category/description/active/version, bounded workflow/preset snapshot and branch availability. Define protected `PatientServiceCase`, ordered case steps and append-only attributed case events. Snapshot definition version/name/workflow at case creation; case identity cannot move between patient/branch/source.
- [ ] Implement separate catalog, policy, serialization and case owners. Catalog writes require organization.manage; scoped workflow reads/work require the new service permissions. Return patient identity only within existing branch scope. Financial fields require billing.read, except administrators may author catalog prices without patient-financial access.
- [ ] Add additive role defaults/migration for only services.read/work on clinic-administrator/receptionist/doctor/dentist roles. Preserve custom roles and existing clinical/financial/device grants; no production services are seeded.
- [ ] Pin archive preventing new selection, stale-version conflicts, request replay, copy preservation after catalog edit, skip/reopen reason requirements, incomplete-case completion denial, explicit zero-step completion and cancellation without invoice mutation. Implement those transitions; step changes never create procedures/appointments/queue actions.
- [ ] Add database guards for organization/branch/patient scope, fixed case identity and append-only events. Register operational administration without bypassing native actions for guarded transitions. Commit only this task's files after static review; defer execution to Task7.

## Task 2: Immutable agreements and pure schedule/coverage calculations

**Files:** New billing installment modules/models/migrations; `billing/models.py`; tests in `test_installment_schedule.py` and initial cases in `test_installment_billing.py`.

**Interfaces:** `build_schedule(total: int, deposit: int, count: int, first_due: date, deposit_due: date | None) -> list[ScheduledAmount]`, where ScheduledAmount has position/kind/due_date/amount. `project_obligations(rows: list[ScheduledAmount], paid: int, refunded: int, credited: int, today: date, state: str) -> DueProjection`. Projection has integer total/credits/net_received/outstanding/refundable/due_now/overdue/future and rows with original/credited/effective/covered/remaining amounts, date_state and coverage_state. Serialization converts money using existing amount_text only.

- [ ] Write exact pure assertions: 6,000,000 total minus 1,200,000 deposit yields twenty-four rows of 200,000 plus one deposit; 100,000 over three yields 33,333/33,333/33,334; January31 -> February28 -> March31, and leap-year February29. Reject count0/61, deposit>=total, nonpositive principal or principal<count.
- [ ] Implement calendar anchoring with the original day-of-month and integer quotient/remainder; no client or binary floating-point arithmetic is authoritative. Pure generation does not validate today; issue-time validation belongs to Task3.
- [ ] Write projection assertions for 150 units received against two 100-unit obligations (100 covered, then50); refunds reopening the last covered amount; credits applied from latest obligations backward; credit-created refundable balance; same-day due versus yesterday overdue; draft/void obligations inactive. Assert sum remaining equals native outstanding in every case.
- [ ] Implement deterministic tail credits, earliest-first net-received coverage and separate date/coverage states. Draft and void returns have no active due amounts. Preserve original amounts; no payment allocation rows are persisted.
- [ ] Define one-to-one `InstallmentAgreement` for an invoice with service case, version, source snapshot, deposit/count/dates, review digest and confirmation actor/time; immutable ordered `InstallmentObligation` rows. Draft agreement changes bump the owning invoice version. Issued identity/terms/rows cannot update/delete or accept later row inserts.
- [ ] Add deferred transaction-end sum/shape validation on agreement/obligation/invoice changes, plus one-to-one case/invoice and scope guards. Confirmed rows sum exactly to native invoice.total; non-plan invoices remain unaffected. Add direct SQL immutability/scope assertions before implementation. Commit focused files without a test rerun.

## Task 3: Service charge selection and atomic reviewed plan issue

**Files:** `billing/service_sources.py`, `installment_actions.py`, `installment_inputs.py`, existing invoice/input owners and new billing migrations; `test_installment_billing.py`.

**Interfaces:** `service_charge(request, member, branch_id, service_id, service_version) -> ChargeSnapshot`; `save_installment_draft(request, member, invoice, data) -> InstallmentAgreement`; `agreement_review(invoice) -> dict` includes the exact invoice version, canonical terms digest and generated rows; `issue_installment(request, member, invoice, confirmed_digest: str) -> dict`. Integrate through existing invoice_action rather than nesting a separate transaction or bypassing FinancialEvent/idempotency.

- [ ] Pin full-payment Add from services copying the source description/price with quantity1, foreign/archived/stale service denial, unchanged old charge snapshots after catalog edits and ordinary mixed manual/full-payment charge support. A client cannot forge the source label, current price or version; an explicitly reviewed draft override remains traceable separately.
- [ ] Add protected `InvoiceLineServiceSource` one-to-one metadata with catalog/version/source snapshot; allow replacement/removal only while the invoice is draft. Preserve issued line/metadata history. No new field rewrites an old issued invoice.
- [ ] Pin installment rejection for mixed charges, quantity other than1, nonpositive/mismatched totals and a case already linked to another invoice. Creating an installment draft from billing atomically creates/links the case only with services.work plus billing.manage; otherwise require an existing scoped case or return an actionable permission error.
- [ ] Save an editable draft agreement against the invoice; derive post-discount total from native draft_totals. An explicit refresh may replace a captured preset only before issue and requires current catalog/version validation. Catalog edits never silently replace existing captured terms.
- [ ] Implement review digest over invoice/case identity, versions, total, deposit/count/dates and exact rows. Require explicit confirmation of that digest on issue; set invoice.due_date to the final obligation date before native issue changes state. Run all validations/row creation/confirmation under the existing invoice lock and event transaction.
- [ ] Pin issue after local midnight refusing stale dates, deposit-first ordering, changed totals/digest rejection, rollback on failed sum guard, no payment created by issue, two conflicting issuers and identical request retry yielding one invoice/agreement. Replay reauthorizes before returning the prior result. Commit scoped integration files; accumulated verification remains in Task7.

## Task 4: Shared due reporting, verified statements and reminder safety

**Files:** `installment_projection.py`; billing queries/analytics; `patients/profile_summary.py`; `stations/kiosk_services.py`; communications files/migration; reporting/reminder tests. Modify existing financial overview/profile/kiosk tests only where meaningful compatibility assertions belong.

**Interfaces:** `invoice_due_projection(invoice, today=None) -> DueProjection`; `invoice_due_projections(invoices, today=None) -> dict[UUID, DueProjection]` batch-loads obligation/payment/refund/credit data; `serialize_due(projection, portal=False) -> dict`. Non-plan issued invoices use a synthetic single obligation at existing due_date. `reminder_obligation(invoice, obligation_id) -> dict` returns an unpaid obligation snapshot; `validate_reminder_obligation(reminder, invoice) -> dict` rechecks the stored snapshot at dispatch.

- [ ] Add assertions that one plan remains one invoice, 24 future payments never become 24 overdue invoices/visits, daily issued/payment/refund graph totals do not duplicate, and due/aging buckets reconcile to remaining principal across plan and ordinary invoices. Include multiple plans and multiple currencies defensively without loosening native PHP write rules.
- [ ] Add due projection to invoice summary/detail, financial overview, patient financial summaries and verified portal statements. Keep existing outstanding/net_received/refundable fields compatible and add explicit due_now/overdue/future/next_due fields. Aggregate aging per unpaid obligation date, using batched queries/iteration rather than per-row invoice_totals calls or a truncated display page.
- [ ] Pin verified patient/guardian isolation and omission of staff actors, references and operational workflow history. Extend kiosk own-bill serialization with due_now/future/next_due; keep its existing device-bound patient authorization and inability to record payments.
- [ ] Add a nullable immutable reminder obligation snapshot (ID, date, unpaid minor units, invoice version) and optional obligation_id input. Plan reminders require an explicitly selected unpaid obligation; regular invoice reminders remain generic. Include the obligation in dedup/replay data.
- [ ] Pin staff preview/source labels and plan reminder safe_message using the selected amount/date, without clinical details. At delivery, preserve existing source/preference/creator authorization checks and compare obligation snapshot/current coverage; paid/credited/changed terms cancel with the existing eligibility transition. Never silently substitute a new amount. No automatic plan scheduler, channel enablement or live send.
- [ ] Pin an ordinary invoice reminder still working, a partial payment between review and delivery cancelling stale preview, and a paid obligation with unchanged plan terms being rejected. Commit the shared reporting/reminder integration and migration without running a broad suite.

## Task 5: Typed endpoints and catalog/workflow interface

**Files:** New `api_graphql/services.py`, private schema composition, billing GraphQL, staff operation/schema/generated files; new frontend services files/route; `patient-overview.tsx`, `clinic-shell.tsx`; ignored `.impeccable/surfaces/clinic-services.md`.

**Interfaces:** GraphQL `serviceCatalog(organizationId, branchId, filters, after)`, `patientServices(organizationId, branchId, filters, patientId, after)`, `patientService(organizationId, caseId)`, `serviceAction(organizationId, action, data, requestId)` and `patientServiceAction(...)` delegate only to Task1 owners. `installmentPreview(organizationId, invoiceId)` delegates to Task3 with billing.manage. Frontend Zod schemas validate unknown JSON responses and keep price/payment fields optional on operational-only DTOs.

- [ ] Read relevant installed Next routing/client-boundary guides and Impeccable craft-floor before UI edits. Preserve existing DESIGN tokens/identity; write a surface brief with Operate mode, task hierarchy and desktop/tablet/phone adaptation. No generated imagery is needed.
- [ ] Add private endpoints and typed operations, export staff/portal schemas using `npm run codegen`; keep service operations out of public/portal schemas. Add real request-context assertions for workflow-only DTO redaction and station scope if direct owner fixtures do not exercise middleware behavior.
- [ ] Build Services/Patient services tabs with branch selector, bounded search, active/category/status filtering, pagination, meaningful empty states, precise money/payment summaries and restricted-price presentation. Add permission-scoped navigation without formatting/staging the unrelated width change.
- [ ] Build service entry sheet with Details/Workflow/Payment groups; fields sized for expected input, active/payment toggles, keyboard reordering, archived history and explanatory preset arithmetic. Use RHF/Zod/entry-sheet/safety contracts, honest loading and recoverable schema/network errors.
- [ ] Build patient case creation/detail and profile Services panel with attributed operational timeline, step statuses, skip/reopen/cancel reasons and explicit case completion. Render financial links only with billing.read and payment enrollment only with its separate grants. Mutation success refreshes the exact scoped collection; failed save preserves entered data.
- [ ] Pin frontend schema tests for missing price on workflow-only responses and full native amount strings where financial access exists; cover interactive behavior in Task7's one accumulated browser pass. Commit scoped files and generated outputs separately from the user's pre-existing shell edit.

## Task 6: Service selection, agreement review and consistent financial UI

**Files:** New billing picker/editor/schedule modules; existing invoice form/detail/payment/portal/schema/analytics files; kiosk types/journey; communications schema/reminder form. Update financial labels in patient profile controls where their DTO fields change.

**Interfaces:** `ServicePicker({branchId,onSelect})` returns the server source ID/version, not trusted price authority. `InstallmentEditor({invoice,saved})` saves terms via native draft action then obtains `agreement_review`. `InstallmentSchedule({plan,due,readOnly})` is shared by staff/portal with safe DTOs. Extend `InvoiceDetail` with optional plan and due projection; ordinary invoices remain compatible.

- [ ] Add Add from services to invoice charge entry, preserving manual charges. Display captured service identity, explicit preset-change notice/refresh and override indicators; disable installment enrollment for mixed charges with an actionable explanation.
- [ ] Build installment terms fields and review showing actual patient/service, discount-adjusted total, deposit, first/final dates, all generated rows and exact confirmation. A new preview/version invalidates prior acknowledgement. Save draft does not issue; issue submits the confirmed digest using a stable retry key.
- [ ] Render native invoice due summary and original/effective/covered schedule amounts, credited/partial/date states and linked workflow separately. Default payment amount to due_now, otherwise suggest next unpaid installment as early payment; retain positive/native outstanding validation and already-received confirmation.
- [ ] Update billing/dashboard/aging/profile/portal/kiosk labels: Total outstanding versus Due through today/Overdue/Future. Do not represent remaining two-year principal as due today. Include readable exact table data alongside existing financial comparison charts; keep paid/refunded cash comparisons unchanged.
- [ ] Extend manual reminder source selection with the explicit unpaid plan obligation and reviewed message. Keep non-plan reminders generic. Financially completed workflow stays independently visible; cancelling a service shows the separate invoice adjustment path without posting an automatic credit.
- [ ] Add draft/stale-network/permission/loading recovery and keyboard labels across these controls. Commit the connected UI; do not perform incremental screenshot/polish loops before Task7.

## Task 7: One accumulated verification and native review

**Files:** Focused test modules, ignored isolated browser harness/evidence, `docs/operations/services-installments-verification.md`, `docs/operations/error-log.md`. No delegated reviewer.

- [ ] Prepare an isolated synthetic review database, private MFA staff/portal/device fixture material and preview-only communication configuration. Do not use original records for browser mutations or import fixtures into original. Preserve baseline `897873b` / `.next-websites-batch7` and the user's width patch before product edits; record the actual baseline/build/checkpoint paths, not assumptions.
- [ ] Run once: `DJANGO_DATABASE_NAME=medframe_django_station_kiosk_review_20261019 DJANGO_TEST_DATABASE_NAME=medframe_django_service_plans_test_20261020 uv run --locked --project services/api python services/api/manage.py test tests_django.test_service_catalog tests_django.test_service_cases tests_django.test_installment_schedule tests_django.test_installment_billing tests_django.test_installment_reporting tests_django.test_installment_reminders --noinput`. Both database overrides are supported by existing settings; Django creates/destroys only the distinct test database. Expected: all accumulated focused cases pass; save actual counts and failures.
- [ ] Run scoped Ruff/Prettier/ESLint, verify final generated contracts from Task5, isolated `makemigrations --check --dry-run`, and `NEXT_DIST_DIR=.next-service-plans npm run build`. Existing next.config.ts and the launcher both use NEXT_DIST_DIR. Expected: successful schema generation, no drift, zero scoped errors, completed production build/TypeScript. Record warnings honestly; do not broaden/repeat without a necessary blocker.
- [ ] Run one browser journey at desktop1440/tablet1024/phone390: create a synthetic braces definition, reorder workflow, create patient case, update step, create and review 12,000+24x2,000 agreement, issue once, record partial/early payments, inspect due/aging/refund/credit updates, portal statement and scoped kiosk summary, then archive definition and verify history remains. Also exercise a nonfinancial reader and stale review recovery. Capture/inspect all three widths together.
- [ ] Log unrelated findings with reproduction/impact/evidence; batch necessary activation-blocker repairs and use at most one focused confirmation. No third browser round or silent broader acceptance claim. Perform native in-thread review against the five Review Focus items; no subagent skill may override the user's native instruction.
- [ ] Refresh relevant frontend/backend Graphify AST corpora after final code; query service/agreement/projection/reminder edges, record excluded paths and truncation. Use sanitized Jev for a narrow release-risk judgment, retain its actual output and limits. Run the Impeccable changed-target detector once if its existing launcher is available; report failure without a download/retry loop. Document observed UI against incumbent tokens without unrelated design drift repair.
- [ ] Commit source and actual verification evidence with explicit file paths, leaving the original width edit unstaged. Do not mark failed or unexecuted acceptance groups passing.

## Task 8: Preserve data and activate the connected milestone locally

**Files:** New artifact ignore rule if needed, operations evidence, root AGENTS milestone note, this checklist. Reuse `medframe`, `scripts/checkpoint-django.py`, `scripts/checkpoint-onboarding-storage.py` and `scripts/verify-additive-preservation.py` unchanged.

- [ ] Stop owned review/original app processes through their known identities/root launcher. Inspect helper arguments and take a fresh encrypted original checkpoint plus isolated verified restore; separately verify all original storage objects. Capture fingerprints privately outside Git while traffic is stopped.
- [ ] Apply only additive service/billing/communications migrations to original `medframe_django`. Check original rows/objects and existing account/MFA/membership/clinical-permission preservation; new service-only permission/link rows are additive. Original catalog/case/plan counts remain zero until staff intentionally creates them.
- [ ] Start `./medframe start --production --dist-dir .next-service-plans`. Confirm API/web/worker/scheduler running and local frontend/backend readiness200. A necessary activation blocker permits the bounded focused repair above; unrelated deferred findings stay logged.
- [ ] Record implementation/build IDs, actual checkpoint/restore/fingerprint/object counts, applied migrations, Graphify/Jev use, staged verification/failures and limitations. Retain `.next-websites-batch7`; never roll schema back by switching UI artifacts or reverse guards over new agreement rows. Update AGENTS and this checklist, format touched docs, commit activation evidence and report the local Services link.

## Planning review and evidence

Self-review: each approved spec section maps to Tasks1–8; all five Review Focus conditions have explicit owning assertions. Interfaces keep integer projection data internal and decimal strings at JSON boundaries. Catalog/case permissions, one-invoice agreement atomicity, immutable source terms, ordinary invoice compatibility, due-aware consumers and stale manual reminders have separate owners. Verification steps deliberately consolidate execution under the user's bounded-testing preference; no per-task broad test loop or delegated review is implied.

Graphify existing backend corpus was queried again using actual previously verified vocabulary `invoice payment financial`, DFS depth2, budget600: 52 reached/23 shown, explicitly truncated. Source inspection additionally traces profile, portal, kiosk and manual reminder consumers; graph output alone does not establish those boundaries. No product code has changed, so no new graph extraction is claimed. Local output: `/tmp/medframe-service-plans-plan-graph.log`.

Sanitized Jev prioritization selected projection_first, confidence1.0, model jev-1.13.0, 421 input/34 output tokens; no secrets, patient data or private files submitted. This agrees with Tasks2–4 and is judgment rather than verified correctness. Local output: `/tmp/medframe-service-plans-plan-jev.json`.

Status: plan written and self-reviewed; waiting for user review. Native execution method is already selected and must not be asked again. No product code, migrations, tests or runtime changes were performed while preparing this plan.
