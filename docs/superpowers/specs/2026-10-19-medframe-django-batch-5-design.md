# Medframe Batch 5 — diagnostic collaboration

Status: design and native plan approved by the user. Source implementation is saved with failed bounded verification and unfinished items; Batch 5 is not active. See `docs/operations/django-batch-5-verification.md` for actual scope and B5-001 through B5-005. Native execution only, no subagents.

## Outcome and authority

Deliver the connected workflow in `docs/requirements/medframe-django-edition.txt`, sections 22 and 30: a doctor requests diagnostic work; the patient selects an authorized center; that center accepts, records examination and uploads results; the doctor is notified and reviews those results. Support X-ray centers, laboratories and other diagnostic providers with protected sharing and auditing. Prepare internal extension points for later DICOMweb/FHIR adapters without claiming those integrations exist.

Success means one persisted request can complete that journey across actual clinic, center and verified patient accounts, retaining an attributable result and review history. A center receives a referral-specific package, never general access to the originating clinic or patient directory. Existing clinical records and finalized encounters remain intact.

## Proposed approach and alternatives

**Recommended: referral-scoped collaboration between existing Django organizations.** A diagnostic center has its own organization, staff memberships and profile. An explicit clinic–center partnership authorizes patient selection. A new diagnostics domain owns requests, selected attachments, assignments, result submissions and reviews. Existing Django authentication/MFA, patient policy, private storage, scanning, audit and notifications remain authorities.

A clinic-only referral log with staff uploading external results would be smaller, but would omit patient selection and center acceptance/upload. A separate third-party diagnostic portal/PACS would add an external service, credentials and data transfers, while still requiring the same local access rules. Neither is the selected scope.

Assumptions proposed for review: centers are provisioned by a platform operator through native Django administration/a narrowly scoped management command, not public self-registration; clinic administrators authorize partnerships; existing verified patient/guardian links perform selection; no payments, live SMS/email, AI diagnosis, diagnostic image measurement or external PACS connection are added. This is one connected feature batch rather than a series of user handoffs.

## Identity, partnerships and access

- A `DiagnosticCenter` belongs to one active organization and records name, center type, supported modalities and an accepting-requests flag. Provisioning creates native accounts/memberships without changing existing accounts. Passwords are set through the existing secure setup/reset path or a local interactive management command, never printed or committed by automation. Staff enrollment/MFA remains mandatory.
- A `DiagnosticPartnership` links originating clinic and center, with active/suspended state and attributed events. Clinic administrators can authorize/suspend their own partnership with a registered center. A center controls whether it accepts referrals. Neither side can establish memberships in the other organization through this workflow.
- Use the existing staff authentication realm for center personnel. A diagnostic operator role has only its own workspace and diagnostic permissions. Do not add clinical, patient-directory, billing or organization-management permissions to this role. Clinic and center permissions are checked on every operation against the selected organization; dual-role users gain no implicit cross-context access.
- Clinicians need live patient clinical access, an active provider profile and diagnostic request/review permission. Administrators/receptionists do not acquire clinical referral contents through operational roles. Clinic administrators manage partnership metadata without seeing referral questions or files.
- Patients/guardians use the existing separate patient realm and live `PortalLink`. They see issued request summaries, authorized center choices and progress, with no staff-only clinical question or unreleased result content. A revoked link cannot view or select a center.
- Center staff see only requests explicitly assigned to their own active center under an active partnership and active sharing grant. They receive the submitted question, requested test/body region and a minimum identity package: patient name, clinic patient identifier, date of birth and sex where recorded. No contact, allergy, SOAP, dental history, unrelated attachments or directory access is inferred.
- Every query, mutation, upload and file delivery rechecks user/membership/organization/partnership/referral scope. Signed tickets are user-, referral-, assignment-revision- and exact-version-bound, expire after 60 seconds and are not public object URLs. Delivery rechecks live access, so previously minted tickets fail after withdrawal, reassignment or suspension. Revocation prevents subsequent requests; it cannot retract bytes already downloaded.

## Request workflow and persistence

Proposed focused modules live in `services/api/medframe_apps/diagnostics/`, with policy, inputs, services, queries, results, files and administration separated by responsibility.

A `DiagnosticRequest` belongs to the clinic organization, branch and patient, optionally an encounter, and has an ordering provider, request number, aggregate version, status and sharing state. Fields include category/modality, test name, clinical question, body region, urgency (routine/urgent), requested-by date and optional preparation instructions. Urgency labels do not promise emergency handling. Input limits: test name 160 characters, region 120, clinical question 4,000, instructions 2,000 and at most 20 selected file versions.

Lifecycle:

1. Clinician prepares a **draft**, explicitly selecting any existing clean patient document versions and a clinically appropriate minimum identity package. Drafts are invisible to patients/centers.
2. **Issue** freezes an attributable request revision and changes status to **awaiting center**. The verified patient can select from active authorized centers supporting the requested modality. If the patient lacks portal access, an authorized clinician may record assisted selection with an explicit reason; the UI identifies who selected the center. Administrative assignment does not pretend to be patient consent.
3. Selection changes status to **sent** and records an assignment revision. No real outbound message is required; center requests appear in the center inbox. Selection is not acceptance.
4. Center may **accept** or **decline**, with an attributed decline reason. Decline returns the request to **awaiting center**. A patient may change the selection only before acceptance; a clinician can recall an accepted request with a reason before submission, invalidate the old assignment and return to selection. Old-center access is revoked immediately on the next authorization check.
5. Accepted center records **examination performed**, including time and operator attribution, before submitting results. Invalid/future examination timestamps are rejected. Uploads alone do not mean performed, submitted, reviewed or diagnosed.
6. Center submits a clean result revision; request becomes **results available** and an internal notification is created for eligible clinic reviewers.
7. Clinician reviews the exact revision, records interpretation/next steps and acknowledgement, and the request becomes **reviewed**. Center-authored conclusions remain distinguished from the clinician’s assessment. Reviewing a result does not modify a finalized encounter or create a diagnosis automatically.

Clinicians can cancel unsubmitted work with a reason. Cancellation/recall and result submission serialize on the request lock so a cancelled assignment cannot submit afterwards. Sharing can be withdrawn independently, including after results/review, without deleting retained clinical evidence. Suspended partnerships immediately block partner reads/writes; resumption requires the partnership and referral sharing both to be active. The clinic retains its own submitted clinical evidence after external access is withdrawn.

Use UUID request receipts for externally retried mutations, expected-version checks and transaction-level aggregate locks. Scope is checked before returning a replay result. Composite foreign keys/checks prevent cross-clinic patient/branch/encounter links and wrong-center assignment/result attachments. Append-only request revisions, assignment events, result submissions and reviews retain actor/time/reason. Django Admin must not bypass immutability. All lists and history are paginated, default 20 and capped at 50; detail does not serialize unlimited event histories.

## X-ray sharing, uploads and results

Reuse private `Document`/`DocumentVersion` storage and the existing immutable-byte, SHA256, quarantine and ClamAV process. Diagnostic uploads belong to the originating clinic/patient and reference the authorized referral/result draft; the uploader may belong to the center. Add an explicit diagnostic purpose and association guards through additive migrations.

This requires deliberate changes to `documents/services.py`, document constraints and scanning notifications: current non-clinical purposes use workspace/branding rules and image resizing. Diagnostic content must never fall through those rules or be treated as an avatar. Isolate reusable metadata/byte/scan helpers from authorization, add explicit purpose handling, and keep the existing staff upload endpoint clinic-only. Diagnostic upload/download endpoints authorize through diagnostics policy. Existing clinical/logo/avatar behavior remains covered by the focused document regressions.

Allow JPEG, PNG, WebP and PDF up to the existing 20 MiB limit. Clinical files preserve full framing and bytes; profile images remain circular only in profile UI. File signature checks and existing PDF active-content rejection apply. Raw DICOM archives and arbitrary URLs are rejected with a supported-format explanation. Provide secure image/PDF preview and original download, not a calibrated diagnostic workstation. Window/level, measurements and DICOM processing are future work.

Request attachments reference exact clean versions at issue. Center result drafts hold structured report text (up to 12,000 characters), examination time, optional external report/accession reference (120 characters) and at most 20 file versions. Permit a text-only laboratory report, but every referenced attachment must be received, clean and associated with the current request/result draft. A pending/rejected/unavailable scan cannot be submitted or downloaded. Center notification links must resolve to its diagnostic request, not a clinic patient route.

Submission freezes report text, manifest, version hashes, authorship and examination metadata. Corrections create a new attributed result revision with a reason; they never overwrite a submitted report. A correction after review returns the request to **results available**, retains the original review against its exact revision, and requires a new clinician review. Old reviews are visibly marked as earlier-version acknowledgements. Result replay cannot generate duplicate revisions or duplicate notifications.

Patients can see workflow progress immediately, but results require an explicit clinician release. Extend the existing release selection to allow reviewed diagnostic report snapshots and their exact clean attachments; do not expose all diagnostic documents through generic portal document discovery. Existing release preview/digest/withdrawal behavior applies. An unreleased or corrected newer revision is never substituted into an older published release. Download rechecks current release and PortalLink authorization.

## API and integration boundaries

Staff GraphQL gets diagnostic setup/partnership, clinic request page/detail, center inbox/detail and action mutations. Patient GraphQL gets own issued-request page/detail, authorized center choices and selection. Each adapter delegates to domain policy rather than duplicating permissions. API contracts and generated frontend clients follow the existing export/codegen workflow.

Integrate permission-gated navigation, patient record Diagnostics tab, provider context checks, portal selection, internal unread notifications and explicit release controls. Notifications contain generic diagnostic state/resource identifiers, no report text, identity package or filename; links resolve live authorization. Query/attachment access and transitions are audited without logging report content, passwords, object keys or ticket bodies.

Persist opaque local accession/external-reference fields and isolate a future adapter boundary for request/result exchange. Do not advertise FHIR conformance, DICOMweb connectivity, provider credentials or regulatory/anatomical validation. No integration credentials are required for this local batch.

## Interface direction — Impeccable, Operate

Extend the established clinical desk rather than introducing a new visual identity: current Manrope/Jakarta, navy actions, teal selection, cool canvas, shared shadcn/Radix controls, Lucide and Tailwind. Incumbent evidence inspected: `.impeccable/review/batch4-activation/billing-1440.png`, `DESIGN.md`, billing page and patient access source. Launcher `impeccable context` failed with permission denied; context was read directly as the skill requires. No launcher permissions were altered or design drift repaired.

- **Clinic `/clinic/diagnostics`:** patient/branch/date/modality/state filters and paginated referral rows. Primary action is New request. No decorative statistics or synthetic counts. Patient context precedes request fields. Detail uses a compact patient/request header, status with current sharing state, frozen request package, active result/report pane and an attributed paginated activity section. New results place **Review result** at the top.
- **Center `/clinic/diagnostic-inbox`:** current center is explicit; only assigned requests appear. Detail places Accept/Decline, Record examination or Submit result according to live state. Full-frame report/image preview sits beside the report on desktop and above it on mobile. Shared request attachments and center-authored results are visibly separate.
- **Patient `/portal/diagnostics`:** simple progress rows and a center-selection form showing authorized name, type, modalities and recorded address. Never invent availability, distance or pricing. Display the current selection and clear replacement rules. Results link only to explicit published releases.
- **Partnership settings:** administrators manage center authorization without clinical contents. Empty states explain registration/authorization and the next permitted action. An inactive center/partnership explains why selection or action is unavailable.
- Forms divide patient/context, test/question, timing/instructions and shared files. Result entry divides examination, report and attachments. Shared clinical files retain full framing. Use real scan/progress/status states, labelled controls, focus recovery, pending/conflict errors and unsaved-work protection; preserve text on errors. Confirmation is reserved for issuing/sharing, submission, recall, cancellation and withdrawal.
- Desktop detail is a task-focused two-column layout; 390px stacks without page overflow, clipped actions or forced horizontal report scrolling. The key interaction is an explicit sharing preview: reviewers see exactly which request fields and document versions the center will receive before issue. No implicit sharing of the patient chart.

Before UI implementation, read Impeccable’s craft floor and persist a concise development-only direction contract for these extension routes. Existing visual-world choices remain fixed; no image generation, alternate branding exercise or unrelated UI repair is needed.

## Preservation and bounded verification

Source baseline: `33f0950`, tagged `checkpoint/pre-batch5-2026-10-19`; proposed work branch `codex/django-diagnostics-batch-5`. Current `.next-batch4`, original database and running API/web/worker/beat remain in place. No database was changed during design.

Before product changes/migration rehearsal, take an encrypted checkpoint and verified new database clone using the existing helper. Review API/web use dedicated ports, isolated Redis/broker/throttle keys and no production workers; external transports stay disabled. Never reset credentials, overwrite original data with a clone or discard subsequent writes. Activation requires a fresh preservation boundary and additive original migrations only after the bounded pass establishes a usable result; log blockers rather than silently retrying repairs. No push/public deployment.

Accumulate one focused verification pass after connected implementation:

1. Domain/API tests: cross-organization/branch/patient/realm denial; center role cannot use clinic clinical routes; partner suspension, user/link revocation, reassignment and withdrawal invalidate future tickets/actions; authorized patient selection and clinician assistance; exact result review/correction; source immutability, input bounds, replay and cancellation/submission concurrency.
2. Real private-storage/ClamAV document regression plus diagnostic clean submission/download, quarantine refusal and purpose authorization; preserve clinical/logo/avatar rules. A mocked scanner does not establish real scan acceptance.
3. Scoped Ruff/ESLint, migration drift and one production build including TypeScript. No repeated full-suite/build loop.
4. One paced browser journey across synthetic doctor, center and verified patient accounts, desktop/390px together: issue, patient selection, center acceptance/performed/real upload, clean submission, notification/review, explicit release and revoked download denial. Inspect screenshots once and record actual assertions, page errors and geometry findings. Do not claim unexercised DICOM, accessibility, clinical or production readiness.

Failures go to `docs/operations/error-log.md` without repair/retry until requested, per the user’s standing instruction. Update operations evidence, PRODUCT, AGENTS and the plan; commit source without pushing. This document is design, not a claim that any Batch 5 feature or test is complete.

## Actual Graphify and Jev design use

Graphify’s existing Django structural graph contains 254 files, 1,610 nodes and 6,732 edges. Reflections reported no prior marked outcomes. Vocabulary expansion selected only present terms: `[document, version, upload, download, patient, membership, portal, release, notification, realm, provider, audit]`. Bounded outgoing-call traversal traced `require_document()` and upload services to patient/membership policy, `download()` to live realm/release checks, `publish_release()` to preview/idempotency and notifications to permission-resolved targets. Direct source inspection established document-purpose SQL guards and current staff/patient realm limits; the structural graph does not prove SQL or runtime security. No new diagnostics graph coverage is claimed. Raw trace is in ignored `.impeccable/review/batch5-design/backend-graph-trace.txt`.

Jev 0.7.0 / `jev-1.13.0` evaluated a sanitized architecture summary. It selected `cross_org_revocation`, confidence 1.0, over result lifecycle and responsive forms, using **582 input / 51 output tokens**. That judgment places revocation/ticket isolation first in review; it is not verification. No patient data, credentials or private attachment was submitted. Raw response is in ignored `.impeccable/review/batch5-design/jev-design-priority.json`. No product tests or new graph extraction were run during design.
