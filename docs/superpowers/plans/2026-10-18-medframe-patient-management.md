# Medframe Patient Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user has already selected native execution; preserve that choice.

**Goal:** Authorized staff can register, find, reopen, and update a synthetic patient; an authorized clinician can maintain attributed medical history, allergies, and medications without exposing unrelated records.

**Architecture:** Extend the existing FastAPI/Strawberry modular monolith with a tenant-scoped patients module and PostgreSQL constraints. Keep demographics separate from clinical revisions, require explicit patient grants for clinical access, and expose typed GraphQL operations through the existing protected proxy. Extend the shared clinic layout so every patient route uses the same organization context and authorization lifecycle.

**Tech Stack:** Existing Next.js App Router, TypeScript, Tailwind v4, shadcn/Radix, React Hook Form, Zod, graphql-request/codegen, FastAPI, Strawberry, SQLAlchemy, Alembic, PostgreSQL, pytest, Playwright, Prettier, and Ruff. No additional runtime service is required.

**Spec:** `docs/superpowers/specs/2026-10-18-medframe-clinical-foundation-design.md`, especially patient management, authorization, clinical integrity, interface direction, and acceptance gates. `docs/requirements/medframe-master-v3.txt` sections 7, 8, and Phase 2 supply the patient requirements. This implements the second slice of the already approved architecture.

## Global Constraints

- "The clinical workflow has no dependency on appointments."
- "PostgreSQL is authoritative."
- "A clinic administrator role does not itself grant clinical record access."
- "Matching demographics never automatically merge records or grant access."
- "Scope queries before search, pagination, counts, joins, or resource loading."
- "Clinical changes and their audit events commit together."
- "Use expected-version checks on draft mutations."
- "Use synthetic patient data during development."
- Preserve the existing brand, shared controls, system light/dark theme, 44px control height, Phosphor icons, and accessible error/focus behavior.
- Keep focused, expanded source; run Prettier with Tailwind sorting for supported files and Ruff for Python. Use Tailwind utilities for layouts and states.
- Group forms by identity, contact/address, emergency contact/guardian, and medical information. Store one full name without requiring Western name components.
- The circular profile upload requirement remains in force for the persisted private-upload slice. Do not add an inactive upload button or store medical images in public assets/browser storage.
- Consultations, SOAP notes, diagnoses, dental charts, documents, appointments, patient accounts, and billing retain their later slice boundaries. Do not create placeholder routes that resemble working features.
- Do not log GraphQL variable values, patient search terms, medical text, passwords, cookies, or MFA material. Sensitive reads and writes require safe audit events.

## Review Focus

1. A doctor from the correct organization but without a patient grant must not discover that patient's identity through search, counts, profile IDs, or clinical history. Task 2 owns the search/profile tests; Task 3 owns clinical denial tests.
2. Branch reassignment, role removal, membership deactivation, and grant revocation must affect the next request, including a previously open browser tab. Tasks 2, 4, and 6 own these tests.
3. A timed-out registration followed by retry must return one patient, while two clinicians editing the same version must preserve the losing clinician's input. Tasks 2, 3, and 6 own these tests.
4. Missing allergy information must remain visibly unreviewed, distinct from an explicit report of no known allergies. An empty medication list must not silently mean no medication. Tasks 3 and 6 own these tests.
5. Unicode full names, calendar dates, long addresses, small mobile screens, and literal `%`/`_` search characters must remain usable without timezone drift, SQL wildcard expansion, or horizontal page overflow. Tasks 2 and 6 own these tests.

## Delivery decisions

### Permissions and scope

All operations first require a live MFA-authenticated principal, active organization/membership, the relevant persisted permission, and branch scope. A membership with a branch can access only patients registered at that branch; an organization-wide membership can access its organization's branches. Branch transfer is outside this slice; patient IDs cannot be used to bypass branch filtering.

| Permission                    | Default roles                                              | Additional patient restriction                                                                                  |
| ----------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `patients.register`           | doctor, dentist, receptionist, clinic administrator        | Choose an authorized branch; creation does not imply clinical access for administrative roles                   |
| `patients.demographics.read`  | doctor, dentist, nurse, receptionist, clinic administrator | Clinicians/nurses need an active patient grant; administrative directory scope is separately permitted below    |
| `patients.demographics.write` | doctor, dentist, receptionist, clinic administrator        | Clinicians need an active grant; administrators/receptionists need directory permission                         |
| `patients.directory.manage`   | receptionist, clinic administrator                         | Allows demographics/search within organization and branch, never medical information                            |
| `patients.clinical.read`      | doctor, dentist, nurse                                     | Requires active patient grant                                                                                   |
| `patients.clinical.write`     | doctor, dentist                                            | Requires active patient grant                                                                                   |
| `patients.access.manage`      | clinic administrator                                       | Can grant/revoke eligible clinical memberships within own branch scope; does not grant clinical read permission |

Keep platform administrator defaults unchanged. An administrator who also holds a clinician role still needs a patient grant. A registering doctor/dentist receives a patient grant in the registration transaction. A receptionist/administrator can register without selecting a clinician, then explicitly assign an eligible clinician through access management. A guardian contact is demographic information, not a portal authorization.

Eligible assignees must be active organization/branch-compatible memberships with `patients.clinical.read`; validate eligibility on every assignment and every clinical request. An inactive or newly ineligible membership cannot retain access through a stale grant. Revocation is audited and the grant is retained as an inactive relationship.

### Patient and history contract

- `Patient`: UUID, organization, registration branch, opaque reference, full name, optional date of birth, optional sex recorded for care, optional email/phone, optional address, emergency contact fields, guardian contact/relationship fields, demographic version, registering actor, and server timestamps. Birth dates are PostgreSQL `DATE`, never midnight timestamps. Sex choices are `female`, `male`, `intersex`, `not_recorded`; do not infer gender identity or clinical conclusions.
- Name is required, 1–160 trimmed characters; other names/relationships are at most 160, phones 40, email 254, address 500. Optional date of birth cannot be in the future in the organization's timezone. No arbitrary minimum age; accept an unknown date. Optional supplied email uses the existing email-validator dependency. Normalize empty optional fields to null.
- `PatientAccessGrant`: organization, patient, membership, active state, grantor, timestamps, and revocation attribution. Uniqueness on patient/membership; composite foreign keys bind both patient and membership to the same organization. Add a unique `(id, organization_id)` constraint to memberships as needed.
- `PatientClinicalRevision`: append-only patient-level history snapshot, organization, patient, integer version, author, server time, medical history, relevant conditions, past procedures, allergy review state/items, and medication review state/items. Foreign keys prevent cross-tenant ownership; unique patient/version prevents duplicate revisions. History remains separate from future encounter notes and structured diagnoses.
- History/conditions/past procedures each have a 2,000-character limit. Each structured list allows at most 20 entries. Allergy entries contain substance (120), reaction (240), and severity (`unknown`, `mild`, `moderate`, `severe`); medication entries contain name (120), dose (80), frequency (80). These are clinician-entered records, with no automated interaction checking or diagnosis. Optional revision reason is at most 240 characters.
- Clinical history input has an additional combined 12,000-byte UTF-8 JSON limit, checked in both form and service, so individual field limits cannot collectively exceed the existing 16KiB request boundary. Show an actionable inline size error and retain entered content. Keep generated clinical operation documents compact enough to fit the remaining request budget; test a Unicode input at the combined limit through the real proxy.
- Each review state is `unreviewed`, `none_reported`, or `recorded`. `recorded` requires at least one item; the other states require an empty list. New patients have no clinical revision and display both states as unreviewed. Explicit clinician submission creates version 1, even when the clinician records no known allergies or no current medication.
- No overwrite/delete of clinical revisions. Expected clinical version 0 means no prior revision. Lock the patient before checking the expected version and appending the next revision; preserve old revisions and authors. A conflict returns `CONFLICT` without saving any clinical content or success audit.
- `PatientEvent`: patient, organization, action, actor, server time, optional clinical revision ID. Write registration, demographics updates, clinical revisions, and access changes in the same transaction as their mutation. Timeline queries return only permitted event classes; administrative callers never see clinical events, summaries, or clinical revision counts. Do not copy medical text into event labels or ordinary audit rows.
- Use `MFP-` plus 12 random base32 characters for display references, unique within an organization; retry collisions. References are identifiers, never authorization secrets. Do not merge on name, birth date, email, phone, or reference from another organization.
- Registration accepts `requestId: UUID!` generated once per form attempt. Persist organization, actor, request ID, patient ID, and a canonical validated-input digest in a `PatientRegistrationRequest` table with a unique organization/actor/request constraint. Concurrent retries serialize on that key and return the same committed patient; a reused key with different content returns `CONFLICT`. A failed transaction consumes no key. Recheck authorization before returning a replay.
- Search accepts query up to 160 characters, `first` 1–50 (default 20), and an opaque UUID cursor. Order by patient UUID and fetch one extra row for `hasNextPage`; reset pagination when query/organization changes. Search full-name substring or reference prefix with escaped LIKE metacharacters and bound parameters. Enforce scope in SQL before filtering, counting, or pagination. Use a name trigram index and reference index; provision `pg_trgm` explicitly in the migration.
- Return only ID, reference, full name, and optional date of birth in directory rows. Clinical detail is a separate authorized query. No contact information or clinical search previews. Authorized count and recent-access lists use the same scope as search, never all organization patients.

## File ownership

| File(s)                                                                                                                                                  | Responsibility                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `services/api/app/modules/patients/models.py`, `schemas.py`, `validation.py`                                                                             | Persistence, focused typed service inputs/results, and input limits              |
| `services/api/app/modules/patients/policy.py`                                                                                                            | Shared tenant/branch/patient SQL scopes and grant eligibility                    |
| `services/api/app/modules/patients/registration.py`, `demographics.py`, `search.py`                                                                      | Atomic registration, versioned demographic edits, scoped directory/profile reads |
| `services/api/app/modules/patients/history.py`, `access.py`, `timeline.py`                                                                               | Clinical revisions, grant lifecycle, and permission-filtered history             |
| `services/api/app/modules/patients/graphql.py`                                                                                                           | Strawberry inputs/DTO mapping and patient query/mutation mixins                  |
| `services/api/app/graphql/schema.py`, `limits.py`, `services/api/app/main.py`                                                                            | Compose schema, safely enable bounded mutations, and sanitize execution errors   |
| `services/api/app/modules/organizations/permissions.py`, `service.py`                                                                                    | Permission defaults and current effective workspace capabilities                 |
| `services/api/migrations/env.py`, `versions/*_patient_management.py`                                                                                     | Patient schema registration and additive migration after foundation              |
| `apps/web/features/workspace/workspace-provider.tsx`, `clinic-shell.tsx`, `clinic-overview.tsx`                                                          | Shared live organization/auth context, layout, and real patient overview         |
| `apps/web/features/patients/patient-directory.tsx`, `patient-form.tsx`, `identity-fields.tsx`, `contact-fields.tsx`                                      | Search, registration/edit form controller, and grouped demographic inputs        |
| `apps/web/features/patients/patient-overview.tsx`, `clinical-history-form.tsx`, `clinical-list-fields.tsx`, `patient-timeline.tsx`, `patient-access.tsx` | Authorized patient summary, clinical editing, history, and access controls       |
| `apps/web/lib/graphql/patients.graphql`, `workspace.graphql`, `generated.ts`                                                                             | Typed operations and generated contracts                                         |
| `apps/web/app/clinic/layout.tsx`, `page.tsx`, `patients/**/page.tsx`                                                                                     | Shared layout and real patient routes                                            |
| `services/api/tests/test_patients_*.py`, `apps/web/tests/patients.spec.ts`                                                                               | Real persistence, security, concurrency, and browser regression coverage         |

## Task 1: Patient persistence and enforceable boundaries

**Interfaces:** Define Pydantic `RegisterPatientInput`, `UpdateDemographicsInput`, and `SaveClinicalHistoryInput` using the fields/limits above. Define `PatientScope(organization_id: UUID, membership_id: UUID, branch_id: UUID | None, directory_access: bool)`; `resolve_patient_scope(db, principal, organization_id, permission) -> PatientScope`; and `scoped_patients(scope: PatientScope) -> Select` in `policy.py`. Clinical scopes always require an active eligible grant regardless of directory access.

- [ ] Add `test_patients_schema.py` assertions that cross-organization grants/revisions/events and nonexistent branch references fail actual PostgreSQL foreign keys; duplicate references, patient/version, and registration request IDs fail unique constraints.
- [ ] Run the targeted test and establish that patient tables are absent before adding the migration.
- [ ] Implement the models, Pydantic limits, composite keys, indexes, permission seeds, and additive Alembic migration. Add an append-only trigger to clinical revisions using the audit table's established approach. Downgrade removes only this slice's schema and permission seeds, retaining foundation defaults.
- [ ] Implement permission/scope resolution with active organization/membership and branch predicates. Never fetch a patient by primary key first and authorize afterward.
- [ ] Apply migration to the isolated test database, run the schema tests, then run `alembic check` against the same database. Verify downgrade/upgrade only in that disposable database. Commit the patient persistence boundary.

## Task 2: Registration, authorized directory, and demographics

**Interfaces:** `register_patient(db, principal, context, organization_id: UUID, data: RegisterPatientInput) -> Patient`; `search_patients(db, principal, context, organization_id: UUID, query: str = "", first: int = 20, after: UUID | None = None) -> PatientPage`; `get_demographics(db, principal, context, organization_id: UUID, patient_id: UUID) -> Patient`; `update_demographics(db, principal, context, organization_id: UUID, patient_id: UUID, data: UpdateDemographicsInput) -> Patient`. `PatientPage` contains `items`, `end_cursor`, `has_next_page`, and `total_count` for the authorized filtered scope. Updates require `expected_version` and increment demographic version once.

- [ ] Write `test_patients_registration.py`: doctor registration grants that doctor access atomically; receptionist registration grants no clinical access; duplicate demographics create independent records; concurrent same-request retries create one patient/grant/event; same request ID with changed payload conflicts; audit failure rolls back patient and replay key.
- [ ] Write `test_patients_directory.py`: tenant/branch/unrelated-clinician scope applies before search, pagination, and total count; unauthorized and missing IDs yield the same `NOT_FOUND` message. Confirm literal `%`, `_`, Unicode names, reference prefix, valid cursors, page bounds, empty results, and server-side field limits. Add a query-plan check on a sufficiently populated synthetic test dataset confirming index availability without brittle exact timing assertions.
- [ ] Write `test_patients_demographics.py`: calendar dates remain dates, unknown DOB works, future date is rejected using clinic timezone, optional empty fields become null, and stale version cannot overwrite a newer edit. Role/membership/branch changes affect the next request.
- [ ] Run these files to establish failures, then implement scoped services and safe read/write audits. Lock patient before demographic updates; use unique registration keys with transaction-safe conflict handling rather than an unchecked read-then-insert.
- [ ] Run all four patient test files against real PostgreSQL; commit working registration/search/demographic services.

## Task 3: Attributed medical history and meaningful review states

**Interfaces:** `read_clinical_history(db, principal, context, organization_id: UUID, patient_id: UUID) -> PatientClinicalRevision | None`; `save_clinical_history(db, principal, context, organization_id: UUID, patient_id: UUID, data: SaveClinicalHistoryInput) -> PatientClinicalRevision`; `list_patient_events(db, principal, context, organization_id: UUID, patient_id: UUID, first: int = 20, after: str | None = None) -> PatientEventPage`; `list_clinical_revisions(db, principal, context, organization_id: UUID, patient_id: UUID, first: int = 20, after_version: int | None = None) -> ClinicalRevisionPage`. Events page by `(created_at, id)` descending; encode both values in an opaque cursor and validate it. `PatientEventPage` contains items, end_cursor, and has_next_page. `ClinicalRevisionPage` contains items, end_version, and has_next_page, ordered by descending revision version. All list sizes are bounded 1–50.

- [ ] Write `test_patients_history.py`: no revision is unreviewed; explicit none differs from missing data; incompatible review-state/item combinations fail; attribution and prior content survive later saves; append-only triggers reject UPDATE/DELETE; oversized histories/lists fail safely. Clinical read/write is denied to administrators/receptionists even if they can edit demographics.
- [ ] Add two concurrent same-version saves against PostgreSQL: exactly one new version/event/audit commits and the other returns `CONFLICT`; an audit failure rolls back the revision. Validate a grant revoked before the write prevents saving. Define the serialization point by locking the patient for both grant lifecycle and clinical writes.
- [ ] Write `test_patients_timeline.py`: registration/demographic events are available to administrative staff; clinical event existence/count/content and revision bodies are absent from administrative queries. Grant-management events require `patients.access.manage`; clinicians see their permitted clinical/registration/demographic events. Server timestamps and cursor ties order consistently.
- [ ] Establish failing tests, then implement history, validation, revision/event projections, and sensitive-read audits. Do not use ordinary audit logs as the clinical timeline source.
- [ ] Run targeted tests and prior patient service tests; commit attributed clinical history.

## Task 4: Explicit patient access management

**Interfaces:** `list_eligible_assignees(db, principal, context, organization_id: UUID, patient_id: UUID, query: str, first: int = 20) -> list[AssigneeSummary]`; `list_patient_grants(db, principal, context, organization_id: UUID, patient_id: UUID) -> list[GrantSummary]`; `set_patient_access(db, principal, context, organization_id: UUID, patient_id: UUID, membership_id: UUID, active: bool) -> GrantSummary`. Summaries contain membership ID, display name, branch label, and active state where applicable; no login identities. Eligibility search is bounded and management-only.

- [ ] Write `test_patients_access.py`: only explicit managers can grant/revoke; foreign organization, incompatible branch, inactive member, or nonclinical role is ineligible; repeated identical changes are idempotent; reactivation preserves attribution in events. Revocation removes clinical and clinician-directory access on the next request.
- [ ] Add a deterministic revocation/write race test: both operations lock patient first, then grant; writes starting after committed revocation fail, and writes serialized before it remain attributed. Neither path deadlocks through reverse lock ordering.
- [ ] Establish failures, implement management using Task 1 scope and Task 3 lock ordering, and verify no manager obtains clinical-read rights from performing a grant.
- [ ] Run patient authorization and concurrency tests; commit access management.

## Task 5: Protected GraphQL mutations and generated contracts

**Interfaces:** Compose `PatientQuery`/`PatientMutation` into the existing schema. Queries: `clinicPatients`, `patientDemographics`, `patientClinicalHistory`, `patientClinicalRevisions`, `patientTimeline`, `patientAccessGrants`, `eligiblePatientAssignees`. Mutations: `registerPatient`, `updatePatientDemographics`, `savePatientClinicalHistory`, `setPatientAccess`. Every patient operation includes organizationId; every resource operation includes patientId. Add `permissions: [String!]!` to `clinicWorkspace` using current effective database permissions; UI capability checks are advisory only.

- [ ] Write `test_patients_graphql.py`: authenticated CSRF-bound mutation succeeds/persists; unauthenticated, MFA-challenge-only, expired, revoked, foreign-origin, missing-CSRF, and cross-tenant calls fail. Administrative query requesting clinical fields gets a safe denial rather than hidden clinical data. Mutation aliases/fragments cannot bypass per-service policy.
- [ ] Update query-limit tests: allow exactly one query or mutation operation, reject subscriptions/multiple operations/batching, retain depth 8, cost 100, parse limit 2,000 tokens, body 16KiB, and production introspection restriction. Limit a mutation document to one root mutation field, counting fragment/alias expansion, to prevent partial side effects across independent top-level writes. Service commits are not deferred into Strawberry response serialization.
- [ ] Add a log-capture test with synthetic sensitive variable values and a resolver failure. Assert neither request values nor exception internals appear in logs/responses. Configure Strawberry's execution-error reporting to suppress its default raw exception logging; retain safe code/request-ID diagnostics. Domain failures map to `NOT_FOUND`, `FORBIDDEN`, `INVALID_INPUT`, or `CONFLICT`; unexpected errors use a generic `INTERNAL_ERROR`.
- [ ] Implement DTOs and thin transaction-owning resolvers. Clinical DTOs remain separate from demographic DTOs. Add permissions to workspace output; preserve the existing no-store proxy and authentication boundary. Do not expand path allowlists for clinical REST endpoints.
- [ ] Export schema and run `npm run codegen`; add focused documents/fragments, rerun codegen, and verify deterministic output. Run GraphQL/patient suites plus the foundation security suite; commit the typed patient API.

## Task 6: Patient registration, directory, record, and history UI

**Interfaces:** `WorkspaceProvider` supplies current user, organization, branches, effective permissions, refresh, and organization switching. `ClinicShell({ children })` owns shared navigation/header/error states; `ClinicOverview` owns `/clinic` content. Patient route components use the same provider; do not initialize unrelated organization selections per page.

**Routes:** `/clinic/patients` directory; `/clinic/patients/new` registration; `/clinic/patients/[id]` demographic/authorized clinical overview; `/clinic/patients/[id]/edit` demographic edits; `/clinic/patients/[id]/history` authorized timeline and clinical revision history. Clinical history editing is a bounded section on the patient overview. Access management is a separate section rendered only for managers. Add only working Overview/Patients navigation items.

- [ ] Before code changes, read relevant installed Next guides required by `apps/web/AGENTS.md`; apply Impeccable, Design Taste, and the paired frontend/premium production guidance already selected for this project. Update `DESIGN.md`, `UX-CONTRACT.md`, and premium capability ownership for patient forms/table/pagination/status feedback before introducing competing patterns.
- [ ] Write `apps/web/tests/patients.spec.ts` using real seeded clinician, administrator, receptionist, unrelated clinician, and two organizations. Cover registration -> search -> open -> refresh -> edit -> reopen; verify administrator can register/edit demographics and assign a clinician while clinical history stays denied. Seed synthetic data only; do not change the user's administrator account or weaken MFA.
- [ ] Refactor the existing shell into layout/provider/overview while preserving login, MFA, organization switching, refresh, and sign-out. Keep organization ID in a nonsecret URL context that survives reload; validate it against live authorized organizations and never persist patient details in storage or query strings. Internal patient links preserve organization context. Clear mounted patient data and ignore late responses when the organization/session changes; return to directory before rendering a record under another organization.
- [ ] Implement `PatientDirectory`: labeled name/reference search submitted explicitly so queries are not sent per keystroke; search terms remain in memory and out of URLs. Use a semantic table on wider screens, labeled stacked rows on narrow screens, bounded pagination, real authorized count, and loading/empty/no-match/error states. Never display contact or medical details in rows.
- [ ] Implement `PatientForm` with identity, contact/address, and optional emergency-contact/guardian fieldsets. Full name spans the name row; DOB uses a bounded date input, sex a short select, email type=email, phones type=tel, address multiline. Preserve patient/guardian names as full-name fields. Generate the registration request ID once, retain it across retry, and replace it only after a confirmed success/new form. On success navigate to the persisted patient and announce success; on error retain all input and focus error summary/first invalid field.
- [ ] Implement demographics edit and the clinical history section using separate versions and mutations. Display patient name/reference/DOB and authorized allergy status clearly; never render clinical query data for administrative roles. Use explicit "Save patient details" and "Save medical history" actions with saving/saved/error/conflict states. Do not autosave this slice. A conflict preserves local values and offers an explicit load-latest action with discard confirmation; never silently overwrite or merge clinical information.
- [ ] Implement allergy/medication review states and add/remove entry controls using RHF field arrays with visible labels and limits. Unknown stays "Not reviewed"; only explicit `none_reported` says "No known allergies reported" or "No current medication reported". Switching to an empty-list state prompts before discarding filled entries. Show author/time/version for saved medical history; render old revisions read-only.
- [ ] Implement access management with eligible-assignee search, current grants, and explicit grant/revoke actions. Revocation uses a focused confirmation naming the staff member; retain focus and announce result. Render history with server timestamps and allowed event classes; no fake consultation, treatment, chart, document, or financial entries/actions.
- [ ] Replace the foundation-only overview text with real authorized patient count, find/register actions permitted for the current role, and up to five distinct recently accessed authorized patients derived from successful patient-read audits. Scope before deduplication/limiting; revoke removes previously accessed patients. No consultation/treatment widgets until their slices exist.
- [ ] Add browser failure assertions: failed registration retry creates one record; offline saves preserve input; stale edit conflict retains entered text; role/grant revocation then focus refresh clears private data; delayed response after organization change cannot restore old data. Stop rendering clinical data on permission denial. Clinical errors cannot be treated as an empty medical history.
- [ ] Verify Unicode names, long addresses, future DOB errors, literal wildcard search, compact input widths, keyboard-only add/remove/navigation, light/dark, 390px mobile, and accessible validation. Run axe on directory, registration, and clinical overview in one desktop/mobile/theme batch; inspect screenshots containing synthetic data only. Run Prettier, lint, typecheck, and targeted browser tests. Commit the patient workflow.

## Task 7: Integrated verification and next-slice handoff

**Files:** Update `README.md`, `docs/operations/production-readiness.md`, `docs/operations/patient-management-verification.md`, `.github/workflows/ci.yml`, `premium-ui.json`, and `docs/operations/premium-audit.json` as needed by the actual implementation.

- [ ] Prepare/migrate the isolated PostgreSQL database with `uv run --project services/api python scripts/prepare-test-db.py`. Run patient tests and then the full backend suite sequentially; do not run suites concurrently against the truncating fixtures.
- [ ] Verify fresh upgrade and upgrade from the foundation revision in disposable databases, including permission seeds and `pg_trgm` availability. Preserve local development identities and the user's administrator/MFA state when applying the additive development migration.
- [ ] Run `npm run codegen`, `npm run format:check`, `npm run lint`, `npm run typecheck`, API Ruff checks, and the full browser suite against real services. Update foundation tests that asserted obsolete foundation-only copy to assert real workspace behavior instead. Make one production build at this integrated checkpoint.
- [ ] Review desktop/mobile and light/dark screenshots in one batch; repair concrete findings and confirm once. Run the premium strict audit with current capabilities and record accessibility results. Do not claim zero findings unless the checks actually passed.
- [ ] Perform one fresh whole-branch review under the preserved native execution method, addressing authorization, tenant leakage, optimistic concurrency, audit/log redaction, and observed UI states. Resolve material findings before reporting completion.
- [ ] Document measured results, production limitations, exact account provisioning/role commands, and what the slice actually implements. Keep the administrator role's lack of clinical bypass explicit. Note that encounters, dental visualization, and private uploads remain necessary for the complete milestone.
- [ ] Commit the verified patient-management slice; do not push or deploy without a corresponding instruction. Report the next slice as appointment-independent consultations.

## Self-review and execution handoff

- Coverage: patient registration/search/profile/demographics are Task 2; medical history/allergies/medications/revision history and timeline are Task 3; explicit record authorization is Tasks 1/4; real typed API is Task 5; grouped accessible clinical UI is Task 6; integration evidence is Task 7.
- Review Focus items have named service/browser assertions. Clinical and demographic versions, organization context, grant eligibility, and operation names match across tasks.
- This plan preserves the approved phase ordering. Patient identity remains tenant-local with no implicit cross-clinic merge/account linking; patient portal/guardian authorization and private profile uploads retain their later boundaries.
- Native execution is already chosen. This plan is prepared for user review under the writing-plans handoff; implementation has not begun.
