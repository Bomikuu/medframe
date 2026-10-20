# Batch 8 local expansion implementation plan

> Execution: native in this chat, following AGENTS.md. No subagents, delegated reviewer or separate chats. Accumulate checks and run once at the end; the user's bounded-verification preference overrides per-task repeated red/green runs. One integrated feature delivery and local activation.

**Goal:** Deliver permission-scoped analytics, catalog-linked specialty templates and reviewed native clinical JSON downloads.

**Architecture:** Django owns aggregates, specialty configuration, exact-revision serialization, review proofs and fresh download authorization. Extend existing native billing, onboarding specialty and encounter/template owners. The Next frontend adds one reporting workspace and focused specialty/export controls through existing same-origin CSRF/session boundaries.

**Tech stack:** Existing Django5.2/PostgreSQL/Strawberry/Pydantic, Next16.4.2/React/TypeScript/Tailwind/shadcn/RHF/Zod. No new runtime dependencies or external data services.

**Approved spec:** `docs/superpowers/specs/2026-10-20-medframe-expansion-batch-8-design.md`.

## Global constraints

- All work native; preserve the original database, storage, passwords, MFA, patient grants, immutable revisions and the user's uncommitted clinic-shell width change.
- Analytics compares7/30/90 completed clinic-local days with the preceding equal period; finances use existing authoritative currency-separated projections. No invented no-shows, waiting estimates, outcome measures or provider-attributed revenue.
- Template specialties reuse the current catalog and legacy general_medicine/dentistry/other codes. No automatic original-clinic templates, credentials or patient values.
- Export format is medframe.clinical-export/1, not FHIR/HL7/DICOM. One selected finalized revision,10minute user-bound review proof,5MiB maximum, local attachment, fresh authorization, no stored/public bundle or outbound connector.
- Optional AI remains disconnected. No automatic messages, money movement, import, public deployment or unrelated deferred-issue repair.
- Use Prettier/Ruff/readable focused modules and Tailwind/shared real controls. Consult the installed Next guides before frontend edits.

## Review focus

1. A branch/permission/grant change must remove protected reporting/export data; validate authorization on every read/download, not only when showing buttons.
2. Clinic-local midnight, zero baselines and disjoint currencies must not create misleading comparisons or a fabricated zero.
3. Removing a clinic specialty must preserve historical template readability and existing patient notes; preserve unchanged legacy/inactive template specialties during edits.
4. A selected historical export must never read the current draft, later amendment, unrelated history or private storage URLs; reject selection/proof/size/schema mismatches explicitly.
5. A previously reviewed export must fail after grant/session/device changes; file bodies/tokens must stay out of audit payloads and URLs. CSV text must not become spreadsheet formulas.

---

## Task 1: scoped analytic projections and exports

**Create:** `services/api/medframe_apps/expansion_policy.py`; `services/api/medframe_apps/analytics/{__init__,periods,queries,csv_export,views}.py`; `services/api/api_graphql/analytics.py`; `services/api/tests_django/test_expansion_analytics.py`.

**Modify:** `services/api/api_graphql/schema.py`, `services/api/config/urls.py`.

**Interfaces:** `require_native_staff(request)` requires staff realm/MFA and rejects station_credential/station_access/station_doctor. `report_period(organization, days)` returns local inclusive/exclusive date/time boundaries and period labels. `clinic_insights(request, organization_id, branch_id, days=30)` returns metadata and nullable permission-gated operations/clinical sections. Existing `financial_overview` remains the finance owner. `analytics_csv(request)` POST accepts organization_id/branch_id/days/sections and returns an audited CSV of those server-derived aggregates only.

- [ ] Define tests for allowed period lengths, midnight boundaries, equal preceding period, branch and tenant denial, patient-grant exclusion, admin-without-clinical exclusion, finance-only isolation, Station/patient realm denial and CSV formula escaping.
- [ ] Implement section policies before reading source records. Operations requires operations.read and branch scope; clinical requires patients.clinical.read and scoped_patients. Reject a requester with no supported section. No diagnosis/reason/identity fields in response rows.
- [ ] Aggregate Appointment.start/status and QueueTicket.created_at/status separately; distinct appointment patient count is not a total clinic population. Aggregate Encounter.created_at/status and current provider specialty only within allowed patients/branch. Produce zero-filled daily counts, total/current/previous metadata and a clearly labelled current-status breakdown. Use stable native status/category labels.
- [ ] Expose clinicInsights JSON in the native schema; independently audit reads. Implement POST `/analytics/export` with allowlisted sections, shared authorization/period definitions, native finance projection when requested, CSV writer, formula-prefix protection and private/no-store attachment headers. Do not trust client-supplied totals.
- [ ] Defer test execution to the accumulated verification task. Source review must map every returned section to its own permission and branch filter.

## Task 2: catalog-linked specialty configuration and templates

**Create:** `services/api/medframe_apps/providers/specialties.py`, `services/api/medframe_apps/providers/migrations/0002_specialtyconfiguration.py`, `services/api/medframe_apps/encounters/template_starters.py`, `services/api/api_graphql/specialties.py`, `services/api/tests_django/test_specialties.py`.

**Modify:** `services/api/medframe_apps/providers/models.py`, `services/api/medframe_apps/encounters/templates.py`, `services/api/api_graphql/consultation_templates.py`, `services/api/api_graphql/schema.py`.

**Interfaces:** `SpecialtyConfiguration` is an organization OneToOne/version record, without rewriting existing OrganizationSpecialty rows. `specialty_setup(request, organization_id)` returns catalog, selected codes, configuration version and safe starter definitions to native permitted staff. `save_specialties(request, organization_id, codes, expected_version, request_id)` requires organization.manage and locks the organization/configuration while applying the selected active catalog references. `template_starters` contains three fixed generic documentation-only definitions. `consultation_templates(..., specialty=None)` filters before pagination.

- [ ] Define tests for catalog/legacy compatibility, exact versions, invalid/duplicate codes, replay/conflicting replay, tenant/device/role denial, removal preserving existing references, unsupported new specialty rejection and no patient-value replacement.
- [ ] Add only the version/configuration model migration, depending on providers.0001 and onboarding specialty references. Reads report existing selection/version0 without creating records. Save reuses native request receipts/audits and advances version; no role/permission or original-clinic content seeding.
- [ ] Replace TemplateInput's three-value Literal with bounded validated specialty text. For a new/changed code require an active clinic selection or a legacy code; permit an unchanged code on an existing template even after removal. Keep old template/revision data and all existing immutable/apply behavior.
- [ ] Define Pediatrics/Dermatology/Orthopedics starter prompts/optional labels without normal values, advice or diagnoses. Return only enabled specialty starters; copying produces unsaved clinic-template form values and requires the existing explicit save action.
- [ ] Add native GraphQL setup/save fields and optional specialty filter on template query. Filter before page_records and include specialty in cursor scope. Existing calls without a filter remain compatible.
- [ ] Defer checks to the accumulated pass; never edit historical migration files or current provider specialty values.

## Task 3: reviewed exact-revision clinical export

**Create:** `services/api/medframe_apps/interoperability/{__init__,schema,records,review,views}.py`, `services/api/tests_django/test_clinical_exports.py`, `docs/interoperability/clinical-export-v1.md`, `docs/interoperability/clinical-export-v1.schema.json`.

**Modify:** `services/api/config/urls.py`.

**Interfaces:** `export_record(request, organization_id, encounter_id, revision_id, sections)` authorizes native staff, encounters.write/documents.write membership and require_encounter; selects exactly that immutable revision belonging to the authorized encounter/patient/organization. It returns a typed envelope with schema_version `medframe.clinical-export/1`. `review_export(request, data)` returns section inventory, identifying revision metadata, encoded size/digest and a signed10minute proof. POST `/interoperability/preview` and `/interoperability/download` use domain_view and existing origin/CSRF middleware; download takes the proof in the JSON body, reauthorizes and regenerates the same bound selection, returns application/json attachment no larger than5MiB. No token in a URL.

- [ ] Define tests for staff/MFA/tenant/branch/grant/role/Station denial, exact historical revision vs modified draft/later amendment, include/exclude sections and uncertainty, wrong encounter/revision, unsupported sections, size bound, proof tampering/expiry/user/selection and revoked access between review/download. Assert private/no-store attachment headers, safe filename and no object key/URL/payment/history secret fields.
- [ ] Implement explicit typed envelope sections: SOAP, diagnoses and observations default; selected dental findings/chart, anatomy findings and procedures optional. Map only exact revision.content/revision.chart data; bind the source reference metadata needed for existing geometry without fetching images/files. Preserve original certainty/codes/coordinates with no clinical conversion. Validate source data and fail an unmappable requested section explicitly.
- [ ] Use a dedicated signing salt and user/org/encounter/revision/section/digest binding. Bind the preview's generated_at timestamp in the proof and reuse it during download, so regeneration can match the reviewed digest. If current identifying metadata changes and the digest differs, require a fresh review. Live authorization must run before loading the selected source and again on download. Include no PHI in proof/audit arguments. Use generic revision-based filename, bounded JSON serialization, safe response headers and audit object identifiers/digest only.
- [ ] Generate the checked-in JSON Schema from the typed envelope and document field/source mapping, optional sections, authorization and version strategy. No conformance/receiving-system claim or import endpoint.
- [ ] Defer execution to the accumulated pass; no durable PHI bundle or new ledger/export model is necessary.

## Task 4: native analytics, specialties and record-export UI

**Create:** `apps/web/app/clinic/analytics/page.tsx`, `apps/web/app/clinic/settings/specialties/page.tsx`; `apps/web/features/analytics/{analytics-page,schema,metric-comparison,report-table}.tsx` (schema uses `.ts`); `apps/web/features/specialties/{specialty-settings,schema}.tsx` (schema uses `.ts`); `apps/web/features/consultations/export/{export-record,client,schema}.tsx` (client/schema use `.ts`); `apps/web/lib/graphql/expansion.graphql`; `.impeccable/surfaces/clinic-analytics.md`.

**Modify:** `apps/web/features/workspace/clinic-shell.tsx`, `apps/web/features/consultations/{consultation-pages,encounter-editor}.tsx`, `apps/web/features/consultations/templates/{template-editor,template-picker}.tsx`, `apps/web/lib/server/backend-proxy.ts`, `apps/web/lib/graphql/batch2.graphql`, `apps/web/schema.graphql`, generated GraphQL files, `.gitignore`, `apps/web/tsconfig.json`.

**Interfaces:** Existing workspace/useRemote/permission contracts own organization/branch selection and recovery. Analytics consumes ClinicInsights plus the existing financial overview renderer; each section renders only when permitted. ExportRecord receives the displayed exact encounter/revision IDs and delegates preview/download through the same-origin backend proxy with getCsrfToken. Shared specialty setup feeds the administrator selector, template editor starter-copy form and server-filtered paginated picker.

- [ ] Read installed Next routing/client/network guides; use Impeccable's incumbent Operate direction/craft floor, no launcher retry after this session's known failure. Preserve DESIGN tokens and all unrelated UI.
- [ ] Build analytics with branch/period controls, period/as-of labels, current/previous comparison (explicit zero baseline), compact descriptive chart and exact table, native finance panel, permitted section CSV action, empty/error/retry/loading states. Avoid revealing section data before permission/schema validation.
- [ ] Build specialty settings with versioned save/toggles and credential clarification. Add starter-copy controls and compatible specialty options to the existing template editor; never replace a dirty form without the existing unsaved-change confirmation. Add optional specialty filter to TemplatePicker, resetting cursor/selection on change.
- [ ] Add Export record only for an authorized displayed finalized revision. The protected entry sheet groups section toggles and preview metadata, names the selected version/patient, requires local-download acknowledgement, and enables download only for that current reviewed selection. A selection/version change clears the proof; errors retain the clinical page. Request/revoke a Blob URL only for the local download, never persist the bundle or silently attach it to the record.
- [ ] Allowlist only the three new POST paths in backend-proxy: analytics/export, interoperability/preview and interoperability/download. Keep existing GET file handling unchanged; add a separate POST-attachment response flag that forwards content-disposition/security/referrer headers without moving the proof into a URL or weakening origin/CSRF/body limits. Pin method/header behavior in the browser download acceptance.
- [ ] Export backend schema once after resolvers are complete, run existing codegen once, format source and add `.next-batch8`. Stage the clinic-shell navigation lines with an index-only patch so the user's existing width edit remains uncommitted and unchanged.

## Task 5: one verification pass and local activation

**Create:** `docs/operations/django-batch-8-verification.md`; targeted synthetic fixture/browser helpers and private checkpoints outside tracked source. **Update:** `docs/operations/error-log.md`, `AGENTS.md` and the relevant surface briefs with actual evidence.

- [ ] Refresh deterministic scoped frontend/backend Graphify graphs after source changes, with existing graph discovery/queries already recorded. Query actual vocabulary and document scope/warnings/truncation. Use Jev only for sanitized narrow risk/prioritization judgments. No patient information, credentials or private files submitted.
- [ ] Run once: `PYTHONPATH=services/api uv run --locked --project services/api python services/api/manage.py test tests_django.test_expansion_analytics tests_django.test_specialties tests_django.test_clinical_exports tests_django.test_templates tests_django.test_financial_overview --noinput`. Use the isolated test database; no original record mutations.
- [ ] Run scoped Ruff/format and Prettier/ESLint on changed authored files; migration drift; one production `NEXT_DIST_DIR=.next-batch8 npm run build` from apps/web. Record exact commands, exit codes and historical failures, without broad repeated suites.
- [ ] Against isolated review DB/API8001/web3001, one batched browser journey: analytics permissions/filters/CSV at desktop/tablet/phone; specialty selection, starter/template save and nonreplacement of SOAP; finalized historical export review/change-selection/download, body/version/schema validation and revoked-grant denial. Use fresh synthetic metadata instead of stale hardcoded patient names and actual roles for type=search inputs. At most one focused activation-blocker confirmation; no third browser round. Open captured images and self-review only captured scope.
- [ ] Log unrelated findings and incomplete acceptance rather than repair/retest. Necessary activation blockers may receive the single bounded repair batch/confirmation under standing authorization. Commit focused source; retain prior artifact and exact width patch.
- [ ] Stop original/review app processes, take fresh encrypted DB/storage checkpoints with a new isolated restore target, capture original fingerprints and apply only the additive specialty version migration. Verify original rows/permissions/accounts/objects before resuming traffic; don't restore the review database over original.
- [ ] Start root `./medframe start --production --dist-dir .next-batch8`; confirm API readiness, frontend and all four managed services. Record actual counts, source/build IDs, checkpoint/rollback boundaries and unexecuted assertions, then commit operational evidence. No push or external deployment.

## Plan self-review

All three approved local capabilities have backend/UI/permission/error/verification ownership. The five review-focus conditions map to tasks1–3 and the isolated browser pass. Signatures/section names stay shared between review and download; no task depends on a new clinical owner or a future AI/FHIR destination. The version/configuration record is the only anticipated schema addition. User preference retains one accumulated test pass instead of the skill template's repetitive task-by-task testing. Native execution and local activation are already selected. Written-plan review is pending; no product implementation is claimed.
