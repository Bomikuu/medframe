# Deferred issue log

## 2026-10-19 — Dental-chart discoverability

- Report: the user could not find the teeth section after Batch 2 delivery.
- Current navigation: Patients → open patient → Start consultation → Dental findings → Show 3D view. There is no standalone Teeth sidebar destination.
- Impact: delivered dental functionality is difficult to discover.
- Status: logged for later UX review; no interface change made.

## 2026-10-19 — Synthetic demo release preparation

- A one-off demo provisioning command attempted to preview a dental release and received `INVALID_SOURCE: A selected version is unavailable for this patient.`
- The helper supplied a dental chart row ID; this is not evidence of a confirmed application defect. Source selection needs investigation before retrying.
- The entire transaction rolled back, including the attempted account and invitation. No release was created.
- Status: deferred; no application fix or further release attempt made. A separate account-only invitation was prepared for the user.

## 2026-10-19 — Start consultation visibility

- User reports that Start consultation is absent.
- Code evidence: patient overview renders ConsultationList only with `patients.clinical.read`; its Start consultation action additionally requires `encounters.write`.
- Default doctor/dentist roles include encounter writing; clinic administrator alone does not. Patient portal accounts cannot start staff consultations.
- Previous navigation instructions omitted these account requirements. Current browser identity has not been inspected.
- Status: documented; no permissions or interface changed.

## 2026-10-19 — Administrator/Dentist has no patient grants

- User reports: “This patient is unavailable or your access has changed.”
- Read-only database check confirms `admin@medframe.example.com` has Clinic Administrator and Dentist roles, but zero active patient access grants. Its clinic contains one patient; membership is branch restricted.
- Clinical reads require both clinical permission and an active patient grant within the membership branch. Adding Dentist alone did not complete patient access setup.
- Status: logged; no grant, branch, credential, or application change made. The patient's specific eligibility/branch has not been checked.

### Access setup completed after repeated user report

The existing clinic patient and administrator/Dentist membership were confirmed to share the same clinic and branch. Granted that account access to that single patient through the existing `set_patient_access` service, which records the normal audit/history events. Both clinical read and write authorization checks passed. No application code or branch restrictions changed; no other patients were granted.

## 2026-10-19 — Missing provider profile after role addition

- User reached Provider profile needed after patient access was configured.
- Adding the Dentist role directly had omitted the provider profile normally created by the native `provision_staff` command.
- Completed account provisioning through that existing command for the same clinic/branch; confirmed profile exists. Dentistry is the command's role category, credentials remain `not_verified`, and professional title remains blank.
- No clinical record was created, password/MFA reset, or application code changed. Logged the incomplete role-setup workflow for later review.

## Batch 3 — single verification pass, 2026-10-19

User instruction: implement natively, test once, and log discovered problems without repairing or retrying them. All items below are deferred. Batch 3 was not activated.

### B3-001 — Patient appointment action PostgreSQL locking error

- Severity: blocking patient appointment actions.
- Reproduction: `tests_django.test_operations_portal.OperationsPortalTests.test_keep_and_cancel_are_explicit_patient_actions` in the single targeted Django run.
- Actual: `django.db.utils.NotSupportedError: FOR UPDATE cannot be applied to the nullable side of an outer join`.
- Location: `services/api/medframe_apps/operations/appointments.py`, `patient_appointment_action`, locking appointment query with related nullable resource.
- Impact: the tested patient keep/cancel flow fails; reschedule uses the same initial query and remains unverified/affected.
- Evidence: `/tmp/medframe-batch3-backend.log`; 27 tests ran, 26 passed and one errored. No failed assertions, no retries, no repair applied.

### B3-002 — Patient screen TypeScript render blocker

- Severity: blocks the production frontend build and local Batch 3 activation.
- Reproduction: `npm run typecheck`; also reached by the single `NEXT_DIST_DIR=.next-batch3-rehearsal npm run build`.
- Actual: `features/portal/operations/patient-operations.tsx(52,7): error TS2322: Type 'unknown' is not assignable to type 'ReactNode'.`
- Impact: the new patient operations error-state JSX does not type-check. Production JavaScript compilation succeeded, but Next.js rejected the subsequent TypeScript stage. No usable Batch 3 production artifact is claimed.
- Evidence: `/tmp/medframe-batch3-types.log`, `/tmp/medframe-batch3-build.log`. No repair or rebuild applied.

### B3-003 — SQL migration readability / Ruff findings

- Severity: formatting/readability gate failure.
- Reproduction: the targeted Ruff invocation recorded in the verification evidence.
- Actual: 23 `E501` line-length findings in `services/api/medframe_apps/operations/migrations/0002_authority_integrity.py`, embedded SQL lines 25–70.
- Impact: Ruff does not pass. Python auto-formatting does not wrap embedded SQL strings. The migration itself applied successfully in the rehearsal clone.
- Evidence: `/tmp/medframe-batch3-ruff.log`. No SQL rewriting or lint suppression applied after discovery.

### B3-004 — React Compiler warnings in operations forms

- Severity: nonblocking lint warnings, deferred.
- Actual: `react-hooks/incompatible-library` warnings for React Hook Form `watch()` in booking and schedule forms. ESLint returned exit 0 with two warnings and no errors.
- Impact: affected components are excluded from automatic memoization; runtime behavior was not browser-verified.
- Evidence: `/tmp/medframe-batch3-lint.log`. No repair applied.

### B3-005 — Connected browser journey not executed

- The single production build was blocked by B3-002, so the planned `apps/web/tests/operations.spec.ts` journey was not run. No browser pass, screenshot review, accessibility runtime pass, or staff/patient integration pass is claimed.
- The source journey covers schedule setup, booking/rescheduling, check-in/calling, clinical handoff availability, verified patient invitation, socket connection/delay refresh, and narrow layout. It does not fully exercise patient rescheduling/cancellation, service completion, every overflow/reconnect case, or the complete proposed verification matrix.
- Broader boundary/load/real-clinical review remains unperformed. These are coverage limitations, not confirmed additional defects.

## Batch 3 — authorized activation resolution, October 19, 2026

The user explicitly requested activation after the failed initial pass. B3-001, B3-002 and B3-003 were repaired as necessary activation blockers, committed in `980a1c4`. The focused portal module passed all three tests, targeted Ruff passed and the production build passed. Original-data preservation checks and the native cutover succeeded. B3-004 remains a deferred nonblocking warning; B3-005 remains a coverage limitation. This resolution does not retroactively change the initial verification results.

### B3-006 — Browser journey MFA selector mismatch

- Severity: test-harness blocker; complete browser workflow remains unverified.
- Reproduction: one activation attempt, `operations.spec.ts --retries=0`, using synthetic native staff profiles with existing confirmed MFA.
- Actual: `signIn` at `apps/web/tests/operations.spec.ts:60` waits for `Authenticator code`; `apps/web/features/auth/mfa-form.tsx` labels existing-MFA verification `Authenticator or recovery code`.
- The attempt was interrupted to avoid spending the full four-minute test timeout on the known selector mismatch. Exit 130, one interrupted test, no completed journey.
- No selector/product repair or browser retry was performed. New issues remain deferred as requested; native Batch 3 activation itself completed.
- Evidence: `/tmp/medframe-batch3-active-browser.log`.

## UI revamp — October 19, 2026

UI-001 (resolved): account-menu JSX syntax and the new dashboard provider relation blocked the first check/build. The final build passed, and the three focused directory/dashboard authority tests passed after correction. The relation is `provider.membership.user`; no original data was changed.

UI-002 (resolved): the sticky entry-Sheet header intercepted the close control. Reproduced during dirty registration; corrected its stacking position. Confirmation passed Close → Keep editing, retained input, then Close → Discard changes.

UI-003 (resolved): Appearance's tab root forced 406px content at a 390px viewport. Shrinkable tab/grid containers fixed it. Confirmation passed the narrow page and dark preview/cancel.

UI-004 (verification limitations): first captures included transient skeletons, and the clinical test initially selected both a labelled dialog and its textbox. Loaded captures and an explicit textbox selector were used in the focused confirmation. All six confirmation groups passed. Full-page dental screenshots have sticky-element stitching artifacts; use the normal viewport/page component evidence rather than treating them as layout goldens. No further UI polish cycle was run.

UI-005 (deferred): Django emits `StreamingHttpResponse must consume synchronous iterators ... asynchronously` during existing private PDF serving under ASGI. A scanned synthetic PDF rendered with extracted text and closed/cleaned up successfully. No transport repair attempted. Evidence: `/tmp/medframe-ui-api-review.log`.

The two existing operations RHF warnings (B3-004), older operations E2E MFA selector (B3-006), additional clinical/portal/operations acceptance coverage, and remaining focused-editor refinements are documented in `ui-revamp-verification.md`. Package installation reported 12 high-severity audit findings; no unrelated forced upgrades were attempted.

## Anatomical dental replacement — single pass, October 19, 2026

User instruction remains: test once, log discovered issues, and do not repair them until requested. The replacement is saved on `codex/anatomical-dental` and **has not been activated**. Current UI production remains on `.next-ui-revamp`; checkpoint `checkpoint/pre-anatomical-dental-2026-10-19` preserves its source.

### DENT-001 — Anatomical renderer fails React immutability lint

- Severity: release gate failure.
- Reproduction: `npm run lint`, once after implementation.
- Actual: `react-hooks/immutability` errors in `apps/web/features/dental/anatomical-scene.tsx`: setting `mesh.visible` around line 95, `camera.near` around line 155, and `controls.current.minDistance` around line 161.
- Impact: lint fails despite successful TypeScript and production compilation. React/Three imperative ownership needs review; no rule suppression or refactor was applied after discovery.
- Evidence: `/tmp/medframe-anatomy-lint.log`, retained in `.impeccable/review/anatomical-dental/medframe-anatomy-lint.log`. Existing B3-004 warnings remain separate.

### DENT-002 — Ready status appears while anatomical teeth are blank

- Severity: blocks replacement activation and 3D selection.
- Reproduction: isolated production web on port 3001 and review API on 8001, matching WEB_ORIGIN. Sign in as synthetic staff, open the synthetic draft consultation, choose Dental chart. The GLB request completes and the viewer reports `Anatomical model ready`; the canvas contains no visible teeth. The same blank state appears on the finalized patient chart.
- Actual: HTML tooth labels and surrounding controls render, but the anatomical geometry does not. A geometry-derived front-view click intended for FDI 26 leaves the panel on FDI 16. No browser page error was emitted.
- Impact: direct tooth selection, anatomical presentation, material feedback, jaw/isolation geometry and detailed-molar integration cannot be accepted. Source GLB geometry itself rendered in the earlier independent temporary inspection scene.
- Investigation lead only, not a confirmed repair: the renderer converts every cloned material to an array. Single-material imported geometry may not have material groups required by that representation. Review this before attributing the failure to the asset or camera. No repair or retry was performed.
- Evidence: `/tmp/medframe-anatomy-browser.json`; retained browser report and screenshots under `.impeccable/review/anatomical-dental/`. `isolated-26.png` is the harness filename, but its visible selected label is **16**, not 26. `patient-readonly.png` independently shows the blank canvas in the read-only composition.

### DENT-003 — Dependent checks and mobile review remain incomplete

- The single browser run recorded six groups: three passed and three failed. Successful assertions cover synthetic staff authentication, no GLB request on initial Notes, primary 20-tooth 2D fallback, and patient chart read-only controls. The read-only group's successful ready-label assertion is **not** evidence of rendered geometry.
- The selection failure prevented the desktop/mobile arch captures, detailed FDI 26 load, and the connected finding/surface save/reload check. No new clinical finding was saved by this run. Treatments/history tabs, missing-tooth rendering, material restoration, narrow layout, historical revisions and precise camera behavior remain unverified.
- The browser script used the existing synthetic fixture only; it did not change original records, passwords, MFA, memberships or finalize a consultation. No retry, alternate selection workaround or additional browser round was performed.
- Native Impeccable finish review has disposition **recapture**: required desktop/mobile anatomy evidence is absent or blank. Per the user's testing limit, no recapture cycle was started. This is a self-review, not independent agent validation.

## Anatomical dental replacement — authorized activation resolution

The user's subsequent “activate it” authorized repairs to DENT-001/DENT-002. Commit `ba0e45e` restores source material structure and isolates imperative scene updates. Build/TypeScript pass, lint passes with only the two pre-existing operations warnings, and the focused browser confirmation passes all six groups without page errors. Direct FDI 26 selection, detailed molar rendering, mobile layout and synthetic mesial finding save/reload are confirmed. The original failures above remain historical evidence. Anatomy is now active on local port 3000; see `anatomical-dental-verification.md` for runtime and rollback details.

The first activation browser attempt's click used coordinates invalidated by screenshot scrolling and was intercepted near the sticky header. Its corrected harness recomputes coordinates below the save bar; confirmation passed. No additional product repair/rebuild was needed after that harness finding. Evidence: `.impeccable/review/anatomical-dental-activation/first-confirmation.json` and `medframe-anatomy-activation-browser.json`.

### DENT-004 — Detailed reference label wraps

- Severity: minor visual issue, deferred without repair.
- Actual: the HTML `Reference 26` annotation wraps over two lines in the detailed-molar desktop capture. The tooth panel and viewer caption still identify FDI 26 correctly.
- Impact: annotation polish only; does not block selection, reading the tooth identity or saving findings.
- Evidence: `.impeccable/review/anatomical-dental-activation/detailed-26.png`. No further polish/retest cycle was run.

DENT-003's blocked desktop/mobile and save/reload checks are now completed at the focused scope above. Exhaustive tooth-by-tooth/browser historical/missing-condition coverage remains unperformed.
