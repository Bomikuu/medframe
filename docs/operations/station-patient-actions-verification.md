# Doctor Station patient actions — October 21, 2026

## Implemented scope

The doctor Station has a selected-patient header/safety overview, circular native photo control,
consultation history, current queue/upcoming provider visits, guarded switching and native recent
patients. Patient actions are available from both the patient workspace and an open consultation.
Existing editor/draft/lease/version/finalization owners remain; modal drafts have a separate safety
provider, and leaving an encounter uses its unsaved-work guard.

A positive Station allowlist reuses the shared menu for consultation start/continue, history,
treatments, diagnostics, documents/photos, explicit sharing, booking/rescheduling, check-in/walk-in,
read-only service progress and permitted received-payment recording. Demographic/access/invoice
administration, refunds/credits, service agreements, catalog settings and queue reordering are
excluded. Diagnostic detail stays in the modal. Missing payment authority has explanatory text.
No permissions are automatically granted.

Doctor-code GraphQL capabilities permit necessary native roots with server JSON-action limits:
billingAction only payment; operationsAction only book, reschedule, check_in and walk_in.
Patient-filtered appointment/invoice/service lists are required. Delegated financial/operational/
service scope intersects clinical patient grants. Financial Station requests require an active
doctor profile, native permissions and configured paired-device functions. Services omit financial
agreement context. Legacy exact-encounter access retains narrower restrictions. These describe
implementation, not verified security behavior.

New POST stations/patient supplies authorized portrait/count/queue/upcoming/optional native balance
context through existing proxy/Station middleware. Payment review, invoice version and idempotency
reuse native billing owners. Recording received money does not charge a card or add a processor.

## Preservation and activation

No migration/schema, original account/password/MFA/role/grant or device-function changes. No fixture,
clinical save, photo upload, message or payment during verification. Unrelated edits and the user's
clinic-shell width snippet remain preserved.

Selected pre-edit sources: .medframe-runtime/station-actions-before-20261021-023550.
Implementation archive: .medframe-runtime/station-actions-phase-source (49 files at copy).
These are selected-source archives, not complete repository snapshots. Synthetic presentation source
is private at .medframe-runtime/station-actions-presentation.tsx; its review route was removed.

Launcher stopped the app. First migrate refused occupied port 3000; no process was killed to bypass
the guard. Later migrate reported all migrations applied. With none pending, its existing checkpoint
helper was invoked while stopped, producing encrypted checkpoint:

/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261021-104943-a89bd41

Isolated clone medframe_django_station_actions_20261021_024942_50e07f verified 165 tables;
source_written=false. This is checkpoint/restore evidence, not post-traffic row/object fingerprints.
No clone was restored over original data.

Launcher .next-local-dev and original medframe_django are active. Backend restarted after final
scope/proxy wiring. Final status: API823778, worker823931, scheduler823932, media823933, web817758.
Existing loopback call media is unchanged; no public deployment or external money movement.

## Actual verification and limits

Prettier formatted supported frontend files; Ruff format formatted Python. No build, automated tests,
typecheck or lint suite, following visual-only preference.

One synthetic desktop/390×844 phone browser pass reused actual StationPatientHeader,
PatientActionGrid, positive Station allowlist and shared Dialog/FormSelect. It confirmed circular
identity/contact/written dates, touch controls, grouped/searchable tiles, phone stacking/scrolling,
patient-switch presentation and nested dialogs above the session bar. A synthetic access toggle
hid payment tile/sample balance. Payment selection was presentation only: no native PaymentForm or
financial mutation. Desktop select options observed; phone capture showed a collapsed select, not
full popup acceptance. Anonymous native Station entry presented the code gate, establishing only
presentation. Tab closed, viewport reset, review route removed. No second visual pass.

Native authenticated saves, grant denial, device/source-session revocation, concurrency/version/
idempotency, payment recording, visit mutations, release publication, photos and recent data remain
unverified (STATION-ACTIONS-001). Source/synthetic presentation/service readiness do not prove them.

## Actual Graphify and Jev use

Old root graph (1150 nodes) query for ClinicalStation/ClinicianHome/patient actions returned
433 neighbors/16 shown, truncated, with stale unrelated paths. Follow-up StationPatient/
PatientActionsDialog/DoctorAccessCode/DOCTOR_PERMISSIONS had no matches (exit4).

Refreshed focused 51-file AST corpus in .medframe-runtime/station-actions-graph-corpus and output
.medframe-runtime/station-actions-graph: 306 nodes/791 edges. Final query StationPatient,
PatientActionsDialog, patient_workspace, invoice_scope, validate_graphql returned 125 neighbors/
15 shown, explicitly truncated. Existing station-entry.tsx parser warning: syntax errors at line160,
only two symbols extracted. STATION-ACTIONS-002 is a graph coverage limitation, not a TypeScript
compiler finding. No unrelated repair, semantic extraction or whole-repository coverage claim.
Source inspection remained authoritative; no clinical records included.

Jev official default provider/model jev-1.13.0 received sanitized generic engineering state:
recommendation scoped1.0/confidence1.0 (405 input/36 output tokens), implementation narrow1.0/
confidence1.0 (419/34), review bounded1.0/confidence1.0 (441/31). Judgments supported limited native
capabilities and honest acceptance limits, not blanket billing authority or verified safety.
No patient information, identities, credentials, private logs or attachments sent. Model judgments
do not replace authorization, source inspection or verification.
