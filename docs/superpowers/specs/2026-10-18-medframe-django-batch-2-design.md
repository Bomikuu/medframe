# Medframe Batch 2 — Advanced Clinical Experience

Status: written design approved by the user with “yes” on October 18, 2026. The implementation plan is prepared for its required written review; product implementation has not started. The user requested the next phase and explicitly selected **clinic verification followed by an invitation** for linking a portal account to an existing patient. Native execution without subagents remains the selected method.

## Outcome and preserved baseline

Deliver one connected Batch 2: clinicians can compare historical dental states, manage ordered treatment and follow-up work, find/preview records, and use reusable consultation templates; verified patients and explicitly authorized guardians can read the records their clinic makes available. Patient-submitted information stays separate from clinician-confirmed records.

The current Django Batch 1 remains running. Commit `da3d519`, branch `codex/django-clinical-batch-1`, and tag `checkpoint/django-batch-1-2026-10-18` preserve it. The older `77bf229` checkpoint, encrypted backup, source database and imported identities remain intact. Batch 2 uses `codex/django-clinical-batch-2` in the same checkout. No reset, re-import, external publication or deployment is part of this phase.

Authority: `docs/requirements/medframe-django-edition.txt` sections 18 and 28, the Django amendment, root `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, `UX-CONTRACT.md`, and the user's invitation-policy answer. The earlier master scope remains authoritative where unchanged. This document makes the new access and historical-review behavior concrete; it does not establish legal identity-verification procedures for a clinic.

## Delivery approach

Recommended: extend the existing Django monolith and shared shadcn/Tailwind interface, delivering the six connected capabilities together. Existing encounters, exact revisions, dental metadata, treatment evidence, private files and safety primitives remain canonical.

Two alternatives were considered: a clinician-only phase would defer the requested patient portal; a portal-only phase would leave historical review and treatment/document improvements incomplete. Neither meets the written Batch 2 grouping as well as one integrated release. Internal implementation tasks may have separate tests/commits, but are not separate feature handoffs.

There are two asset boundaries: the approved Medframe symbol and a clinically validated anatomical GLB are still unavailable. Improve the repository-owned schematic geometry and interactions, retain explicit development labeling, and keep a replaceable asset contract. Do not claim anatomical accuracy, generate diagnostic images or invent a replacement product logo.

## 1. Dental history and improved schematic rendering

Use the current 52 FDI identifiers and valid surface vocabulary, independent of mesh order. Improve the schematic crown shapes, spacing, selected-surface emphasis, orientation labels and selected-tooth details. Keep permanent/primary dentitions, upper/lower visibility, tooth isolation, camera presets/reset and orbit controls. Hidden geometry must remain excluded from pointer intersections. Selection must stay synchronized with the complete keyboard-operable 2D controls.

Add a patient dental-history workspace with two explicit finalized revision selectors and a current-finalized option. Historical sides read their stored immutable chart snapshots; a current side reads the current finalized projection. Draft overlays are a separately labeled mode inside the active consultation and are excluded from historical comparisons.

Compare findings using stable finding keys and explicit tooth/surface/status values. Show additions, changed details, explicit resolved states and findings absent from the displayed snapshot. Absence must never be labeled as clinical resolution, extraction or healing. Amendments remain separate selectable revisions; a later amendment cannot change the earlier side of a comparison.

The existing stored chart is a bounded summary of up to five findings per tooth. State that limit on each comparison. Full tooth-specific finding/procedure evidence remains available through paginated preserved visit history; do not present a summary difference as a complete clinical conclusion. Reference labels use the patient's anatomical right/left, with the displayed camera/view orientation stated explicitly.

Show tooth-specific treatment history and links to the exact procedure/encounter revision. Preserve the old GLB for metadata regression and keep all clinical data expressed as identifiers rather than geometry coordinates. A model failure or WebGL-disabled device retains the same forms, selection, save, comparison details and historical links in 2D.

## 2. Ordered treatment work and clinician-authored follow-ups

Extend the existing basic plans with editable/reorderable incomplete items, preserved versioned item descriptions/statuses and an attributed change history. Reorder uses buttons as well as any optional drag interaction. A completed item retains its finalized matching procedure evidence; reordering or editing another item cannot rewrite completed evidence.

Expose proposed/planned/in-progress/completed/cancelled distinctions consistently. Progress is completed items divided by non-cancelled items; cancelled items remain visible in history, and an empty/all-cancelled plan displays no active items instead of 100% completion. Retried additions/reorders require request keys and expected plan versions. Additions and updates serialize with concurrent completion/reordering.

Add manual clinician-authored follow-up instructions (up to 4,000 characters) with an optional date, patient/plan association, author and open/completed/cancelled state. Date-only intent is preserved in the clinic's timezone. A follow-up is not an appointment or a provider-availability reservation. Do not infer recommendations, medication advice or medical urgency from diagnoses.

Connect patient records, plan progress and the existing follow-ups dashboard widget to these persisted entries. Portal visibility uses an explicit released snapshot described below; staff-only edits do not silently publish new patient content.

## 3. Record filtering, historical review and protected previews

Add bounded server-side filters to consultation/history/document lists: status/type, author/provider where permitted, date range, tooth where applicable, and a bounded literal-text search over authorized record labels/reasons. Use keyset pagination and preserve meaningful filter/list position on return. Reset pagination when filter scope changes. Do not send clinical search text into access logs or persist it in browser storage.

Patient record views must keep the organization/patient context visible and link to exact history, encounter, chart, treatment and file versions. Search/count/filter operations enforce the same live role, branch and patient grants as opening the record. No hidden widget or search count reveals restricted patients or notes.

Provide full-framing image previews with zoom/fit controls and a PDF page preview. Fetch only freshly authorized clean bytes through the existing private transfer boundary. PDF rendering must disable active content, evaluation, embedded links/actions and external resources, use a local worker, and bound page rendering and pixel dimensions. Inspect the chosen renderer's current primary documentation and dependency audit during implementation; do not use a public viewer service or public medical-file directory.

Preview errors leave the record list and authorized download action usable. Cancel stale requests and revoke temporary object URLs on close/context changes. A late response cannot display another patient's file. Exact historical attachments continue to use their preserved version IDs rather than the latest document version. Pending, rejected and unavailable scans remain unavailable for preview/download.

## 4. Consultation templates and draft management

Introduce clinic-scoped, versioned templates containing a name, specialty tag and plain-text SOAP prompts/observation-label guidance. Templates provide structure, never preconfirmed normal findings, diagnosis certainty, procedures, tooth conditions, medication instructions or completed care. No patient record is automatically copied into a reusable clinic template.

Authorized clinicians can create/edit/archive templates within their clinic. Existing applications continue to reference the exact template revision even after a newer version or archive. Applying a template to a draft records its revision and preserves existing typed clinical values. Prompts remain visibly separate from recorded patient facts; only clinician-entered values become clinical evidence.

Application is a versioned, idempotent encounter operation. It cannot cross completion/finalization or race with autosave. Unsaved input is explicitly saved or deliberately retained before applying, using the same safety/confirmation owners. A stale response keeps local input and offers deliberate reconciliation.

Add filters for draft and completed-review consultations, clear saved/unsaved/conflict states, and resume links in the dashboard. Preserve serialized autosave, composition handling, activation-generation guards, memory-only unsaved drafts, replay keys, browser history behavior and the existing explicit Save action. Do not store medical drafts in localStorage/IndexedDB.

## 5. Verified invitations, patient/guardian links and authentication

### Account linking

The selected policy is **clinic verifies identity, then issues an invitation**. A matching email, patient reference, date of birth, name, guardian field or successful password login alone never grants access to an existing chart. There is no public patient-record search or automatic email-based attachment.

An authorized clinic administrator or clinician with a new scoped `portal.manage` permission opens an accessible patient and records a verification attestation: self/guardian relationship, verification method category and a short non-sensitive staff note. Staff attest that identity and, for guardians, authority were checked under the clinic's procedure. Existing emergency/guardian text fields are not authorization proof. Do not collect identity-document numbers or images as part of this initial feature.

The invitation binds organization, patient, intended normalized email, relationship, issuer and attestation. Tokens are cryptographically random, stored as digests, single-use, expire after 24 hours, and can be revoked/reissued. Reissue revokes the prior unconsumed invitation. Only one successful claim is possible under concurrent requests. Mail delivery uses the encrypted outbox/Celery boundary, not sensitive broker payloads.

Deliver the token in an invite-page URL fragment, exchange it through a CSRF-protected POST, then clear the fragment. Never log or expose it in query strings, notification previews or audit payloads. An invitation grants no access before completed account authentication/MFA and an atomic active patient-link creation.

A new identity chooses a password under the existing Django validators and completes authenticator enrollment/recovery-code acknowledgement. An existing identity must sign in and verify MFA; accepting an invitation never resets its password, replaces its MFA or changes staff permissions. The authenticated identity must match the invited email. A second clinic/patient requires a separate verified invitation.

Support one self link and multiple explicitly verified guardian links as needed; each relationship remains an independent organization/patient authorization. Deactivate/revoke links without deleting historical attribution. Invitation/link/revocation events are append-only audited. Clinic administrators may administer links but cannot release clinical notes without their existing clinical permission and patient grant.

### Native authentication and session boundary

Reuse Django's UUID user, password hashing, DB sessions, TOTP/recovery controls, CSRF/origin enforcement, expiry/revocation and throttling. Do not introduce a parallel password database or a custom token-authentication system.

Use an explicit staff/patient session realm. One browser session uses one realm at a time; switching sign-in surfaces ends/rotates the former session and requires the target realm's sign-in. This avoids a second custom cookie/session implementation. The UI explains that switching ends the current workspace session and uses the shared unsaved-change guard.

Staff endpoints require the staff realm plus existing domain permissions. Portal endpoints require the patient realm plus an active link on every read/download. Portal users receive no clinic membership automatically. A patient-realm session cannot call staff GraphQL, mutate a clinical record or open operational Admin, even if the same human separately has a staff membership. Existing staff sessions are migrated/recognized only as staff sessions; they never imply portal access.

Recovery/reset remains enumeration-safe and preserves the verified relationship; a reset is not a patient-linking mechanism. Expiry/logout/revocation clears private portal UI state. Staff password/MFA/session behavior and existing administrators remain compatible.

## 6. Patient-visible records and separate reported information

### Explicit clinical release

Identity verification and clinical publication are separate decisions. New links initially expose basic identity/relationship information and an honest empty records state. A clinician with live clinical permission and patient grant chooses what records are made available, previews the patient-facing result, and confirms release.

Store immutable, versioned patient-visible releases referencing exact source revision IDs and exact clean document-version IDs. The release includes a clinician-authored patient-facing summary and explicitly selected sections, such as diagnosis/its certainty, reviewed notes, chart snapshot, completed procedures, treatment-plan snapshot and follow-up instructions. Internal notes, draft content, other patient records, staff alerts/audits and identity secrets are excluded by default and cannot leak through generic model serialization.

All references must match the organization and patient. Source clinical records stay unchanged. An amendment, plan update or replacement document does not automatically change an already published release; a clinician reviews and issues a subsequent release. The portal marks the author and as-of date. A release may be withdrawn with a reason and audit event; access stops on the next request while its historical attribution remains preserved.

Both active patient links and active released-record scope are required. Revocation is rechecked when issuing and consuming a short-lived file ticket. No unrestricted clinical DTO or staff signed download ticket is accepted as portal authority.

### Portal screens and reports

Routes are under `/portal`: invitation acceptance, sign-in/MFA/recovery, dashboard, patient/clinic relationship selector and read-only record/history, dental, treatment, document and follow-up detail views. Staff keeps `/clinic`. Use the same real shadcn primitives and validated branding foundation, with a simpler patient navigation and no staff action affordances.

The portal dental chart displays the released snapshot in synchronized 2D/3D selection/detail mode without mutation controls. Documents and treatment progress reflect the released version, with clear as-of labels. Do not silently combine current private chart data with an older release.

Patients/guardians may submit separate text reports categorized as history, allergy, medication or other information. Reports are attributed to the submitting linked identity and patient, limited to 6,000 characters and 12KiB UTF-8, immutable and explicitly patient-reported. They cannot mutate confirmed diagnoses, medication/history revisions, chart findings or procedures. The portal shows receipt/review state.

Clinicians can acknowledge/review reports through their live patient grant. Any reconciliation into confirmed history uses the existing attributed history-edit workflow; no automatic merge or default clinical conclusions. A review link may reference the resulting same-patient history revision, with the original submission preserved.

## UI and ownership

Keep the approved white/light default, saved dark/system behavior, safe self-hosted fonts, clinic-scoped branding and circular staff/profile controls. Existing official shadcn `radix-nova` sources remain canonical; add new primitives through the official CLI only when needed and fix the stale icon-library config to Lucide without overwriting customized primitives.

Separate focused forms for template definition, follow-up entry, invitation/verification, release review and patient-reported input. Use appropriate date/status/relationship controls and widths, accessible fieldsets, plain labels, 44px targets, app-owned destructive/unsaved dialogs and keyboard alternatives. Keep clinical previews uncropped. Preserve readability, Prettier, Ruff and Tailwind-first styling.

| Owner                                                                       | Batch 2 responsibility                                                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `medframe_apps/encounters/`                                                 | Template definitions/revisions/application provenance, draft filtering, unchanged immutable finalization boundaries |
| `medframe_apps/dental/` and existing encounter chart owner                  | Snapshot comparison and paginated tooth evidence; stable reference/model metadata                                   |
| `medframe_apps/treatments/`                                                 | Versioned plan edits/order/history and manual follow-up instructions                                                |
| `medframe_apps/documents/`                                                  | Authorized filter/preview transfer and exact-version protection                                                     |
| New `medframe_apps/portal/`                                                 | Verified invitations/links, patient-visible releases, reports, portal-specific policy and services                  |
| `medframe_apps/accounts/`                                                   | Native auth/session realm, compatible MFA/recovery and encrypted invitation outbox support                          |
| `api_graphql/`                                                              | Explicit staff capability extensions and a separate portal schema/DTO whitelist                                     |
| `features/consultations`, `dental`, `treatments`, `documents`, new `portal` | Connected clinical/portal UI, shared data/interaction contracts and stale-request guards                            |
| `apps/web/lib/server/` and route adapters                                   | Fixed portal endpoint allowlist, session/CSRF forwarding and no-store behavior                                      |

Migrations are additive, preserve UUIDs/passwords/MFA/history, and add tenant constraints, expected-version uniqueness and append-only guards. Test forward/reverse boundaries only in disposable PostgreSQL databases. No source re-import or patient-ID rewriting.

## Acceptance and verification

The implementation plan must pin these workflows and their failure paths:

1. A clinician applies a versioned template, enters real synthetic notes, resumes a draft, saves/finalizes it and reopens the preserved version. Template prompts never become recorded facts automatically.
2. Two dental revisions compare consistently in 2D/3D, including amendments and multiple surfaces; summary absence is not called resolution. Historical tooth procedures open exact evidence. WebGL-disabled/keyboard operation works.
3. A clinician reorders/updates incomplete plan steps, completes one with matching finalized evidence, adds a dated follow-up and sees real dashboard progress. Conflicting updates preserve local input and completed evidence.
4. Record filters paginate and restore without widening discovery. Clean image/PDF previews use private bytes; rejected/pending scans, expired tickets, revoked grants and stale cross-patient responses are denied/cleared.
5. Clinic staff verify a synthetic identity/guardian relationship, issue an invitation, and the invited person completes password/MFA activation. A reused/expired/revoked/wrong-email token cannot create a link; simultaneous claims produce at most one result.
6. Before clinical release the portal shows no private clinical records. A clinician previews/releases selected exact evidence; only the linked patient/guardian can read it. Later amendments remain private until separately released. Withdrawal/link revocation closes access on the next read/download.
7. Patient-reported text appears separately and can be reviewed without changing a confirmed record automatically. A patient session cannot call staff mutations or Admin. Clinic B, another patient, a former guardian, and a deactivated account cannot discover/read the released content.
8. All eight Batch 1 browser journeys remain green, including existing administrator permissions, unsaved navigation, offline/conflict recovery, appearance isolation and private uploads. Run new real PostgreSQL/security/concurrency tests, actual storage/scanner/mail delivery checks, schema determinism, Prettier/Ruff/lint/type checks and strict static UI audit.
9. Run one integrated production-build/browser checkpoint after connected implementation; repair concrete failures before claiming completion. Batch desktop/mobile/light/dark/keyboard/2D/WebGL-off/preview review natively, without delegated agents. Record actual counts, migration IDs, limitations and commands.

Keep licensed clinical geometry/logo validation, production SMTP/network/secrets/backup/monitoring/capacity work and deployment approval explicit. Patient access is tested locally with synthetic identities and Mailpit; do not send invitations to real people as part of development verification. Scheduling, queues, billing, public websites and diagnostic collaboration remain later batches.

## Review decision

The invitation-linking policy is confirmed. The consequential additions proposed for this phase are clinician-controlled release of exact record versions, separate patient-reported submissions, and one native Django session realm at a time. The user has reviewed and approved this written design. The concrete plan is `docs/superpowers/plans/2026-10-18-medframe-django-batch-2.md`; its written review precedes native implementation. This document is a design artifact, not a claim that Batch 2 is implemented.
