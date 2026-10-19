# Station Phase 2 — patient kiosk and department visits

Active locally on `codex/station-patient-kiosk`, implementation `8eef439`, artifact `.next-station-kiosk`, BUILD_ID `pu6ANZqS70TxB4ZxZPSCL`. Source baseline `2a7b937`, tag `checkpoint/pre-station-patient-kiosk-2026-10-19`; preserved `.next-ai-drawer-layer` remains intact. Native implementation and review only, no agents. The existing Station brief and explicit continuation authorized this connected Phase 2; Phase 3 is still separate.

## Delivered and how to use it

Authorized staff open **Patient Stations** in clinic navigation (`/clinic/stations`). Choose a branch, then **Set up standard departments** (administrator) or add/edit a department. Consultation, laboratory and cashier defaults are created only by that explicit branch action; activation does not silently configure every original clinic. Departments have unique letter prefixes, service type, active state, duration and configurable early/late consultation arrival windows. Existing provider schedules still supply real appointment availability.

Create/pair/approve a **Patient kiosk** using the existing Devices & Stations process and its permitted functions. Its Station entry now offers **Open patient kiosk**, or use `/station/kiosk` on the approved browser. An unpaired, pending, expired, wrong-mode or revoked device cannot access the kiosk service. Device pairing never verifies a patient or grants staff permissions.

The public kiosk has four large touch actions:

- Book an appointment: verified patient selects consultation service/provider/date, gets actual available slots, reviews and confirms through existing reservation constraints. The result explicitly distinguishes an appointment from admission to today's queue. Duplicate confirmations/retries return the existing result/reservation.
- Check in: choose the verified patient's own branch appointment; backend enforces same clinic-local day and configured arrival window, then creates/reuses the native provider consultation ticket plus the Station visit/stage. Out-of-window/other-patient appointments fail without local confirmation.
- Walk in: choose a configured service. Consultation requires a real active branch provider. Laboratory/cashier/other departments use independent stages without a fictitious doctor. The ticket shows department, label, issue time, next step and the underlying consultation desk number where applicable. Waiting estimates are honestly unavailable.
- Pay for clinic services: after verification, show only that patient's issued same-branch bill lines, totals, recorded payments and outstanding balance. Continue to the cashier queue in the same visit. **This phase does not collect, confirm or mark payment paid.** Digital providers, kiosk cash hardware, paid receipt/reconciliation and configurable before/after-service payment gates remain Phase 3 dependencies.

Existing patients enter a one-use five-minute **patient verification code**. Their signed-in verified patient portal exposes **Get a patient kiosk code** on appointment/queue screens. Alternatively, authorized reception searches the branch's existing patient record, explicitly attests in-person identity verification and issues a code. Names/birth dates alone do not expose records or balances. Codes/digests are separate from device pairing and doctor workspace access; no live SMS/email delivery.

New arrivals submit only name/contact and optional birth date as a **registration request**, not an automatic account or patient match. Authorized staff review it, link a verified selected existing patient, decline, or confirm creation through the existing patient registration service. Exact existing name/phone candidates block duplicate creation and require review. This does not register a portal account, set credentials or change MFA; portal invitations remain separate. Fuzzy identity resolution is a staff responsibility.

One open patient/branch/day StationVisit owns stage history. Existing consultation QueueTicket/Encounter remain authoritative; no competing clinical draft or automatic encounter is created. Staff can call/recall, return to waiting, start service, skip/cancel with reason, set priority, complete, transfer or close a finished visit. Transfers preserve the visit and link stages; native consultation queue transitions are reused. Completing a queue stage never finalizes clinical records. Existing provider restrictions apply to consultation stage actions; cashier queue management never grants money-recording permission. Staff board shows up to 200 daily stages and 30 pending intakes, with explicit limits; broader pagination is not implemented in this phase.

## Identity, privacy and integrity

Patient session is a digest-only HttpOnly opaque cookie bound to one live approved credential, exact patient/branch and verified source proof. Two-minute backend inactivity and ten-minute absolute deadlines; activity can extend idle only within the absolute limit. Polling does not extend patient activity. Source portal-link/staff-membership/user/device revocation is checked live; branch/device capability checks are repeated on actions. Kiosks cannot call broad staff GraphQL, portal record, admin or clinical APIs.

Back/Home/Cancel/help, inactivity warning and explicit extension/Finish are available. Reset clears server scopes, increments the device's clear generation, invalidates pending UI responses and remounts all patient form state; no patient data is written to local/session storage or URL. Page restoration clears rather than restores patient scope. Redemption locks the same generation boundary as reset, preventing a late verification request from recreating a cleared session. Offline/device error clears displayed patient state and requires connection/staff assistance; it never claims an appointment/payment succeeded locally. The server's shorter activity policy remains separate from native staff sessions.

Department counters and admission locks give one visit/stage under concurrent retry, per-session request IDs detect changed payloads, existing PostgreSQL exclusions protect provider/patient reservations, and optimistic versions protect staff actions. Additive scope triggers validate proof sources, branch/patient/device matches, stage/department/visit and consultation-ticket identity. KioskEvent evidence is append-only. Existing data guards/auth/session realms/clinical owner are unchanged.

## Actual bounded verification

- Initial accumulated backend run passes **21 cases**, including PostgreSQL concurrent admissions from two connections, explicit provider-independent queue behavior, staff transition attribution/immutable events, code reuse/expiry/source/device revocation, backend inactivity and absolute expiry, existing patient scope isolation, reservation duplication, same-day check-in/window, transfer without new encounter, registration review/duplicate detection and broad API denial.
- Source review added the device clear-generation boundary against late redemption. Two separately focused cases pass for generation reset/redeem and actual issued invoice-line/balance privacy. **23 distinct cases have passing staged evidence; the full 23 were not rerun as one clean suite.** No broad unrelated backend regression. The initial cases predate this additive boundary; its behavior is covered by the new focused test and browser reset journey.
- Initial build fails TypeScript on the old now-narrowed display placeholder. New UI lint initially finds effect/purity/copy issues; new Python import/long-line formatting also needs correction. These activation blockers are repaired before the browser build. Final production build/TypeScript, scoped Ruff/format, Prettier and migration drift pass. Scoped ESLint has zero errors and one new cleanup-ref warning (`use-kiosk.ts`, imperative epoch counter in cleanup), retained honestly. No unrelated warning fixes.
- Initial browser run reaches the staff board then stops because the synthetic portal fixture's ClinicalSession realm is staff while its session says patient. Native middleware correctly rejects it with 401. The fixture is corrected to matching native patient realm; no authentication or MFA bypass is added to application code. Initial failure evidence is retained as STATION-KIOSK-002.
- One confirmation browser pass asserts **seven groups, twelve captures, zero page exceptions**: portal code/real booking/review/confirmation/Finish clearing; provider-independent laboratory ticket and same-visit staff transfer; own issued bills with another patient's line excluded and cashier-stage reuse/no paid claim; actual same-day consultation check-in; pending new registration and authorized review; unverified inactivity warning/reset; broad staff GraphQL denied from paired kiosk. It captures desktop 1440, landscape tablet 1024 and phone 390 home without document overflow. Staff/tablet/phone/bill captures were inspected natively.
- Staff transfer/registration review in the browser run uses actual authenticated endpoints, while the staff board/portal code and patient flow use rendered controls. Every staff modal submission/error path, all phone journey steps, portrait tablet, complete keyboard/assistive-device acceptance, printing hardware, lost-response simulation and patient bfcache restoration are not independently browser verified. Browser time advancement tests the client warning/reset, while real backend timeout is established by the backend test. No third browser/polish loop. Older Station/editor/AI/GPU acceptance gaps remain deferred.

Raw ignored evidence `.impeccable/review/station-kiosk/` contains staged backend/build/format/lint/drift/browser/checkpoint/graph/Jev outputs and synthetic captures. Review fixture `/home/micxsz/.local/share/medframe/ui-review/station-kiosk.json` contains private native sessions/opaque device credential and stays outside Git; none were printed or committed. It creates synthetic appointments and invoices only in the isolated review DB. No review worker or external delivery was started.

## Preservation, activation and rollback

Initial encrypted checkpoint/verified isolated restore `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-205113-2a7b937`, DB `medframe_django_station_kiosk_review_20261019`, 127 source tables. Three additive Station migrations were rehearsed there.

After original web/API/worker/beat stopped, fresh encrypted checkpoint/verified restore `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-211127-8eef439`, isolated DB `medframe_django_station_kiosk_activation_20261019`. Applied only:

- `stations.0006_kioskevent_kioskproof_kioskpatientsession_and_more`
- `stations.0007_kiosk_integrity`
- `stations.0008_kioskboundary`

**All 5,775 original rows across 127 original tables match exact preservation fingerprints after migration, before traffic resumes.** Ten new tables and additive framework metadata do not rewrite original care/identity. Accounts/passwords/MFA and all prior builds remain intact; synthetic fixtures/invoices/registrations were not imported. Private fingerprints `/home/micxsz/.local/share/medframe/checkpoints/station-kiosk-original-fingerprints-20261019.json`.

Encrypted object checkpoint `/home/micxsz/.local/share/medframe/checkpoints/station-kiosk-storage-activation-20261019` verifies all **51** original private objects into isolated `medframe-review-station-kiosk-activation-20261019`, no original writes. Backups/configuration/secrets remain outside Git.

| Service       | PID    | Tool session | Runtime                                     |
| ------------- | ------ | ------------ | ------------------------------------------- |
| Web           | 997021 | 77154        | port 3000, `.next-station-kiosk`            |
| Django API    | 997013 | 34678        | port 8000, original `medframe_django`       |
| Celery worker | 997011 | 49265        | original broker, concurrency 2              |
| Celery beat   | 997014 | 9829         | `/tmp/medframe-station-kiosk-original-beat` |

Logs `/tmp/medframe-station-kiosk-{web,api,worker,beat}-runtime.log`. Local kiosk route and origin-bearing proxied API CSRF return HTTP 200. Review services 3001/8001 are stopped. SMTP127.0.0.1:51025, SMS live disabled. Browser focused mode is not OS kiosk lockdown; manual browser Print does not assert installed printer/cash hardware. No public deployment, real money movement, private attachment upload or external message.

UI rollback can serve `.next-ai-drawer-layer` against the compatible additive schema; the prior UI will not expose kiosk/stage management. Do not reverse/drop new tables with live visits or restore a review clone over original. Reconcile newer writes before any explicitly requested full rollback. Clinic department/device setup still requires an authorized staff action; none is silently enabled globally by migration.

## Actual Graphify / Jev / Impeccable use

Existing `backend-clinical-ai-drawer` queried first for StationDevice/Appointment/QueueTicket; 258 reached, 43 shown under 1,400 tokens, requiring source verification. Refreshed `backend-station-kiosk` corpus: **307 files, 1,809 nodes, 7,680 edges, 118 communities**; config/api_graphql/medframe_apps including migrations. `frontend-station-kiosk`: **309 files, 1,603 nodes, 7,290 edges, 45 communities**; app/features/components/lib excluding generated.ts. Tests/scripts/assets/private/runtime data excluded. AST extraction uses zero external tokens; raw cohesion, manifests, cost and health reports remain local. Final focused query reaches 410 nodes, shows 31 under 900 tokens; generic perform/staff-member matches require direct source inspection.

Limitations: backend801 dangling endpoints,21 self-loops,351 directed collapsed pairs; frontend283/three/84. Existing symbol-free initializer/config/icon-barrel and partial station-entry TSX extraction warnings remain. Graph is relationship guidance, not an exhaustive review, authorization or test result.

Jev0.7.0/model jev-1.13.0 received sanitized architecture/evidence only: design `scoped`, confidence1.0,471 input/35 output tokens; activation `preserve`, confidence1.0,477/33. Activation judgment precedes actual original preservation/migration/readiness results; tools establish those facts. No patient names/records, session tokens, device secrets, code values, credentials, private attachments or invoice content were submitted.

Impeccable new-work/Operate/craft-floor guidance extends the established world using the user's explicit four-action composition. The earlier failed context launcher was not rerun; PRODUCT.md, DESIGN.md, Station brief and source provide context. No concept tournament/brand replacement, AI integration or delegated reviewer. Written phase design/plan records reuse and external dependencies; all work is native.
