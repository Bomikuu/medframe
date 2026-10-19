# Reception-selected kiosk sessions — October 19, 2026

Native source branch `codex/kiosk-reception-sessions`. Source/UI baseline `0c3aa0c` / `checkpoint/pre-kiosk-reception-sessions-2026-10-19`; `.next-device-code-modals` retained. User explicitly chose “No code; reception selects the patient.”

## Delivered behavior

Unavailable-record LoadState offers an explicit Back to collection or Back to Station action, using an internal route and retaining the organization/portal-link context. Settings failures return to the clinic workspace. It does not grant access to an unavailable record or depend on browser history.

Standard patient kiosks now receive an authenticated reception selection for one approved idle device in the same branch. Reception searches existing patients, confirms identity, selects the receiving kiosk and presses Send patient to kiosk in Patient Stations & departments (`/clinic/stations`). Native appointment permission and operational patient scoping remain authoritative. Assignment expires in two minutes, is bound to device/reset generation, refuses replacement of a live session/pending handoff and requires live source authorization. Only that device can claim its one-use assignment into an opaque HttpOnly Strict patient cookie. No public patient lookup or shared “last patient” state.

One normal session covers multiple tasks. Home/Cancel return to task selection while retaining that patient's session; Do another task is available after success. Finish/change patient, explicit completion, reload and inactivity clear scope. The existing two-minute idle/ten-minute absolute deadlines remain; background polling never renews them. Strict verification is a separate per-device Manage checkbox; it uses patient codes before each task. A second distinct strict-mode mutation is refused by the backend while identical retries remain idempotent. Availability/balance reads require a fresh task code after completing a strict-mode task. Changing verification policy revokes device scope and requires pairing again; portal/reception code copy identifies strict mode explicitly.

Additive `stations.0009_reception_kiosk_access` creates separate KioskPolicy and KioskAssignment tables, preserving existing model rows/columns. No role, password, MFA, clinical/financial data, queue transfer rule or payment integration change. Other active departments still require staff transfer; normal mode does not permit duplicate visits/stages.

## Actual bounded verification

Initial scoped backend run: 11 of 12 pass. The remaining test requested two simultaneously active departments; existing ACTIVE_STAGE enforcement correctly refused. Its fixture now books a future appointment then joins the laboratory queue in the same session; that one focused confirmation passes. Twelve distinct passing cases across staged evidence, not a repeated clean suite. Cases cover native reception assignment, HttpOnly cookie, exact-device binding, expiry/reset/replay/occupied state, revoked source/device, identity/branch/permission denial, normal no-code policy, strict retry/new-task rejection and versioned policy changes.

Initial and final production builds/TypeScript pass. Final artifact `.next-kiosk-reception`, BUILD_ID `y4y4YQfk-K90Gwct_qhMT`. Ruff import organization repaired the generated migration; final scoped Ruff/format passes and migration drift reports no changes. Prettier is applied to touched supported source. Scoped ESLint has zero errors and the inherited use-kiosk cleanup-ref warning (deferred). The final feedback/portal-copy refinement has a passing scoped lint check. No broad backend retest or unrelated fix.

One real synthetic browser journey verifies the unavailable-record return preserving clinic context, receptionist patient selection/device assignment, automatic kiosk session with no code, a future booking, Do another task and a second queue admission without a code, then opening the bills region. It times out at an incorrect exact bill fixture label. One focused continuation also uses exact matching while the UI includes a quantity suffix; it stops before Home/phone/Finish assertions. Those remain unverified; no third browser round or full browser-pass claim. Four successful captures: unavailable-record, kiosk waiting, bound-session home and second-task ticket under ignored `output/playwright/kiosk-reception/`. See KIOSK-RECEPTION-001/002/003 in the error log. Full strict-mode UI, new-home inactivity timing, concurrent claim browser acceptance and final finish/phone paths were not independently established in this phase.

## Graphify and Jev

Queried existing backend Station/frontend device-modal graphs first; source verified directly. Refreshed AST-only backend corpus config/api_graphql/medframe_apps including migrations: 309 files, 1,826 nodes, 7,754 edges, 124 communities. Frontend app/features/components/lib excluding generated.ts: 311 files, 1,615 nodes, 7,349 edges, 54 communities. Tests/scripts/private files/assets/runtime excluded; zero external extraction tokens. Raw backend health: 809 dangling endpoints, 21 self-loops, 354 directed collapsed edges; frontend: 283/4/89. Ten backend init/config files and frontend icon barrel yield no symbols; station-entry TSX remains partial. Follow-up graph query traces assign/receive/KioskAssignment under a bounded budget. These are limited structural impact maps, not test coverage or clinical validation.

Jev 1.13.0 received sanitized architecture/evidence only. Planning `choice` selected scoped reception assignment over global broadcast, confidence 1.0 (437 input/33 output tokens). Completion `choice` selected bounded activation/reporting with unverified browser assertions explicitly retained, confidence 0.86 (429/33). No patient data, credentials, codes, session tokens or attachments were sent. Judgments support review; they are not proof or authorization.

## Preservation and local activation

Pending final checkpoint/fingerprints/additive migration and local service restart. Prior artifacts and original records remain preserved. No review-clone import, source database reset, public deployment, external message or online money movement.
