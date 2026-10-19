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

## Full dental editor / point notes — October 19, 2026

### EDITOR-001 — Test-file import ordering (deferred)

- Single targeted Ruff pass reports I001 in `services/api/tests_django/test_dental_annotations.py`: `from tests_django import test_encounters` should precede the ClinicalFixture import.
- This is a test-source style finding, not a runtime exception. No repair or retry was performed under the user's testing preference.
- Evidence: `/tmp/medframe-dental-editor-ruff.log` and the retained copy under `.impeccable/review/dental-editor/`.

### EDITOR-002 — Browser harness cannot locate the editor dialog (deferred)

- The single browser run signs in with the synthetic staff fixture, then waits for `getByRole('dialog', {name: 'Dental editor', exact: true})`. It times out. All five dependent groups fail to reach their targets; no screenshot or new note save occurs, and no browser page errors are reported.
- Source inspection suggests an accessible-name mismatch: Radix DialogContent supplies `aria-labelledby` for the patient-name DialogTitle, which takes precedence over the supplied aria-label. This explanation is an inference; no corrected-selector run was performed.
- Impact: default full-screen rendering, point clicks, note popovers, real-browser save/reload, rotation and mobile inspection are not accepted as browser-verified. Two focused backend tests do pass, covering bounded anchor validation, legacy records, exact finalization and amendment comparison.
- Evidence: `/tmp/medframe-dental-editor-browser.json`, retained under `.impeccable/review/dental-editor/`. No selector/product fix or browser retry was attempted.
- A local preview may be run with this coverage gap explicitly disclosed; it is not a full UI acceptance pass. The previous anatomical build remains the rollback artifact. Do not claim the failed browser groups passed.

## Reference-guided editor — October 19, 2026

### REF-001 — Missing Switch registry component blocks the build

- Reproduction: the single accumulated `NEXT_DIST_DIR=.next-dental-reference npm run build`.
- Actual: `apps/web/features/dental/canvas-tools.tsx:5` imports `@/components/ui/switch`, which is not installed in the repository. Turbopack reports module-not-found and stops before TypeScript/runtime acceptance.
- Impact: the reference-guided editor has no production artifact; its planned browser pass is not run. Starting review web 3001 reports missing production build. Live port 3000 remains on the preserved `.next-dental-editor` artifact.
- Evidence: `/tmp/medframe-reference-build.log`, `/tmp/medframe-reference-web.log`, retained under `.impeccable/review/reference-editor/`.
- No repair/rebuild was performed at discovery. The user was asked whether to authorize adding the missing shadcn component and one confirmation/activation, because the saved instruction requires issues to be logged without repair until requested.

### REF-002 — Small text sizes outside the design ramp (deferred advisory)

- One scoped Impeccable detector pass reports three 11px font-size advisories: two camera-navigation labels in `canvas-tools.tsx` and the surface picker in `tooth-preview.tsx`.
- No font-token rewrite or suppression was made. These advisories are distinct from the build blocker and remain deferred.
- ESLint passes with zero errors and the same two existing operations warnings. The 37 source-derived PNG previews rendered successfully; neither result proves the application UI renders.
- Evidence: `/tmp/medframe-reference-design.log`, `/tmp/medframe-reference-lint.log`, `/tmp/medframe-reference-previews.log`.

## Reference editor — authorized activation resolution

The user explicitly requested “Fix blocker and activate locally”. REF-001 is resolved in `51de539`: the official shadcn radix-nova Switch source was added, its `cn` import resolved to the existing helper, and state selectors adapted to the installed Radix data-state attributes. No new package was needed. The production build and TypeScript stage pass; targeted Switch lint passes. The old build failure is retained above as historical evidence.

The one focused browser confirmation records five passed assertion groups and zero page errors: reference composition/32 previews; FDI/Universal and view/label/camera/expansion controls; surface entry/cancel; point-note save/reload and Notes tab; mobile controls/2D/navigation. These assertions do **not** establish a full visual pass. Screenshot review found REF-003/004 below. Per the user's bounded-testing preference, they were logged without repair/retry. The reference editor is activated locally with these remaining limits; prior `.next-dental-editor` remains preserved.

### REF-003 — Shared dialog cap leaves bottom viewport gap (deferred)

- Actual: `apps/web/app/globals.css` applies `max-height: 90dvh` to dialog content, including the editor. Captured editor height is 799.1875px at 888px viewport height, 900px at 1000px, and 810px at 900px. The underlying consultation remains visible through the overlay below it.
- Impact: the editor does not occupy the complete viewport height despite its explicit h-dvh class. No scoped max-height override was applied after discovery.
- Evidence: `.impeccable/review/reference-editor/desktop-reference.png`, `desktop-1440.png`, `mobile.png`, and `medframe-reference-browser.json`.

### REF-004 — Narrow visual rendering and action layout (deferred)

- At 390px the action row clips the Mark completed action; the captured model region is blank despite the ready label. The inspector capture also shows the canvas pin/label above the mobile inspector content. Exact rendering cause is uninvestigated; a transient capture cannot be excluded without another pass.
- Impact: mobile controls and persisted Notes text were asserted successfully, but mobile anatomical rendering/layering and full action access are not visually accepted. The browser harness did not assert pixel content or action-row overflow and therefore reports its limited group as passing.
- Evidence: `.impeccable/review/reference-editor/mobile.png`, `mobile-inspector.png` and the final browser report. No mobile repair, second browser round or broader test sweep was run.

REF-002 text-size advisories and older EDITOR-001 test import ordering remain deferred. The new confirmation used the editor's explicit data marker and successfully exercised the note save/reload coverage previously blocked by EDITOR-002; the older harness itself was not changed.

## Login enhancements — October 19, 2026

### AUTH-001 — React Hook Form memoization advisory (deferred)

- Scoped ESLint reports zero errors and one `react-hooks/incompatible-library` warning for
  `watch("remember")` in `features/auth/login-form.tsx`. React Compiler skips memoizing that
  component; the warning describes a potential stale-state risk when passing watched values to
  memoized consumers.
- The focused browser check did pass the checked remember value through the mocked Google callback,
  and real password/MFA flows produced the expected persistent and browser-session cookies. These
  assertions do not remove the compiler advisory.
- Evidence: `.impeccable/review/login-enhancements/medframe-login-lint-scoped.log` and browser report.
  No source repair or repeat lint/build/browser pass was made after discovery.

### AUTH-002 — Dependency audit output needs triage (deferred)

- The `npm install input-otp --workspace apps/web` command reported **12 high-severity vulnerabilities**
  across the installed dependency tree. No package-level audit or baseline comparison was performed;
  this count does not establish that `input-otp` introduced them.
- No `npm audit fix`, forced upgrade, unrelated package replacement, or second audit was run.

The initial lint command ran from the repository root, where there is no ESLint config. It did not
inspect product code. The single valid scoped lint invocation ran from `apps/web`; its result is
AUTH-001 above. This was a command-location correction, with no product repair.

## Visual reconstruction — October 19, 2026

### UI-RECON-001 — Throttled review and blocked dental acceptance (deferred)

- Initial sweep navigated rapidly and reached the existing 120/minute per-user GraphQL limit. Its error-state captures were rejected as visual evidence. The paced final sweep completed 128 route/width captures with no geometry findings, then recorded four staff HTTP 429 / RATE_LIMITED responses during interaction checks.
- The final dental group navigated to the synthetic encounter and timed out after 20 seconds waiting for `[data-dental-editor=true]`. No final-build dental or consultation-editor screenshot was captured. Throttling may explain the timeout; the exact cause was not established. Five other interaction groups passed.
- Impact: dental full viewport/model rendering, mobile actions/inspector layering and consultation interaction changes are not browser-accepted in this build. Source contains scoped repairs to REF-003/004, but those earlier visual findings cannot be marked verified/resolved. Final browser process exits nonzero.
- Evidence: `.impeccable/review/reconstruction/browser-report.json`, `/tmp/medframe-reconstruction-browser-final.log`; initial evidence separately retained. Stale dental PNGs from the initial run are not final evidence. Limits were not weakened, counters were not deleted, and no further repair/retry was performed.

### UI-RECON-002 — Active tab can be offscreen after viewport resize (deferred)

- Reproduction observed in the captured patient Documents view: select a later patient tab at desktop width, then shrink to 390px. Its content stays correct, but the horizontal tab rail may retain the desktop scroll offset and show earlier tabs first.
- Impact: selected tab may require horizontal scrolling to see. State-change auto-reveal exists; resize auto-reveal is not implemented. No page overflow was recorded.
- Evidence: `.impeccable/review/reconstruction/patient-documents-390.png`. No additional source fix or browser loop was run.

### Current dispositions and coverage limits

- AUTH-001's `watch("remember")` was replaced with `useWatch`; final ESLint is zero errors/warnings. The two older operations watch warnings were removed within the same form reconstruction. REF-002's 11px dental labels were raised to the shared 13px secondary size.
- REF-003/004 remain unverified after source changes because UI-RECON-001 blocked acceptance. EDITOR-001's unrelated test import ordering and AUTH-002's dependency triage remain deferred.
- The synthetic portal had no released snapshot and the patient had no saved medical history revision. Populated exact-version/history pages were not visually accepted; no fake releases or diagnoses were created for screenshots.
- A dark-preview capture caught the closing Select menu during its animation. Color-mode change and cancel restoration assertions passed; this transient image is not a settled-overlay acceptance image. No recapture was performed.

## Django Batch 4 — October 19, 2026

### B4-001 — Shared financial entry trigger references a field absent on payment/credit rows (activation blocker)

- Reproduction: the single `tests_django.test_billing` / `tests_django.test_communications` invocation, or record a payment against an issued invoice in the Batch 4 review clone.
- Actual: PostgreSQL raises `record "new" has no field "payment_id"` in `billing_entry_guard()`, installed by `billing.0002_integrity_permissions`. Its refund-only condition combines `TG_TABLE_NAME='billing_refund' AND ... NEW.payment_id`; that expression is not safe for records from other trigger tables. Payment and credit insertion reach the shared function without a `payment_id` field.
- Impact: payment/credit posting is blocked and transaction rolls back. Seven of 20 backend tests errored, including dependent partial-payment, replay, immutable-payment, credit-adjusted portal and concurrent-posting coverage. They are not passing tests. No original database was migrated; Batch 4 is not active.
- Evidence: `/tmp/medframe-batch4-backend.log`, retained under `.impeccable/review/batch4/`. Four new migrations did apply to the clone; migration success alone did not exercise posting.
- Disposition: deferred without fix, migration rewrite or retest, honoring the user's one-pass/log-errors instruction. A later authorized repair should isolate table-specific field expressions in separate branches/functions and use an additive corrective migration because the initial migration has already been applied to the review database. Do not bypass the guard or restore the clone over original data.

### B4-002 — Five new Python string literals exceed the line-length limit (deferred)

- Single scoped Ruff pass reports five E501 findings: two URL literals in `medframe_apps/auditing/notifications.py` and three safe message literals in `medframe_apps/communications/reminders.py`.
- Impact: Python style check is not clean. No suppression, post-check wrapping or rerun occurred. Frontend ESLint, production build/TypeScript and migration drift pass.
- Evidence: `/tmp/medframe-batch4-ruff.log`, retained in the review directory.

### B4-003 — Browser cancellation confirmation selector is case-sensitive (deferred harness finding)

- The sole browser run saves recipient consent, previews/schedules a follow-up reminder, clicks Cancel reminder and confirms it, then waits for exact text `Cancelled`.
- Actual badge source text is `cancelled` with CSS `capitalize`. The locator times out. Read-only clone inspection afterward finds one delivery with `state='cancelled'`; no product failure is established by the casing mismatch. The browser group remains failed, not retroactively passed.
- Four other browser groups pass, with 20 desktop/mobile captures, no recorded geometry findings and no page errors. Financial posting groups were skipped after B4-001, without bypassing its trigger or repeating the failed request.
- Evidence: `.impeccable/review/batch4/browser-report.json`, `/tmp/medframe-batch4-browser.log`. No harness correction or browser retry was run.

### B4-004 — Per-invoice payment/event detail lists are unbounded (deferred source-review finding)

- `medframe_apps/billing/queries.py::invoice_detail` serializes all invoice payments and non-draft financial events rather than paging/capping those collections. Invoice-list and notification/reminder-list pages already use bounded keyset pagination; line items are limited at draft validation.
- Impact: an invoice with a very long payment/event history could produce an expensive oversized detail response. No large-history runtime scenario was exercised in the bounded pass.
- Disposition: log without a source fix or new test cycle. A later authorized fix should page history while keeping totals authoritative and allow the user to select an eligible original payment for refunds without loading an unbounded list.

Batch 4 code/build are preserved separately. Original `.next-reconstruction`/Django runtime, accounts, credentials and data remain active. Live Twilio delivery, online money movement, exhaustive guardian/branch concurrency and successful paid/refund browser balances are not verified. See `django-batch-4-verification.md` for exact preservation, scope and remaining activation work.

## Django Batch 4 — authorized activation resolution, October 19, 2026

The user subsequently requested “activate”, authorizing recorded blocker repair and one focused confirmation. Commit `0ab67de` resolves B4-001 with additive `billing.0003_isolate_entry_trigger_fields`, evaluating refund-only fields in their own table branch while preserving ledger locks and amount checks. B4-002 is resolved by wrapping five literals without changing their values. B4-003 is resolved in the activation harness by matching lowercase source text and asserting against the newest reminder. Initial failed evidence above remains unchanged.

The focused backend invocation passed all 20 tests in 4.628 seconds, scoped Ruff and migration drift passed, and six browser groups passed with 22 desktop/mobile captures, zero page errors and no recorded geometry findings. Payment/refund/credit/reload and the patient’s matching outstanding balance were exercised on the review clone. Frontend product code was unchanged; the existing passing build/TypeScript/ESLint artifact was reused. No broad repair/retest loop was run.

Batch 4 is active locally after fresh encrypted backup/verified restore, five additive migrations and preservation of all 4,475 original rows across 73 tables. Accounts/passwords/MFA were not reset and no review clone replaced original data. SMS remains preview-only. **B4-004 remains deferred**: per-invoice payment/event history serialization is unbounded. Older unrelated findings and acceptance gaps remain deferred. No live provider delivery or online money transfer was performed. See `django-batch-4-verification.md` and ignored `.impeccable/review/batch4-activation/` for evidence and current runtime.
