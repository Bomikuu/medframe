# Medframe Django Edition amendment

Status: the user supplied the new written master specification and requested amendments, preservation, native execution without subagents, and multiple features per phase. This document records the amended target and migration decisions; implementation is governed by the accompanying Batch 1 plan. The user approved the plan and the connected Django Batch 1 is now implemented locally; verification and remaining clinical/production boundaries are recorded in `docs/operations/django-batch-1-verification.md`.

Authoritative source: `docs/requirements/medframe-django-edition.txt`, copied byte-for-byte from the October 18, 2026 attachment. It supersedes conflicting requirements in `medframe-master-v3.txt` and the earlier foundation design. Unchanged confidentiality, clinical-integrity, readability, formatting, form, and upload requirements continue to apply.

## What is preserved

The working Next.js/FastAPI patient-management milestone is committed as `77bf229`, tagged `checkpoint/pre-django-2026-10-18`, and retained on `codex/clinical-foundation`. Amendment work uses `codex/django-clinical-batch-1` in the same checkout.

The baseline has real identity/MFA, organization/branch permissions, audit, patient registration/search/demographics, explicit patient grants, versioned medical history/allergies/medications, timeline, retry/conflict protection, and browser failure recovery. It passed 47 PostgreSQL/Redis backend tests, 5 browser journeys against the production build, migration round-trip/no-drift checks, format/lint/type checks, and the static UX audit. Its final independent review occurred before the user's new no-subagent instruction; it is historical evidence, not authorization for further delegation.

A private backup at `/home/micxsz/.local/share/medframe/checkpoints/pre-django-2026-10-18-77bf229` contains a verified Git bundle, encrypted PostgreSQL custom-format archive, private environment copy, and checksum manifest. Directory permissions are 0700; files are 0600. The encrypted archive was decrypted and its PostgreSQL catalog validated. This is not a claim that a full restore drill was run.

Do not rewrite the saved Alembic revisions, destroy the original database, replace user passwords, or discard working frontend behaviors to make migration easier.

## Amendment map

| Area               | Preserved baseline                                                                 | Amended target                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend            | FastAPI, SQLAlchemy, Alembic, custom session lifecycle                             | Modular Django, ORM, migrations, custom UUID user, Django authentication/sessions/permissions/Admin, Strawberry and strawberry-graphql-django |
| Frontend           | Next.js, TypeScript, Tailwind, shadcn/Radix, RHF/Zod, generated GraphQL operations | Retain the working frontend architecture and suitable typed GraphQL client; extend the clinical workspace                                     |
| Default appearance | Off-white page, navy foreground, system-driven dark mode                           | White page/sidebar/header/cards, slate foreground, light mode by default, explicit saved dark/system options                                  |
| Customization      | Shared fixed semantic tokens                                                       | Organization branding plus allowed user preferences, validated presets, live preview/save/cancel/reset, persistent dashboard layout           |
| Icons              | Phosphor                                                                           | Lucide, migrated through a shared icon owner without mixed families                                                                           |
| Release unit       | Sequential smaller clinical slices                                                 | One integrated Batch 1 spanning the complete clinical workflow; internal work packages are not separate feature deliveries                    |
| Execution          | Native implementation with a final independent agent review                        | Native implementation and self-review only; no subagents or delegated reviews                                                                 |

## Django architecture and migration

Use one Django modular monolith in `services/api`, preserving the existing Next.js paths instead of moving working frontend files merely to match a suggested directory tree. Django app modules live under a nonconflicting Python package such as `medframe_apps`; each AppConfig uses a stable domain label (`accounts`, `organizations`, `patients`, `providers`, `encounters`, `clinical`, `dental`, `treatments`, `documents`, `branding`, `auditing`). Django settings, URLs, ASGI, and management entry points live in `config/` and `manage.py`.

Django 5.2 LTS with a compatible current patch is the conservative starting target; pin the tested patch and integration dependencies in the existing uv lock rather than reinstalling unrelated frontend dependencies. Its documented Python support includes this environment's Python 3.14 from 5.2.8. [Django release documentation](https://docs.djangoproject.com/en/5.2/releases/5.2/)

Use Django's synchronous transaction boundary for authorization, row locks, clinical state changes, and audit writes. Strawberry integration should call these services; do not split a transaction across asynchronous ORM calls. Use strawberry-graphql-django for intentional typed integration/query optimization, not unrestricted automatic clinical CRUD. [Django integration documentation](https://strawberry.rocks/docs/integrations/django), [Strawberry Django](https://github.com/strawberry-graphql/strawberry-django)

### Data preservation and cutover

1. Build a new Django-managed target database, initially `medframe_django`; retain the source `medframe` database untouched. Create the custom UUID user in Django's initial migration before auth-dependent migrations.
2. Implement a local-only, repeatable import command that reads the preserved source through a separate connection. Import identities, organizations, branches, memberships/roles, grants, patients, patient registration keys, clinical snapshots/list entries, timeline events, and audit history while retaining UUIDs, authors, server timestamps, versions, review states, and target membership attribution.
3. Preserve Argon2 credentials using a narrowly bounded compatible legacy hasher/encoding adapter, then upgrade through Django's password-hasher lifecycle on successful authentication. Prove compatibility using synthetic known passwords; never request, log, or reset the user's existing password as a migration shortcut. [Django password management](https://docs.djangoproject.com/en/5.2/topics/auth/passwords/)
4. Import encrypted MFA credentials, last accepted TOTP steps, and unused recovery-code hashes with the existing protected encryption key and digest compatibility. Re-enrollment is not required merely because the framework changed. Django sessions are new; require sign-in again at cutover. Do not import live login challenges, reset links, old sessions, or pending recovery emails into a new authentication context.
5. Reconcile source/target counts, identifiers, relations, versions, chronological events, and permissions; compare sensitive values in memory without logging them. Dry run and duplicate import must be safe. Detect source changes between rehearsal and final import and refuse a stale cutover.
6. Validate all old workflows and new clinical acceptance tests against the target. Pause writes during the final import/cutover, then switch backend configuration. Keep the old code/database usable for pre-cutover rollback. After new Django writes begin, rolling back requires reconciliation of those writes; never silently discard new records by pointing back to an old snapshot.

The target owns schema changes through Django migrations. Do not use unmanaged application models as a permanent substitute for migration ownership. PostgreSQL-specific append-only triggers, composite tenant constraints where needed, and indexes belong in Django migrations/SeparateDatabaseAndState where appropriate.

### Authentication, permissions, and Admin

Use `AUTH_USER_MODEL` with UUID identity, normalized email login, display name, active state, and Django's password/authentication interfaces. Django sessions supply cookies and rotation; a password-authenticated MFA challenge cannot access clinical data or Django Admin. Preserve the existing absolute/inactivity expiry, revocation, origin/CSRF, shared throttling, enumeration-safe recovery, encrypted delivery payload, and no-store behavior.

Membership roles reference Django Permission records but remain organization/branch scoped. Global user groups, `is_staff`, Django Admin login, and `is_superuser` never replace patient grants. Domain services explicitly scope before loading/search/counting; they do not treat a successful global `has_perm` check as clinical authorization. A clinician needs an active eligible membership and patient relationship; administrators/receptionists retain permitted demographics without medical-note access.

Django Admin is an operational interface, not an unrestricted editor for immutable clinical history. Use scoped querysets and explicit permission methods. Exclude or make sensitive clinical models read-only through domain-authorized views; prohibit raw edits/deletes of finalized records. An administrator cannot bypass service invariants through an inline action. Staff must complete MFA before using Admin.

GraphQL remains behind the existing same-origin Next proxy. Keep old patient operations during migration for parity, then add the requested operation names as documented aliases where needed; regenerate client contracts and avoid a silent frontend/API mismatch. Maintain safe error reporting and bounded query depth/cost/list sizes. Large note payloads require an explicit tested JSON body limit; files use separate authorized Django transfer views.

## One integrated Batch 1

Batch 1 is the release unit. It includes Django migration/parity, a white customizable shell, patients/providers, encounters, structured findings, dental charting, procedures/plans, protected documents, and the joined record timeline. Internal commits and checks enable recovery and review; they do not end the batch at scaffolding, authentication, or models.

### Appearance and shell

Default effective values are white `#FFFFFF` page/sidebar/header/card, secondary surface `#F8FAFC`, foreground `#1E293B`, supporting text `#475569`, border `#E2E8F0`, navy actions `#0F2D4A`, teal interaction accents `#0EA5A4`, and Inter. Derive accessible semantic foregrounds, focus colors, success/warning/error tokens, and dark variants centrally.

Precedence is platform defaults → organization theme → allowed user preferences. Only organization administrators can save organization branding. Users can save their own light/dark/system mode, density, sidebar state, and dashboard layout; they cannot alter another organization or grant access through a widget setting. Light is the initial default even on a dark operating system.

Use structured, validated settings: approved self-hosted font choices, bounded type/heading scales, radius presets, density presets, contained/full content width, sidebar widths 224–280px, collapsed sidebar, header presets, border/shadow/component variants, and known widget IDs/sizes/order. Reject arbitrary CSS, HTML, scripts, font URLs, invalid colors, duplicate widget IDs, oversized configurations, and inaccessible color combinations. UI preview uses the same validator/resolver as persistence. Cancel restores persisted effective configuration; reset is explicit and remains an unsaved preview until Save.

`/clinic/settings/appearance` contains a live preview, Save, Cancel, Reset to default, organization/user scope, and conflict/retry states. Update mounted controls through CSS variables without a reload. Render effective mode before paint to avoid a wrong-theme flash. Dashboard widgets use real authorized counts/lists for patients, recent/draft encounters, pending treatments, and documents; absent data gets honest empty states.

The shell includes responsive expanded/collapsed navigation, breadcrumbs, contextual actions, organization switcher, search, account menu, and actual user-scoped notifications from clinical/document events. Do not add a decorative notification bell or a fake unread count.

### Encounters and record integrity

A provider starts an encounter directly from an authorized patient, without an appointment. ProviderProfile and specialty membership identify the responsible clinician, without inventing credential verification. The workspace keeps patient identity/allergy/medication context alongside reason, SOAP, diagnoses/observations, dental findings, procedures/plans, and documents.

Ordinary transitions are Draft → In Progress → Completed → Finalized. Returning Completed to In Progress is explicit and audited. Amended is a derived presentation of a finalized record with an authorized finalized amendment; the original finalization stays immutable. Separate amendment drafts capture original version, author, time, and required reason.

Draft saves/autosave use an encounter aggregate version, serialized writes, explicit saving/saved/failure/conflict status, and memory-only recovery. A conflicting response preserves input for review. Lock the encounter for all saves/finalization/amendments; stale autosave cannot mutate a finalized encounter.

Keep patient-reported concerns, observations, suspected/confirmed/resolved diagnoses, plans, and completed procedures distinct. Free-text terminology initially supports later codes; do not fabricate a validated diagnosis catalog or infer a diagnosis from a symptom. Finalization validates patient/provider/branch, record content, references, document safety, and expected version, then commits immutable revisions, chart/treatment projections, timeline, and audit atomically.

### Dental integration

Use one versioned FDI reference for permanent/primary teeth and valid surfaces. Store IDs explicitly in both 3D mesh metadata and keyboard-operable 2D controls; never infer a tooth from mesh order. Support multiple concurrent findings, affected surfaces, condition/severity/status, jaw visibility, view reset/presets, isolation, rotation, zoom, and pan.

A tooth finding belongs to the current encounter draft. Draft 2D/3D views show the same saved draft overlay. The longitudinal finalized chart changes only when the encounter or amendment is finalized. Preserve chart revisions and link historical events to their exact saved revision; a later chart cannot recolor an old visit.

The approved clinical GLB/GLTF is still unavailable. Build the interactions using an explicitly labeled, repository-owned schematic development model with stable independently selectable teeth, and preserve the full 2D workflow when WebGL fails. Do not present the schematic as anatomically validated or patient-specific. Integrate the chart in the consultation workspace rather than building an unrelated editor.

### Treatments, documents, and branding assets

Procedure states remain Proposed, Planned, In Progress, Completed, Cancelled. A proposal cannot update a completed-treatment chart. Plans contain ordered items and linked encounter/procedure records; show basic progress and history in Batch 1, with richer comparison/follow-up work in Batch 2. Later changes to finalized clinical procedure evidence use an amendment or new encounter, never a silent overwrite.

Use private S3-compatible storage through Django's storage abstraction. Add local private object storage, a scanner, and Celery only for the now-required uploads/branding/scan jobs; reuse Redis for shared throttling and the job broker. Keep job payloads to opaque identifiers and exclude medical bodies/filenames from logs.

Clinical files allow a bounded initial set of JPEG/PNG/WebP/PDF up to 20MiB; DICOM is a later integration. Validate declared type, extension, signature, size, ownership, and optional encounter association. Quarantine until a successful scan; unavailable scanners stay pending. Downloads require fresh authorization, clean state, audit, and short expiry. Use conservative previews/disposition and immutable document versions. Finalization cannot treat a quarantined/failed attachment as a clean record; remove the draft association explicitly or wait for successful scanning.

Logo/profile assets use the same real persisted pipeline with tighter image limits and decoded/re-encoded content. Clinic logos retain their proportions; circular choose/change/remove controls apply to profile avatars. Keep the Medframe wordmark until the approved concept-11 asset is supplied; do not invent a replacement symbol. Branding settings cannot reference arbitrary untrusted URLs or embed active content.

## Phase roadmap

| Phase / batch                    | Connected deliverable                                                                                                                                                               | Release acceptance                                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Clinical foundation          | Django parity/import, appearance/branding/shell, patients/providers, SOAP/diagnoses/encounters, integrated 2D/3D dental draft, procedures/plans, protected documents/history        | Complete doctor, branding, and isolation workflows from the Django master spec; preserve baseline accounts/patients and refresh persistence |
| 2 — Advanced clinical experience | Improved model/controls and historical comparison, multi-step plans, record filtering/previews, consultation templates/draft management, verified read-only patient/guardian portal | Authorized historical/portal views reflect exact finalized records; patient-reported data remains separate                                  |
| 3 — Clinic operations            | Provider schedules, availability, booking/rescheduling, check-in, receptionist queues, estimates, real-time staff/patient updates                                                   | Appointments and encounters remain separate; no public patient identity disclosure                                                          |
| 4 — Financial communication      | Billing/payments, authorized notifications/SMS/reminders/follow-ups                                                                                                                 | Authoritative calculations and delivery/retry controls                                                                                      |
| 5 — Diagnostics                  | Referrals, center acceptance, protected sharing/results, clinician review                                                                                                           | Explicit cross-organization authorization and audit                                                                                         |
| 6 — General anatomy              | General-practice body regions, skeletal models, annotations                                                                                                                         | Accessible persisted clinical annotations with validated asset boundaries                                                                   |
| 7 — Public websites              | Clinic sites, builder/templates, previews/revisions/publishing/SEO                                                                                                                  | Explicit publication boundary and no clinical information leakage                                                                           |
| 8 — Expansion                    | Analytics, specialties, interoperability, optional assistance                                                                                                                       | Feature-specific validation; no autonomous clinical diagnosis                                                                               |

Do not create later-phase database tables during Batch 1 or start public websites/appointments early. Do not call Django parity alone the completed first batch.

## Verification and execution

Implement natively with no subagents. The user's new instruction overrides the earlier independent-agent finish-review requirement. Use self-review, focused tests, real PostgreSQL/object storage/scanner checks, browser journeys, and a single integrated build checkpoint.

Batch acceptance covers: preserved identity/password/MFA/grants/history; registration/search/edit/refresh; walk-in encounter SOAP/diagnosis/dental surfaces/procedures/documents; draft reload and conflict recovery; immutable finalization/amendments; exact historical chart retrieval; branding save/cancel/reset and user preference precedence; tenant isolation and clinical denials; scanner failures/private downloads; WebGL-off/keyboard/mobile/light/dark; real dashboard values.

Report actual migration IDs, completed workflows, test results, unfinished assets/infrastructure, and next-batch priorities. Neither a copied specification nor a Django scaffold is evidence of a working clinical batch. The approved implementation plan and batch evidence document the delivered local workflow.
