# Medframe clinical foundation design

Historical architecture: preserved at `checkpoint/pre-django-2026-10-18`. The user's Django Edition now supersedes conflicting stack, theme-default, icon, and delivery grouping decisions; see `2026-10-18-medframe-django-amendment.md`. Existing confidentiality and clinical-integrity rules remain migration requirements.

Status: architecture approved by the user on October 18, 2026. The foundation slice is implemented; later clinical slices remain pending.

Source: `docs/requirements/medframe-master-v3.txt`, supplied by the user on October 18, 2026. The master brief remains authoritative. This document translates it into domain boundaries and release gates; it does not replace the roadmap.

## Intended outcome

Build a clinical healthcare platform whose first complete release lets a dentist authenticate, register an authorized patient, review their history, conduct a consultation, select teeth and surfaces in an interactive dental chart, record findings and procedures, plan treatments, attach supporting documents, finalize the encounter, and reopen the preserved record after refresh.

The clinical workflow has no dependency on appointments. Clinical information persists in PostgreSQL. Browser state and 3D meshes are views of the medical record, never its authority.

## Inspected starting point

- The repository contains Git metadata only, with no commits, application, conventions, or existing visual implementation.
- Node.js, Python, uv, Docker Engine, and Docker Compose are available.
- No approved concept-11 logo or licensed anatomical GLB/GLTF is present in the supplied attachment directory or repository.
- No production infrastructure or external service credentials were supplied or inspected.

## Scope and delivery boundaries

Use the modular monolith and technology stack requested in the master brief. Deliver successive vertical slices, each with persistence, authorization, validation, UI, and tests.

1. **Foundation:** reproducible local services, migrations, identity, mandatory staff MFA, secure sessions, organizations, branch memberships, permission policy, audit infrastructure, login, and the clinic shell.
2. **Patient management:** registration, authorized search, demographics, history, allergies, medications, patient-level access grants, and patient record overview.
3. **Consultations:** appointment-independent encounters, SOAP drafts, structured diagnoses and observations, optimistic concurrency, finalization, amendments, and chronological history.
4. **Dental chart:** stable FDI identity, primary and permanent dentition, tooth/surface selection, independent 3D presentation, accessible 2D fallback, multiple findings, and historical revisions.
5. **Treatment and documents:** procedures, multi-visit treatment plans, progress, private quarantined uploads, scanning, authorized downloads, and the complete first-release workflow.

The first complete clinical release requires all five slices. A foundation-only delivery is not that release. The patient portal follows these slices; appointments, queues, billing, diagnostics, general anatomy, marketing pages, and the website builder retain their later roadmap positions.

A frontend-only prototype would fail the persistence and confidentiality requirements. Building all thirteen phases simultaneously would undermine the required ordering. The selected approach is the requested sequence of integrated clinical slices.

## Architecture and repository boundaries

- `apps/web`: one Next.js App Router application, strict TypeScript, Tailwind, customized shadcn/ui, React Hook Form, Zod, typed GraphQL operations, and generated contracts.
- `services/api`: FastAPI with Strawberry GraphQL, SQLAlchemy, Alembic, and PostgreSQL. Domain services own policy, transactions, validation, and clinical state transitions.
- `services/api/app/modules`: identity, organizations, patients, encounters, clinical, dental, treatments, documents, and audit. Add modules only when their slice begins.
- `packages/shared`: shared schema artifacts or generated types where useful; no duplicated business policy.
- `infrastructure`: Docker Compose and local service configuration.
- `docs`: requirements, design, implementation plans, setup instructions, and operational limitations.

GraphQL is the primary clinical API. REST handles health, session lifecycle where appropriate, and document transfer. Keep the browser on a same-origin application boundary; do not store authentication tokens in browser local storage. The web layer forwards authentication to the API without replacing backend authorization.

PostgreSQL is authoritative. Redis supports shared rate limiting and transient job coordination, not authoritative patient records. Private S3-compatible storage holds documents. Add a background worker and malware scanner in the document slice. Do not create future billing, website, appointment, or anatomy tables during foundation setup.

## Foundation data model and migration boundary

The first migrations contain identity, organizations, authorization reference data, and audit infrastructure only:

| Entity                         | Responsibilities                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| User                           | Stable UUID, normalized unique login identity, password hash, activation state, server timestamps |
| Organization                   | Tenant identity, clinic name/type, active state, timezone                                         |
| Branch                         | Organization-owned working location                                                               |
| Membership                     | User-to-organization relationship, state, branch scope                                            |
| Role / Permission              | Versioned permission definitions and membership assignments                                       |
| Session                        | Hashed opaque token, user, expiry, revocation, authentication strength                            |
| MFA credential / recovery code | Encrypted TOTP secret and hashed single-use recovery codes                                        |
| Recovery token                 | Hashed token, expiry, consumption state; successful reset revokes existing sessions               |
| Audit event                    | Actor, organization, action, resource identifiers, server time, outcome, request correlation      |

Use UUID identifiers and timezone-aware server timestamps. Persist foreign keys, unique constraints, and indexes rather than relying on application checks alone. Staff provisioning is initially invitation or administrator controlled. Provide an explicit local bootstrap command with prompted credentials; do not commit reusable staff passwords or enable open administrator registration.

Later migrations introduce tenant-scoped patient identities, patient access relationships, clinical entities, chart revisions, treatment entities, and document metadata as their corresponding workflows are built.

## Authentication and authorization

Authentication establishes user identity; authorization evaluates each requested action independently.

- Use a maintained password-hashing implementation, opaque revocable sessions, session rotation after authentication, bounded expiry, and explicit logout.
- Use HttpOnly cookies with production Secure settings and a deliberate SameSite policy. Protect state-changing endpoints against CSRF and reject unapproved origins, including cookie-authenticated GraphQL requests.
- Require staff MFA before issuing a clinical session. A pre-authentication challenge cannot read clinical data. Encrypt MFA secrets using a deployment key supplied outside source control. Verify replay protection and single-use recovery codes.
- Rate-limit login, MFA, recovery, and other sensitive operations with shared counters. Generic authentication responses must not disclose whether an account exists.
- Password recovery has expiring single-use tokens and an email-delivery adapter. Local development uses a private local mailbox. Production recovery remains unavailable until delivery is configured.
- Validate active user, session, membership, role permission, and organization scope at the API service boundary. Never accept organization IDs or role claims as proof of authority.
- A clinical patient action additionally requires an active provider relationship or explicit scoped record authorization. Patient creation can grant the registering clinician a relationship atomically.
- Receptionists can receive permitted registration/search capabilities without clinical-note permissions. A clinic administrator role does not itself grant clinical record access. Platform administrators receive no universal clinical-data bypass.
- Restrict provider reassignment and access-grant management to explicit permissions. Revocation must take effect on subsequent requests.
- Patient-portal self access and guardian grants are introduced with verified account linking in the later portal slice, rather than inferred from a matching email address.
- Scope queries before search, pagination, counts, joins, or resource loading. Denied access must not leak another tenant's patient existence or clinical details.

Clinical changes and their audit events commit together. Audit sensitive reads and denied access without storing medical note bodies, credentials, document filenames, or file contents in ordinary logs. Define restricted audit-review permissions and production retention controls before clinical deployment.

## Clinical model and record integrity

Patient registration belongs to an organization. Account identity and future authorized cross-organization sharing remain separate concerns. Matching demographics never automatically merge records or grant access.

Every clinical entity includes organization, patient, author, server timestamp, version, and encounter where applicable. Use composite constraints or equivalent database protections to prevent links across different patients or organizations.

Encounters contain responsible provider, branch, reason for visit, status, and version. Their appointment relationship is optional when appointments are added later.

Valid ordinary transitions are `Draft -> In Progress -> Completed -> Finalized`. Draft and in-progress content is editable by authorized clinicians. Completed means documentation is ready for review; returning it to In Progress is explicit and audited. Finalized content is immutable. An amendment creates an attributed, reasoned revision linked to the original; the UI can show Amended without turning the finalized original into an editable draft.

SOAP notes keep subjective reports, objective findings, assessment, and plan distinct. Structured observations, diagnoses, proposed treatments, and completed procedures remain separate records with explicit statuses.

Use expected-version checks on draft mutations. Conflicting edits return a typed conflict, preserve the clinician's local input, and require review. Autosave reports saving, saved, failure, and conflict states truthfully. Finalization validates prerequisites and locks the relevant records inside one database transaction. An autosave cannot race past finalization.

The longitudinal timeline is derived from persisted clinical events and revisions. Historical views read historical revisions; they do not recolor old charts using only today's projection.

## Dental visualization contract

- Define stable FDI identifiers for permanent and primary teeth; do not infer identity from mesh ordering or position.
- Associate each selectable mesh with explicit clinical metadata. Validate mappings against the versioned dentition reference data.
- Findings support multiple conditions and explicit affected surfaces. Selecting a surface does not apply a condition to the entire tooth.
- Current chart projections and historical chart revisions use the same persisted clinical records consumed by 2D, 3D, timeline, and printable views.
- Use React Three Fiber and Three.js for rotation, zoom, pan, tooth selection, isolation, jaw visibility, standard views, and camera reset.
- Provide keyboard-selectable tooth and surface controls with readable labels. The whole consultation workflow must work with WebGL unavailable.
- Proposed treatment previews use temporary presentation state and cannot write actual findings or mark procedures completed.
- If an approved model is unavailable, use an explicitly labeled schematic development asset with independent tooth IDs. Do not present it as patient-specific anatomy or a clinically validated model.
- No automated diagnosis or AI-generated clinical judgment is part of this release. Jev is not a clinical decision engine for this implementation.

## Treatment and document contract

Procedure records distinguish Proposed, Planned, In Progress, Completed, and Cancelled. Record completion with actor, time, tooth/surfaces where relevant, and linked encounter. Only committed authorized completion updates current chart projections. Treatment plans keep their own progression and preserve completed-item history.

Document upload requires patient access and, when supplied, a matching authorized encounter. Validate size, extension, MIME declaration, and content signature; use opaque object keys in a private bucket. New objects remain quarantined until scanned. A failed or unavailable scanner never silently marks a file safe.

Only clean, authorized documents can receive short-lived download authorization. Enforce access again when issuing a download; audit it. Use conservative disposition and preview rules for active content. Finalized encounters keep their original document-version links. New versions and attachments use explicit amendment or supplemental-record rules.

## Clinical interface direction

Mode: Operate. The primary scene is a clinician documenting care at a desk while keeping patient context in view.

Preserve the user's supplied Inter typography, navy `#0F2D4A`, medical teal `#0EA5A4`, soft teal `#22C1B6`, off-white `#F8FAFC`, and slate `#475569`. Teal controls require contrast-tested foreground/background pairs; supplied palette values do not automatically qualify for small white text.

Design dials: DESIGN_VARIANCE 3, MOTION_INTENSITY 2, VISUAL_DENSITY 5. Familiar controls, patient context, restrained borders, and consistent spacing outrank decorative expression. Use one customized shadcn/ui foundation and one icon family. Keep semantic danger, warning, and success colors distinguishable from decorative accents.

The foundation surfaces are `/login` and `/clinic` with authenticated navigation and an organization selector. The initial dashboard presents only persisted information its current modules can provide, with honest empty states and actionable setup. Add patient metrics and clinical lists with their corresponding API slices.

The complete first-release experience connects:

1. **Clinical dashboard:** authorized patient search, registration, resumable consultations, pending documentation, and treatment attention.
2. **Patient record:** persistent identification and allergy context, overview, timeline, records, dental chart, and documents.
3. **Consultation:** persistent patient header; documentation and chart work area; contextual selected-tooth/surface editor; accessible save and finalization controls. On narrow screens, panels become deliberate tabs or stacked regions without discarding unsaved input.

Retain the clinical route hierarchy in the master brief. The root can redirect to the appropriate authenticated entry until marketing exists. Do not display later modules as working capabilities.

Use visible labels, keyboard focus, accessible validation, layout-matched loading states, recoverable errors, permission-denied states, and empty states throughout. Honor reduced motion and system theme preference; verify both light and dark clinical surfaces before release.

Additional implementation requirements confirmed by the user:

- Keep source readable, with focused files, descriptive names, and expanded control flow and JSX. Do not compress components, services, or tests into single lines.
- Use Prettier for supported frontend/configuration formats and its Tailwind class-ordering plugin. Use Ruff formatting for Python, which Prettier does not format. Include format-check commands in verification.
- Prefer Tailwind utilities for layout, spacing, colors, sizing, responsive behavior, and interaction states. Reserve custom CSS for shared theme tokens, base styles, or behavior utilities cannot express clearly.
- Group form controls by purpose and use types, widths, autocomplete, and keyboard hints that match the expected value. Identity, contact information, medical history, and clinical documentation must not become an undifferentiated wall of equal-width inputs. Do not split names into compulsory components unless a real workflow requires it.
- Use circular profile-image upload affordances and avatar previews, with accessible choose/change/remove actions. Medical image and document previews preserve their complete content and aspect ratio; they are not cropped into avatars. These controls become functional with their corresponding persisted upload workflow, not as decorative inactive features.

The approved logo symbol remains pending. Use the Medframe name as text until that asset is available; do not invent a replacement medical symbol.

## Verification and acceptance gates

Each slice runs targeted backend and frontend validation. Use real PostgreSQL integration tests for transaction, tenant, constraint, search, and persistence behavior. Do not substitute SQLite as evidence that PostgreSQL protections work.

Foundation acceptance:

- A documented command starts local dependencies and applies Alembic migrations to an empty database.
- An explicitly bootstrapped staff member enrolls MFA, signs in, selects an authorized organization, opens the clinic shell, and signs out.
- Expired/revoked sessions and incomplete MFA challenges cannot open protected GraphQL operations.
- Invalid origin, CSRF, rate limit, membership revocation, and cross-organization cases have meaningful tests.
- UI routes use the real API; unavailable services surface recoverable errors.

Complete clinical-release acceptance:

- Register, find, reopen, and update an authorized synthetic patient after a browser refresh.
- Create an encounter without an appointment; save and reload SOAP notes, diagnoses, tooth/surface findings, procedures, and plans.
- Confirm that multiple findings coexist and that 2D and 3D represent identical stored records.
- Upload a supporting document, pass scanning, and retrieve it through an authorized temporary download; reject unsafe or unrelated access.
- Finalize, reject later silent mutation, record an authorized amendment, and inspect the unchanged original revision.
- Reject Clinic A/Clinic B, unrelated clinician, receptionist clinical-detail, and later Patient A/Patient B access attempts at the API boundary.
- Audit sensitive actions without leaking clinical content to routine logs.
- Complete the workflow with WebGL disabled and with keyboard controls.
- Run a batched desktop/mobile, light/dark browser inspection; fix findings together and confirm in one further bounded round. Run relevant accessibility and performance checks at the integrated release gate.

## Deployment limits and open assets

Local infrastructure is a development environment with synthetic patients. Production readiness additionally requires configured TLS, deployment keys, MFA recovery operations, email delivery, private-storage credentials, malware-scanner operations, encrypted storage/backups, restore verification, monitoring, retention policy, and appropriate privacy/clinical review. Their absence must not be represented as completed compliance.

The approved logo and a licensed, clinically reviewed dental asset remain external inputs. Their absence does not block the foundation, data model, 2D chart, or a clearly labeled development visualization.

## Review boundary

The user approved this architecture and the five-slice clinical milestone. The next artifact is a detailed, executable implementation plan for the foundation slice; later slice plans follow the same acceptance contract. Product and design context files capture the confirmed decisions without changing the supplied brand. The user reviewed the foundation plan and selected native execution. The foundation is implemented; see the verification report for results and the remaining clinical slices.
