# Deferred issue log

## B8-001 — Reporting annotation and formatting activation repairs

The accumulated33-case Batch8 run passes29 and errors in four operations/report tests because the annotation name day conflicts with QueueTicket.day. Renaming only that report annotation to report_date resolves the blocker; all four targeted cases pass in the one focused backend confirmation. There are33 distinct staged passing cases, not a second clean33-case run. Initial Ruff preparation has import/line-wrap diagnostics; scoped final Ruff/format passes. Next's build-added tsconfig paths require Prettier; that one-file confirmation passes. Production build/TypeScript, scoped ESLint and migration drift pass. Logs remain /tmp/medframe-batch8-*.

## B8-002 — Browser attachment-body assertions stop acceptance (deferred)

The initial isolated browser journey reaches analytics, applies the7-day filter and captures1440/1024/390 without overflow or page exceptions. It starts the native CSV download, then asserts Current snapshot in response.text and stops. The single continuation again captures the report and starts a download, then stops on an empty attachment response.text. This harness read is not a valid downloaded-file inspection. Separate native same-origin HTTP inspection returns200, text/csv,2,800characters and the expected finance snapshot; the browser captures show financial data and no application error. No product repair is inferred from that failed harness assertion. No third browser round, saved browser-file-content claim or completion of remaining specialty/starter/export/revocation/reader UI groups. Source/build and the33 distinct backend cases remain evidence, not a substitute for those unexecuted browser interactions. Future acceptance should save/read the Download before asserting content. Evidence: output/playwright/batch8/ and /tmp/medframe-batch8-browser*.log. No unrelated UI fixes or broad retries.

## SERVICE-CONTEXT-001 — Bounded browser acceptance remains partial

The initial patient-service journey uses textbox for a type=search input and stops before opening the case. One focused continuation fixes the harness role, then passes responsive native payment totals, Manage payments navigation, one due summary and Due/Upcoming/Settled filtering. Native synthetic payment succeeds and reopening verifies12,000 received/48,000 outstanding/zero due. A broad /2,000/ selector then matches both12,000 received and2,000 next payment; stopped.png visibly shows the correct next obligation and Active workflow. No page exceptions in the continuation. Draft/uninvoiced/void/reader/portal and retry browser groups remain unexecuted. No third browser round or full acceptance claim. Setup-only python/callback errors precede application actions. Evidence: output/playwright/service-context/ and /tmp/medframe-service-context-browser*.log; see service-payment-context-verification.md. SERVICE-PLAN-003's generic void label is changed under the user's approved refinement, while browser acceptance and broader permutations remain open.

## SERVICE-PLAN-001 — Staged activation/static and date-fixture repairs

Initial39 backend cases pass38; the remaining reporting fixture used UTC instead of clinic-local date. One focused timezone-correct confirmation passes. Initial build/profile due-type, Ruff import/SQL wrapping and scoped ESLint authored-copy/ref analyzer blockers were repaired under standing local activation authorization. The first ESLint command used the wrong working directory. Logs retain each stage under /tmp/medframe-service-plans-*.log; see services-installments-verification.md. No repeated broad suite claim.

## SERVICE-PLAN-002 — Browser acceptance incomplete (deferred)

One browser journey stops on an ambiguous Monthly installments input/closing-option label. The sole focused continuation creates the catalog and passes1440/1024/390 captures, then stops on a stale hardcoded synthetic patient name. Current picker choices are visible in stopped.png; no page exceptions. Case/workflow/agreement/payment/portal/kiosk UI assertions remain unexecuted, and an unreached Save invoice draft locator differs from the actual Save draft button. No third browser round or full end-to-end acceptance claim. Initial CLI require/path evaluation setup errors are retained separately. Evidence: output/playwright/service-plans/ and /tmp/medframe-service-plans-browser*.log.

## SERVICE-PLAN-003 — Void-plan coverage wording and remaining permutations (deferred)

Source review finds void-plan rows retain generic unpaid coverage wording although due/remaining are zero and native invoice state remains void. Improve that label in a later requested refinement. Dedicated concurrent agreement issuance, every workflow/permission/device/portal and manual reminder-dispatch permutation remain outside passing acceptance evidence; existing native ledger concurrency and scoped projection/authorization cases pass. No further repair/retest loop in this phase.

## ONBOARD-004 — Onboarding visual follow-ups and remaining acceptance (deferred)

Final captures establish the connected flow without horizontal overflow, but the existing dashboard still renders its zero-patient metric below the new first-run checklist; the brief prefers an empty-state-only first dashboard. Review displays machine-like provider ranges and applies capitalization too broadly to contact/timezone text. Branding shows the actual logo in its live editor and final workspace, while the review miniature and completion screen do not repeat every requested logo/administrator/specialty detail. Some preview content lies below the fold behind the ordinary sticky navigation until scrolled. Scoped lint retains two private/blob img warnings and a polling dependency advisory. No full every-step/every-device, axe or all already-signed-in-session transitions acceptance is claimed. Cleanup exists as a task/command but no new beat schedule is enabled. These are logged rather than another UI polish/testing loop. Evidence: clinic-onboarding branding/review/dashboard captures and lint-confirmation.log; see clinic-onboarding-verification.md for scope. This does not negate the passing core flow, private logo promotion or real workspace branding.

## 2026-10-19 — Tooth/anatomy selection focus

### SELECT-FOCUS-001 — Dental dialog harness name (resolved harness gap)

The scoped browser run queried a dialog named “Dental editor”; the current DialogTitle supplies the synthetic patient's name instead. Reproduce by running the initial harness in `.impeccable/review/selection-focus/browser.json`: it times out before dental assertions despite the screenshot showing a loaded model and no page errors. The harness now uses the existing `data-dental-editor` attribute. One remaining-step continuation passed desktop centering/surface/reset assertions. No product repair followed.

### SELECT-FOCUS-002 — Phone 2D-summary locator (deferred acceptance gap)

The desktop continuation then attempted `dental.locator('details').filter({has: dental.locator('summary')...})`; the nested locator retains the outer editor scope and cannot match within each details element. It timed out before phone selection. Evidence: `scripts/review-selection-focus.mjs`, `.impeccable/review/selection-focus/browser-remaining.json` and `failure.png`. Impact: phone tooth-centering and the final persisted before/after comparison remain unverified. Desktop real mesh centers, numeric framing, zero page errors and zero mutation requests were observed. Per the bounded-testing preference, no further harness repair or browser retry was attempted. No mobile product defect is established by this locator failure.

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

## Django Batch 5 — October 19, 2026

The user approved native implementation with one accumulated verification pass. The findings below are recorded without repair/retest. Original data and Batch 4 artifact remain preserved; Batch 5 is not active.

### B5-001 — Diagnostic request SQL trigger has ambiguous variable/alias names (activation blocker)

- Reproduction: new request creation in the isolated clone, or the accumulated diagnostic test modules.
- PostgreSQL reports `column reference "a.id" is ambiguous` in `diagnostic_scope_guard()`. The function declares record variables `a` / `r` and also uses them as SQL aliases. Request insert fails even though its migration installed successfully.
- Impact: 14 of 32 backend tests error before their intended referral/result/file/portal/concurrency assertions. No successful diagnostic end-to-end flow established.
- Evidence: `.impeccable/review/batch5/backend.log`; migration `diagnostics.0002_integrity_permissions`. Repair must be additive for the already-migrated clone. No fix/retry performed.

### B5-002 — Patient diagnostics route lacks PortalProvider boundary (activation blocker)

- Production frontend compiled and TypeScript passed, then prerender `/portal/diagnostics` threw `PortalProvider required`. The new routes render PatientDiagnostics directly; incumbent patient pages supply their own provider/Suspense boundary.
- Impact: no complete `.next-batch5` production artifact; browser journey and activation not attempted.
- Evidence: `.impeccable/review/batch5/build.log`. No provider repair/rebuild performed.

### B5-003 — Scoped Ruff reports 29 findings (deferred)

- Long SQL/string literals in the new migration/test, config URL import order, late test imports and an assigned lambda in diagnostic history serialization.
- Pre-check Ruff formatting/import cleanup was insufficient. No rule suppression or post-check repair was applied.
- Evidence: `.impeccable/review/batch5/ruff.log`.

### B5-004 — Frontend lint error and compiler warning (deferred)

- Unescaped apostrophe in `features/diagnostics/patient-diagnostics.tsx` fails react/no-unescaped-entities.
- `form.watch()` in request-form triggers the React compiler/RHF incompatible-library warning.
- Evidence: `.impeccable/review/batch5/eslint.log`. No lint fix/retry performed.

### B5-005 — Remaining plan and acceptance gaps (deferred source review)

- Center accepting/profile controls exist in the model/provisioning path but no operator-facing update workflow was completed. Saved referral draft editing has backend support but lacks its editing form. DiagnosticResultView shows attachments for the current result; no validated calibrated imaging capability exists or is claimed.
- Center/patient choice and source-file picker queries cap at 50 but do not expose paging beyond that cap; complete pagination of large option sets remains unfinished. Request date and modality/other filter rejection, wrong-center/other-patient attachment injection, expiry and suspension races do not all have independent assertions in the accumulated test set.
- Diagnostic assignment rows permit mutable active/accepted/performed metadata through the ORM; attributed application events exist, but raw assignment-state history and result-draft scope need further database-boundary review. Request attachment update/delete guards and cross-organization/result references are authored but not established by the blocked tests. No database security assurance is claimed.
- Report/upload drafts are not fully guarded for all local file-selection/organization-switch cases; uploaded result attachments have no removal control, so a rejected/unavailable attachment may strand submission. No post-check product changes were made.
- No browser harness/visual captures, real diagnostic upload/scan/submission acceptance, exact diagnostic file release acceptance or successful concurrency acceptance was completed because earlier blockers stopped the journey. Existing file regressions passing do not establish the new file workflow.
- These gaps remain separate from a narrow trigger/provider fix; see `django-batch-5-verification.md` for actual scope and next authorized work.

## Batch 5 — authorized activation resolution

The user’s “activate always after” establishes standing local-activation authorization, including necessary blocker repairs and bounded confirmation. This supersedes the old stop-before-repair instruction for activation blockers only. Unrelated findings remain deferred.

B5-001 is resolved by additive diagnostics 0003, using unambiguous record names. B5-002 is resolved with the established patient PortalProvider/Suspense boundary. B5-003/004 scoped Ruff/ESLint findings are resolved. Repair commit `683bbe0`; all 15 focused diagnostic tests pass, migration/drift and build/TypeScript/lint pass. Initial failure evidence remains historical.

### B5-006 — Diagnostic patient-release timestamp formatting (resolved during activation)

The focused browser confirmation reached a published diagnostic report, then `ReleaseView` threw `Invalid time value`: dateLabel expects a date-only string but received result.performed_at as a full timestamp. Commit `2b9e2c3` uses the existing clinic-time formatter. Final build/TypeScript and release lint pass; targeted patient report rendering and old-ticket revocation pass. No full browser journey/backend suite was repeated after this correction.

The earlier browser fixture's copied PNG was rejected before reception; replacing only that synthetic test fixture allowed real upload/ClamAV/submission to proceed. Initial/main/tail reports are all retained; this was not one flawless run. Five groups pass across main and targeted remaining-step confirmations, with ten responsive captures and preserved historical failure evidence.

Original-data activation is complete: fresh encrypted backup/verified restore; four additive original migrations; all 4,560 existing rows across 85 tables preserved; local web/API/worker/beat running, SMS preview-only. B5-005 and older unrelated issues remain deferred. See django-batch-5-verification.md for evidence, process identifiers and scope.

## Batch 6 — bounded implementation/activation findings

### B6-001 — Draft resolver input/output defaults (resolved activation blocker)

The first `.next-batch6` build compiled but TypeScript rejected the RHF resolver because the legacy-reader anatomy default made its input optional while the canonical form requires an array. The canonical form schema now requires the already-normalized array; the old-draft reader still defaults it to empty. Build/TypeScript pass in `batch6/build-confirmation.log` and `build-viewer-confirmation.log` under ignored `.impeccable/review/`.

### B6-002 — New test fixtures and review setup (resolved rehearsal blockers)

The accumulated 26-test run passed 24 and errored on two raw encounter fixtures missing required request metadata. They now use the authorized encounter service. A focused two-case confirmation caught one newly required UUID import; the final affected case passes. No full backend suite was repeated. Review web initially lacked `WEB_ORIGIN=http://localhost:3001`, blocking login before MFA; the cloned synthetic provider also retained a dentistry specialty, invalidating a general-medicine-default assertion. Only review configuration/clone fixture metadata changed. Original credentials, MFA and provider records were not changed. All historical logs/reports are retained.

### B6-003 — 3D scene replacement/loading DOM (resolved core activation blocker)

The browser loaded both real GLBs but the initial model-point step produced a React DOM `removeChild` error and no finding. A focused reproduction captured the stack/DOM/model and an interior-triangle pick rather than an exact boundary vertex. The anatomy renderer differed from the working dental renderer: it replaced the primitive scene on selection and used a Drei Html subtree as Suspense loading content. It now keeps the scene clone stable, updates materials/visibility/raycast eligibility imperatively, and renders loading status outside the 3D Suspense boundary. Confirmation created and saved an exact femur mesh pin, rotated the camera and captured desktop/mobile with zero page errors. The evidence establishes the corrected combined behavior, not a separate causal experiment for each change. Later tab-return automation was blocked by the incumbent dental full-screen dialog; saved-state/history/release checks continued from the saved synthetic consultation instead of repeating the successful 3D steps.

Source review also identified a compatibility safeguard: older clients omitting anatomy must retain existing anatomy, while an explicit empty array remains a draft deletion request. This is implemented under the authorized aggregate lock and passes the focused save/omission/amendment checks. No old finalized JSON was rewritten.

### B6-004 — Anatomy layout/accessibility refinements (deferred)

- Scoped ESLint has zero errors and one warning: the structure navigator uses a button with `role=listitem` and `aria-pressed`. Native button activation works, but the role/pressed semantics need correction.
- The normal desktop inspector's long Add-finding button label can clip. In the expanded editor, tall inspector content can overlap the bottom history/footer; the narrow-screen fixed/flex composition shows substantial blank viewport space and panels below the initial viewport. Desktop/mobile captures establish these issues, not complete responsive acceptance. Save/exit actions are visible at the top and Escape exits expansion. No post-review visual polish/retest was performed.
- Isolate hides other structures but does not automatically frame the selected small bone; Fit/reset uses the whole-body camera distance. Clinicians can zoom manually. No measurement/calibration claim is made.
- The illustrative 2D map supports named-structure selection and normalized map-point entry; saved points are described in the finding list but do not yet have visible map marker overlays. The canonical structure list is the accessible text alternative; the map does not segment tissues or infer a structure from a raw click.
- Evidence: `.impeccable/review/batch6/eslint.log`, `anatomy-expanded-{1440,390}.png`, and `failure-debug.png` from the core-flow investigation. These are separate from older dental findings; do not silently repair them.

### B6-005 — Coverage and integrity limits (deferred)

The scoped tests cover canonical sides, mesh/version/bounds/finite validation, old-draft defaults, duplicate/byte bounds, aggregate conflicts/compatibility, immutable identity/finding updates, foreign identity denial, clinical revocation, exact amendments/comparison/paging, stale carry requirements and explicit releases/notes. They do not independently establish concurrent reservations/finalization races, every raw-ORM chart-entry injection, old historical-asset replacement or full keyboard/a11y performance. Chart-entry guards enforce scope/time and append-only rows, but one-entry-per-finding-identity is maintained by the snapshot service rather than a separate database uniqueness column. Carry-forward refuses an already-present key; replacing that draft key with a newer cross-visit source needs a more complete UI. No independent anatomical/clinical validation, all-206-bones claim or security assurance is implied by passing checks.

### B6-006 — Remaining fallback browser acceptance (deferred)

Forced GLB abort produced the expected model-fetch error and visibly switched the editor to the illustrative map; the first assertion expected an unavailable notification, while the context-loss path switches directly to the map. The scoped map/list remains present in captured DOM. A remaining-step confirmation then matched both the visible editor map and a hidden history map. The final narrowed attempt timed out waiting for post-MFA navigation, before fallback editing/save. It was stopped rather than continuing authentication/retest attempts. Consequently model-failure rendering is observed, but **keyboard fallback entry/save and saved draft retention under context loss do not have completed browser acceptance**. The forced-failure report's model-load page error is expected fault-injection evidence; the ordinary corrected 3D editor confirmation had zero page errors. Logs: browser-remaining-initial.json, browser-fallback-locator-evidence.json, browser-fallback-confirmation.json and browser-fallback-final.log in the ignored Batch 6 evidence folder. No original credentials/MFA or unrelated authentication behavior were repaired.

## Anatomy reference UI — October19

### ANAT-REF-001 — Supported canvas switched to fallback (resolved activation blocker)

The first scoped browser attempt found no canvas and a visible fallback without a model-load page error. The new WebglUnavailable fallback component invoked onFailure in an effect; React mounts canvas fallback children even when the browser supports WebGL. Pure fallback markup removes that side effect. Build/TypeScript and the real-model/annotation confirmation pass. The first scoped ESLint also flagged assignments to hook-returned OrbitControls properties; limits now use declarative props. No lint rule bypasses. Evidence: anatomy-reference/build*.log, eslint*.log, browser-initial.json and browser-main-confirmation.json under ignored review evidence.

### ANAT-REF-002 — Closing-sheet harness timing (resolved harness gap)

The corrected run passed both desktop groups and tablet drawer assertions/captures. Before phone steps, a viewport change encountered a closing AI sheet and attempted the inspector's generic Close locator. The remaining-step harness waits for closed-dialog teardown and checks phone/fallback only, using the already-saved synthetic consultation. Both remaining groups pass. No product change or repeated desktop sweep followed. Normal editor page errors: zero; intentional blocked-fetch run has one expected model-load error.

### ANAT-REF-003 — Minor UI refinements and unverified edges (deferred)

One unused Bot import warning remains after removing a duplicate mobile action; scoped ESLint has zero errors. Narrow toolbar controls scroll horizontally; current Sheet base width makes phone panels relatively narrow, with vertically scrolling forms. View thumbnails overlay lower anatomy in the whole-body frame. The reused full history/comparison widget has no separate compact-inspector acceptance. Record these for later rather than starting another polish/rebuild loop. Raw captures/results: `.impeccable/review/anatomy-reference/`. Source data, live clinical permissions and backend deferred findings remain untouched.

This explicitly requested redesign replaces the old B6-004 layout and navigator semantics, and adds real isolate framing. The B6-006 model-download-failure entry/save gap now has passing phone evidence; direct GPU context-loss and visible map-pin overlays remain unverified/deferred.

## 2026-10-19 — Clinic onboarding initial verification

### ONBOARD-001 — Activation blockers (repair authorized by standing local activation instruction)

The initial production build failed on the additive secondary-theme Zod input/output type and an overloaded React Hook Form invitation-submit type. Scoped ESLint also rejected a synchronous effect state reset in the new platform page. The accumulated PostgreSQL run passed 34 of 36 cases; two completion cases stopped at business-email validation because Pydantic's EmailStr rejects reserved development `.test` addresses accepted by the existing invitation validator. These block build/complete-flow activation. Evidence: `.impeccable/review/clinic-onboarding/build.log`, `lint.log`, `backend-tests.log`. Repair is confined to shared theme compatibility, submit/effect typing and consistent Django business-email validation. Confirmation will cover the failed completion cases plus final build/lint and the new browser workflow, not repeat successful broad suites.

### ONBOARD-002 — Invitation browser bootstrap URL (activation blocker)

The first browser attempt stopped before the welcome screen: graphql-request rejected the new relative endpoint with “Failed to construct URL: Invalid URL.” No page error or workflow mutation was observed. The existing staff client already constructs an absolute same-origin URL; the new restricted client now follows that contract. The confirmation starts at the failed bootstrap and runs the previously unexecuted flow. Its fresh-browser resume harness waits out the intentional one-minute email-code cooldown instead of treating throttling as a product failure. Evidence: clinic-onboarding/browser.log and browser-failure.png in ignored review evidence. No unrelated product repair.

The ONBOARD-002 continuation initially hit stale review-server chunk references after the new artifact was rebuilt. It stopped at bootstrap before any workflow assertion and recorded one chunk-load page error. The review server is restarted by its exact PID to load the current manifest; successful feature groups are not rerun because none had started. Preserve browser-stale-server.json separately from product acceptance.

### ONBOARD-003 — Specialty provider harness label and review-return boundary

The current-artifact browser reached verified email and persisted clinic/specialty input, then stopped on the test's case-sensitive “Dentist” name; the rendered control's accessible name is lowercase `dentist`. No product error was recorded. The remaining-step harness uses a case-insensitive exact provider label and resumes the existing server draft without repeating the welcome/clinic groups. Native review also found that saving an Edit from the completed review could return through unnecessary intermediate steps; Continue now returns directly to Review when all verified steps remain complete. This preserves the approved editable-review behavior. Evidence: browser-current-artifact.log, welcome captures and the specialty failure capture in ignored clinic-onboarding evidence.

ONBOARD-003's first resume continuation read an older Mailpit verification code before the newly queued message arrived. The product correctly rejected it (“Check the six-digit code”) with no page errors. The harness now snapshots message IDs before requesting a code, waits for a newly delivered message for the synthetic recipient only, and observes the cooldown across contexts. This is a local-mail harness correction; no identity control was weakened. Preserve the failed resume evidence separately.

# STATION-001 — Phase 1 activation blockers (October 19, 2026)

Initial accumulated backend pass: 20/30 cases passed; ten Station lease cases failed at `ownership.status`, before exercising their assertions. PostgreSQL rejects `select_for_update()` across the nullable `credential` outer join. Scope the row lock to the lease itself, with the existing encounter lock retained. Necessary to activate any editing workspace; standing activation authorization permits repair and a focused confirmation of these ten failed cases.

The production build/TypeScript passed. Initial scoped lint was invoked from the repository root where no ESLint config exists; the correctly configured invocation found four new React effect/initialization errors (asynchronous selection restoration and a setter declaration). Repair by initializing the existing editors only after lease/selection bootstrap, rather than mirroring initial state through effects. Five warnings include existing anatomy `Bot` and new effect dependencies; retain unrelated warnings. Evidence: `.impeccable/review/station-phase-1/{backend-tests,build,lint,lint-configured}.log`. Graphify Python import probing also found `extract_ast` is not a public module and the initially guessed `extract_code` symbol is unavailable; inspection established the installed `graphify.extract.extract` API. No clinical data or credentials were sent externally.

Focused confirmation: all ten previously failed backend cases pass after locking `EditingLease` with `of=("self",)`. The necessary rebuilt artifact passes build/TypeScript; scoped lint now has zero errors and the one previously logged anatomy `Bot` warning. Initial failures remain historical evidence. The installed Graphify extraction API is `graphify.extract.extract`, not the initially probed symbol.

## STATION-002 — Browser harness naming mismatch

The first accumulated browser pass established device creation, eight-block pairing, physical approval and four desktop/tablet/phone captures, then stopped at `getByRole("dialog", { name: "Dental editor" })`. The real dental dialog was present; its existing `aria-labelledby` patient title takes precedence over the explicit aria-label. A focused diagnosis confirmed the full chart and read-only ownership state. Use the established `data-dental-editor` selector rather than changing the product's accessible patient title.

The first browser closed its contexts on failure. The remaining-only continuation therefore uses a new synthetic consultation and refreshes the private credential for the already approved synthetic tablet, retaining pairing/approval evidence from the first run. This setup is restricted to `medframe_django_station_review_20261019`; it is not imported into original data. No repeated broad browser pass or unrelated polish is authorized by this repair.

## STATION-003 — Graph extraction limits (deferred)

The refreshed code-only Graphify corpora report unresolved endpoints, self-loops and parallel relation collapse in raw extraction diagnostics. Backend: 723 dangling endpoint edges, 20 self-loops, 324 directed same-endpoint collapsed edges. Frontend: 271 dangling endpoints, two self-loops, 65 collapsed edges. Build resolution produces graphs with additional referenced nodes, but the diagnostic counts are retained as limitations rather than silently claimed clean. The frontend parser partially extracts `station-entry.tsx` at a JSX text ampersand; TypeScript/build succeeds. Ten backend initialization/configuration files and one icon barrel yield no modeled symbols. Do not repair Graphify internals or use the graph as sole authorization evidence. Raw diagnostics and numeric cohesion are in `graphify-out/{backend,frontend}-station-phase-1/graph-summary.json`.

## STATION-004 — Final boundary confirmation and deferred acceptance

Source review before traffic resumed extended non-clinical device blocking to `/admin/`, whose existing scope is read-only organization/branch metadata. A paired kiosk/display should not inherit that staff surface. The existing middleware test was expanded and passes in a one-case focused confirmation; no broad backend or UI suite was rerun for this backend-only guard. Evidence: `admin-boundary-confirmation.log`.

The first browser continuation stopped at a second harness ambiguity: the same synthetic patient appeared in both the draft list and acceptance preview. Scoping to the named handoff region resolved it. The final remaining-only browser result passes three groups with zero page errors. Initial pairing plus remaining results cover four groups and eight successful captures; they are not one repeatedly clean full run. Existing comprehensive tablet notes/context headers occupy substantial vertical space; visit screenshot caught its loading state, while permission assertions and API responses established the scoped boundary. Complete clinical panel/device/keyboard/failure matrices, simultaneous acceptance stress tests, richer live connection labels and a dedicated handoff-history screen remain deferred. Device rename/function editing is not exposed; re-register/re-pair a replacement configuration for now. No unrelated visual polish or Graphify-internal repair was attempted.

# STATION-CODE-001 — Code-session activation findings (October 19, 2026)

Initial accumulated backend pass: 44/44 cases pass, production build/TypeScript passes, migration drift none. Scoped Ruff found a synthetic-fixture `exec`, duplicate imports after its replacement, unused test import and two long literals; these new scoped check blockers were corrected without broad product repairs. ESLint reports zero errors and two warnings: the existing anatomy `Bot` import and deliberate full navigation after identity change, which clears prior application memory. No lint rules were disabled.

Source review added immediate patient-grant revocation and auth-epoch/absolute-expiry checks before activation; two new cases and one existing success case pass in a focused three-case confirmation (46 distinct cases have staged passing evidence at that point).

The first browser pass confirms source save/offer and three responsive access-code captures, then fails after successful `/stations/access` redemption at workspace bootstrap. Native diagnosis isolates `access_scope.validate_graphql`: GraphQL `FieldNode.arguments` is `None` for argumentless roots such as `currentUser`. Iterating it raises TypeError, sanitized to HTTP 400; no unauthorized data is returned. Use `(field.arguments or ())`, add a bootstrap regression, and confirm the affected flow under standing activation authorization. Initial logs remain in `.impeccable/review/station-code-access/`.

The focused bootstrap case passes. One browser confirmation establishes actual code-only entry from an approved tablet with **no receiving staff cookie**, saved-note/tab restoration, named clinician/expiry display, no broad clinic navigation and no further-delegation control. Four desktop/tablet/phone captures have no page overflow. The tablet save succeeds in the backend, then the harness stops at its unscoped `getByText("Draft saved")`, which matches both visible notes status and force-mounted anatomy status. This is a locator ambiguity, not an observed save failure. Do not repeat the UI cycle: remaining browser assertions for old-writer/API scope/end/replay are not accepted in that run; their scoped backend cases pass. Evidence: `browser-confirmation.log`, `browser.json`, review API log and `bootstrap-confirmation.log`. Final staged backend coverage is 47 distinct passing cases (44 initial, two added live-boundary cases and one bootstrap case), not one repeated clean suite. No unrelated UI polish was performed.

## STATION-DOCTOR-001 — Initial activation checks, October 19

The first accumulated run passes 45 targeted backend cases. Production compilation succeeds but TypeScript rejects rendering `selected.error` (unknown) through `&&` in the new walk-in identity modal. Scoped ESLint flags the new device-loading effect; its initial invocation is moved to a cancellable asynchronous subscription. Scoped Ruff finds one long test GraphQL string. These are this feature's activation blockers and are repaired under the standing local activation instruction; final focused outcomes are recorded separately. An initial lint command was launched from the repository root instead of the web workspace and found no ESLint config; no product failure is inferred from that tool invocation. Jev design invocation first had an option quoting error, then failed with a connection reset; no model judgment was returned.

The single initial browser pass for STATION-DOCTOR-001 stopped before product interaction: its exact accessible-name selector omitted the branch text inside the device-name button. No application failure or completed browser group is inferred. The harness selector is narrowed to the device-name prefix for one bounded activation confirmation; original failure evidence is retained.

## STATION-DOCTOR-002 — Narrow-phone Station home overflow (deferred)

At 390×844, after doctor-code entry, the new home action buttons inherit nonwrapping text and make the page wider than the viewport. Desktop 1440×1000 and tablet 1024×768 captures do not overflow. Reproduce: enter a doctor workspace code, set width to 390px and inspect the two large actions; their descriptions and the right side of the consultation area clip. Evidence: `.impeccable/review/station-doctor-workspace/doctor-home-phone.png`, `browser.json` geometry. The confirmation stopped at this assertion after two device-management groups and successful doctor entry; later patient/walk-in/end assertions had not executed. Log-only under the user's instruction; no responsive polish repair or repeated broad sweep. A focused remaining-flow check omits this known failed assertion and does not repeat device management.

STATION-DOCTOR-001 confirmation: production build/TypeScript, scoped Ruff and focused ESLint pass after the activation fixes. Forty-five backend cases passed in the original accumulated run; that suite was not repeated. Selector confirmation passes device editing/regeneration and re-pairing/approval, then finds deferred phone overflow STATION-DOCTOR-002. A focused remaining-flow check passes patient selection/history, end-of-flow identity plus native clinical save with entered note preserved, and End session. Original-data activation preserves 5,251 rows across 123 tables; no review data was imported. Full evidence and actual local runtime: `docs/operations/station-doctor-workspace-verification.md`.

## STATION-GALLERY-001 — Initial verification fixture blockers, October 19

The accumulated run passes 35/38 scoped backend cases; three new fixture defects prevent acceptance. A synthetic in-service ticket omits its required service owner (the existing PostgreSQL guard correctly rejects it). Another test mutates already-received image size (the existing immutable-byte guard correctly rejects it). The gallery time patch changes the shared Django timezone module and moves native session activity back to a mocked morning, making the next request expire and return 403 instead of testing portrait conflict. Correct fixtures provide the service owner, create the oversized version at its final size, and mock only the dashboard module's clock reference. These acceptance/activation blockers receive one focused three-case confirmation; original output is retained. Production build/TypeScript and scoped Ruff/lint pass; lint retains the existing deliberate identity-change navigation warning. No product integrity guard is weakened or removed.

## STATION-GALLERY-002 — End session outside full-screen modal

The initial batched browser pass confirms four groups: authorized data/timing/clock/agenda, scanned portrait selection and protected byte rendering, all four width captures without overflow, and Today/All switching. Dashboard End session opens confirmation, Cancel makes no logout request. It then stops on the full-screen dental view because Radix correctly hides outer page controls from its modal accessibility tree; the visually present outer identity-strip button cannot be selected/focused inside the modal. Evidence: `failure.png`, `browser.json`, original browser output in `.impeccable/review/station-gallery/`. Add the same explicit End session control inside the clinical editor action group rather than weakening the modal boundary. This is a direct blocker for the requested session control; one focused confirmation will cover the editor/cancel/confirm path. Unrelated older model/editor layout findings remain deferred.

STATION-GALLERY-001 focused confirmation passes all three corrected fixture cases. Thirty-eight distinct backend cases have passing staged evidence (35 initial + 3 focused); this is not a repeated clean 38-case suite. Existing database guards remain unchanged. Formatter invocations briefly included an unsupported Python file and a nonexistent TSX variant of a TS module; those were command-input errors, not product failures. Supported files are Prettier-formatted and Python is Ruff-formatted.

STATION-GALLERY-002 focused confirmation passes the saved-editor and walk-in confirmation paths, including Cancel with no logout, unsaved-input warning, exactly one logout and no additional browser prompt. Final tablet/phone and editor-confirmation captures have no page overflow. A Station-context check places End session inside every Station dental header, including read-only/provisional care, without adding it to normal clinic dental views.

## STATION-GALLERY-003 — Non-blocking browser DOM error during editor navigation (deferred)

The final focused browser report records one `Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.` error while navigating the saved editor → clinical notes → Station home → walk-in editor → notes → dental sequence. The harness did not record a stack or precise event timestamp, so the responsible component is unproven. All subsequent confirmation/logout assertions completed successfully; no persisted-record failure was observed. Evidence: `.impeccable/review/station-gallery/browser-confirmation.json` and output. Keep the exact navigation sequence for later reproduction. No third browser round, speculative repair, or unrelated editor polish was attempted under the user's log-first preference. Do not claim error-free browser acceptance.

## STATION-GALLERY-004 — Queue-priority ordering found during activation review

Final source inspection finds the combined agenda sorted active queues by displayed appointment/check-in time. This can disagree with a staff-reordered queue and mislabel who is up next. It blocks accurate activation of the requested agenda. Preserve native queue `order` for active tickets (current service first), then chronological scheduled appointments. Add one focused priority-order case; do not rerun the broad backend/browser passes or change queue mutations. This is a new feature activation repair under the standing authorization, not an unrelated queue rewrite.

STATION-GALLERY-004 confirmation: the added priority case passes, retaining staff queue order ahead of later scheduled patients. Scoped Ruff passes. Original preservation verifies all 5,339 rows across 126 tables after additive stations.0005; the repaired source has a separately verified private activation bundle. The gallery is active locally. STATION-GALLERY-003 remains deferred, with no third browser round. See `docs/operations/station-gallery-verification.md` for precise staged evidence and current runtime.

## DENTAL-ILLUSTRATION-001 — build compatibility blocker (resolved for activation)

The first `.next-dental-illustration` build compiled JavaScript but TypeScript rejected passing Three.js's `BufferAttribute | InterleavedBufferAttribute` to `Box3.setFromBufferAttribute` in the new label/overlay code. Evidence: `.impeccable/review/dental-illustration/build.log`. Activation-authorized repair uses the already computed geometry bounding box instead. The subsequent production build/TypeScript passes (`build-confirmation.log`). No backend/schema/data change.

## DENTAL-ILLUSTRATION-002 — geometry harness pivot assertion (corrected)

The initial focused geometry script passed state semantics, then incorrectly compared the rotated irregular tooth's axis-aligned bounding-box center with the original approximate box center (`center 18 mesial`). A changing AABB center does not establish pivot drift. The implementation rotates around the precise original geometry box center. The corrected harness transforms that same tooth-local pivot through all twelve presets and verifies stable center, no accumulated rotation, reset and local-point round-trip. `geometry.log` retains the failure; `geometry-confirmation.log` has three passing groups. Product code was not changed for this assertion. No repeated broad suite.

The pre-existing anatomy `Bot` unused-import warning remains deferred with ANAT-REF-003. Older unrelated editor/Station/GPU findings remain deferred; this phase does not claim to resolve them.

## DENTAL-ILLUSTRATION-003 — prior-visit chart metadata in a new draft (resolved for activation)

Final source inspection found that copying a prior chart finding with object spread retained `encounter_id`, a read-only chart field. The draft API forbids extra fields, so clearing a prior visit's crown/bracket/missing/impaction state could fail saving. The repair constructs only supported finding fields, preserving key/surfaces/notes/anchor while resolving the state. Current-visit save/reload already passed before this discovery. A focused cross-visit confirmation is recorded separately; original records and backend validation remain unchanged. The geometry script now asserts that chart metadata is stripped.

The first cross-visit fixture preparation attempted to finalize a synthetic encounter with an existing browser editing lease and correctly received `OWNERSHIP` (another device). No product change/bypass was made: the fixture instead creates a separate synthetic prior encounter without a lease and uses the normal save/completion/finalization services. Review data is confined to the isolated dental review database.

## DENTAL-ILLUSTRATION-004 — focused cross-visit browser acceptance gap (deferred)

The separate confirmation reached the new synthetic visit, displayed the prior crown state, then timed out clicking `Crown present` because the control was disabled. No browser exception occurred. Evidence: `.impeccable/review/dental-illustration/carry-forward-browser.json`. The run did not establish the reason for the read-only state or complete a cross-visit save. Initial current-visit save/reload and clearing passed; final metadata-stripping geometry/unit assertions and production build pass. Retain this limitation rather than claiming a successful cross-visit browser journey. No further browser round or speculative authorization/lease repair was run; original permissions remain intact.

## CLINICAL-AI-DRAWER-001 — phone position assertion (deferred)

The initial focused drawer browser run passed desktop unchanged canvas bounds/full viewport drawer height and current-state crown/missing save/reload. It then stopped at `dental-phone-drawer parent y changed` after resizing directly from desktop to phone and clicking the header trigger. Evidence: `.impeccable/review/clinical-ai-drawer/browser.json` and `failure.png`. No browser exception/AI traffic. The cause of the position change was not established; a subsequent focused confirmation checks canvas dimensions after settling viewport/trigger visibility, retains before/after positions, and does not claim to resolve this initial position assertion. No speculative parent/editor scrolling repair. Existing unrelated findings remain deferred.

Source/visual inspection also found shared Sheet side-width variants overriding the drawer's intended width. This directly affects the requested drawer, so its own side variants now explicitly set viewport-height and a maximum 420px width. Crowns keep a distinct gold shell with a dark edge even when selected; a missing tooth suppresses crown accessories and stays red. No shared Sheet defaults were changed.

## CLINICAL-AI-DRAWER-002 — anatomy width acceptance gap (deferred)

The one focused confirmation establishes phone canvas bounds unchanged (x/y/width/height), a 390×844 full-height drawer and no page exceptions. It then switches from dental to anatomy and stops at `anatomy-confirmation parent width changed`. Before/after anatomy dimensions were not retained before the assertion, so timing/reflow cause is not established. Evidence `.impeccable/review/clinical-ai-drawer/confirmation-browser.json` / `confirmation-failure.png`. The anatomy layout source no longer reserves an AI grid column; do not claim a passing anatomy no-resize browser assertion. No third browser round, parent scrolling/viewport speculative fix, or unrelated repair was performed. The phone capture also shows the inherited full-width drawer alignment/scroll-gap offset at its left edge; exact mobile edge placement remains a refinement rather than a claim of pixel-perfect acceptance.

## CLINICAL-AI-DRAWER-003 — Station header covers drawer (resolved)

Reproduction: enter a doctor-code Station workspace, open a consultation, then Medframe AI. Identity strip z130 covered the drawer's z90 header/top close area. User-authorized narrow repair `9452d7a` raises the shared drawer to z150, below confirmations z160/170. One real Station browser group verifies stacking and actual top-button hit testing/full height/close; build passes and fix is active locally with `.next-ai-drawer-layer`. Earlier responsive findings remain deferred. See the latest section of `docs/operations/clinical-ai-drawer-verification.md`.

## STATION-KIOSK-001 — build/lint blockers (repaired for activation)

The first new kiosk build failed TypeScript because a remaining old placeholder compared a narrowed `display` mode with `kiosk`. The active kiosk now has its own entry link, so the old branch text was corrected. Initial scoped ESLint also found new JSX apostrophes, synchronous state setters in effects and a render-time Date.now ref initializer. These activation blockers were repaired with escaped/typographic copy, keyed availability results and scheduled initialization. Ruff initially reported unformatted new lines/imports and long SQL/string literals; supported formatting/import fixes and wrapping resolve them. Later production build/TypeScript and scoped Ruff pass. One hook cleanup ref warning remains reported rather than suppressed. Raw staged logs `.impeccable/review/station-kiosk/` retain initial failures and confirmations.

## STATION-KIOSK-002 — initial portal browser fixture realm (corrected)

The initial accumulated browser run reached the staff Station screen, then could not find `Get a patient kiosk code` because `/portal/graphql` correctly returned 401. The private synthetic fixture set Django session `auth_realm=patient` but left ClinicalSession.realm at its default `staff`. Native middleware rejected that mismatch. The fixture is corrected to create matching patient-realm native sessions, and one confirmation run continues the scoped flow. No application authentication/MFA/permissions were changed or bypassed. Initial failure JSON/capture stays in the ignored phase evidence.

Source review added a device-scoped clear generation to prevent a late verification request from reopening patient scope after reset: End increments the generation while holding the same boundary lock as redemption; stale-generation redemption fails before consuming the code. The focused generation test and issued-bill privacy test both pass separately from the initial 21 backend cases. This additive boundary table is part of the implemented kiosk milestone, not a broad testing loop.

## DEVICE-CODE-001 — browser harness visibility and interrupted confirmation

The initial device-modal browser pass verified Manage settings/no generation action, then attempted to read an `active` table cell through role queries while the pairing dialog made background content inaccessible. It stopped at `Opening pairing modal changed active connection`; this was a harness visibility assertion, not evidence that opening changed access. The focused confirmation replaces that read with the existing authorized read-only device-status endpoint.

That confirmation produced ready/copied/phone captures and reached generation/regeneration and clipboard checks before the user interrupted the turn. Its CLI call did not return a completed result; all local API/web/worker/beat processes were stopped by the interruption. The final fake-clock expiry/close-and-reopen assertions have no completed browser result and remain unverified. Do not describe the whole confirmation as passing or run a broad retest. Raw logs and four captures are retained under ignored `output/playwright/device-code-modals/`. No unrelated application fix was attempted.

## KIOSK-RECEPTION-001 — generated migration import order (activation blocker)

The accumulated Ruff pass reports I001 only in newly generated `stations.0009_reception_kiosk_access`: Django emitted uuid after third-party imports. This is a new-phase activation blocker; the bounded import organizer was applied and the final touched Python scope passes Ruff. Existing use-kiosk cleanup-ref warning remains deferred and is not repaired. Initial reports are retained in ignored phase evidence.

## KIOSK-RECEPTION-002 — accumulated test requested simultaneous active departments

The first scoped run passed 11 of 12 cases. The normal multi-action test attempted two walk-in admissions in different departments without completing/transferring the first active stage. Existing ACTIVE_STAGE protection correctly rejected the second admission; one visit cannot hold duplicate active stages. The fixture assertion is corrected to book a future appointment then join the laboratory queue using the same session. Only that case is rerun for activation; department integrity rules are not changed. No clean 12-case repeated-suite claim.

## KIOSK-RECEPTION-003 — browser bill fixture label mismatch

The one browser journey confirms the direct collection return, native reception assignment without a code, a future booking, second-task walk-in admission and opening the same patient's bills. It then times out looking for exact text `Synthetic consultation`; the isolated fixture line is `Synthetic consultation service`. This is a harness label mismatch. One focused continuation attempted the corrected description but again used exact matching; the UI includes the quantity (`Synthetic consultation service × 1`). That continuation stopped before Home/session preservation, phone bounds and Finish clearing. Those final browser assertions remain unverified; no third browser run or billing/backend integrity change was made. The initial ready/bound-session and second-task ticket captures remain evidence of the earlier completed steps.

## KIOSK-RECEPTION-004 — strict-mode in-flight activity isolation (activation repair)

Final source review found that a strict-mode task switch cleared local identity without advancing the request epoch. A prior task's late activity response could restore its old session summary after the code screen opened. Strict task switches now advance the epoch before clearing identity; normal task switches retain the epoch so their live snapshot poll remains usable. This is a direct new-mode activation blocker repair. No further broad browser run; strict UI race acceptance remains unverified.

## SESSION-ROUTING-001 — ordinary form logout compatibility (activation repair)

Initial scoped backend pass: eight of nine pass; the existing form/bodyless logout contract returns 400 because the new optional clear_device flag attempted to parse multipart form content as JSON. Restrict optional flag parsing to JSON requests; ordinary logout keeps its original form contract and does not detach pairing. That one compatibility case passes in the focused activation confirmation; final scoped Ruff/format passes. No password/MFA or authorization change.

## SESSION-ROUTING-002 — intentional hard-navigation lint warning

Scoped ESLint has zero errors and one warning for window.location.assign on Open my workspace. This recovery control deliberately performs a full document navigation to discard the rejected workspace/client-router state reported by the user. Ordinary app navigation still uses the existing router/link system. Warning is retained rather than suppressed; no broad lint repair.

## DEVICES-GALLERY-001 — initial sort assertion timing and bounded responsive refinement

The accumulated browser run captures desktop/tablet/phone without horizontal overflow, then passes guide/category/search/empty-state and name/contact sort checks. It immediately reads card order after choosing Newest first and stops at `Newest order changed`. A subsequent read-only control/DOM inspection shows the correct native newest order and selected sort, so the assertion needs to await the committed order. The first read-only diagnostic also targeted two existing main elements and was narrowed to the actual controls; no app/main structure repair.

Visual inspection finds a cramped phone search field. One bounded refinement gives search a full phone row and corrects the new status sentence's positional word “below.” One focused confirmation covers these changes, awaited sort and the remaining separate-modal checks. No backend/auth changes or unrelated repair. Initial captures/logs retained under ignored output/playwright/devices-gallery/.

## LOCAL-LAUNCHER-001 — activation environment and tooling diagnostics

The first post-interruption preservation check could not connect to PostgreSQL at 127.0.0.1:55432: Docker infrastructure was stopped. Starting the existing Compose infrastructure retained its volumes; the subsequent fingerprint check passes for all 6,030 original rows/139 tables. No database restore into the original or schema change was performed. Initial launcher Ruff reports UTC-alias and nested-if style errors; the activation cleanup resolves both and scoped checks pass. The first Graphify helper import used nonexistent `graphify.graph`; using the installed documented build API produces the scoped graph. These were bounded activation/tooling corrections, with no unrelated repairs or broad app retest. Fresh-install setup and a pending-migration backup/apply sequence remain unexercised in this phase; the current database has no pending migrations.

## DEVICE-STATION-REFINE-001 — bounded browser and tooling diagnostics

The first route probe assumed `/clinic/<organization>/settings/devices`; the actual existing route is `/clinic/settings/stations?organization=...`. Correcting the harness route reaches the page without an application change. The initial interaction pass then stops on immediate phone bounds after viewport resize. Read-only settled inspection shows x16/y33.77/w343/h776.47 within 390×844 and a visible persistent footer. No modal bounds repair. One focused confirmation waits for layout settling and includes the added Patient Stations reference request; no third polish pass. Initial browser logs/captures retained. One Ruff invocation used the frontend working directory and was rerun at the correct root; source checks pass. The Graphify helper reports multiprocessing initialization/fallback warnings and completes both AST corpora; graphs exclude tests/scripts/private/assets and are not substitutes for verification.

## DEVICE-STATION-REFINE-002 — confirmation stops on changed dialog title

The combined confirmation completes dashboard captures at 1440/1024/390 without page overflow; real department summary/drill-down, no-match/patient search, identity attestation, reception assignment and native department create/edit checks reach the subsequent device creation. Required-reading disable and keyboard switch checks complete, with desktop/phone modal captures. Create succeeds and the component title changes from Add clinic device to Manage device. The harness keeps the old dialog locator while awaiting Device settings saved and times out. A read-only inspection confirms the new title, saved function, status and clean disabled Save button. No product change or third browser run. Later browser assertions for actual clipboard, close/reopen/page-reload code redisplay, regeneration/redemption hiding, strict-setting persistence and login control remain unexecuted; scoped backend code-lifecycle tests pass. Do not claim complete browser acceptance or silently repeat the broad journey.

## CLINIC-WORKSPACE-UI-001 — scoped reporting fixture boundaries (corrected)

The initial patient-summary run passes seven of eight cases; its billing fixture uses host-UTC localdate while the clinic has advanced to the next day, so native issue validation rejects a due date before issue day. The fixture now uses a future due date, and only that case passes in focused confirmation. The initial finance-report run passes five of six cases; an attempted USD invoice is correctly rejected by the existing PHP-only billing_invoice_values constraint. Replacing that fixture with supported PHP aggregation and adding the negative-net case yields two focused passes. No currency constraint, invoice policy, account, original record or production behavior was weakened. Raw staged logs are retained outside Git; no repeated clean-suite claim.

## CLINIC-WORKSPACE-UI-002 — browser empty-state role mismatch (corrected harness)

The accumulated seven-page/three-width browser pass confirms 21 no-overflow captures and profile navigation/saved-note/editor-link/reload, then times out looking for the heading role `No matching patients`. Shared shadcn EmptyTitle renders a div. A single focused continuation uses exact visible text, confirms table/card/search recovery, finance period/keyboard/data-table controls, directory-only clinical exclusion and settled dashboard widgets, with no page exceptions. No product repair or third browser run. Older deferred findings remain unchanged. Evidence: ignored `output/playwright/clinic-workspace-ui/browser-initial.log` and `browser-confirmation.log`; scope/limits in `clinic-workspace-ui-verification.md`.

## KIOSK-RECOVERY-001 — Diagnostics timestamp rendering (repaired)

Reported Diagnostics list with records renders a full created_at timestamp through a date-only formatter. Its numeric day becomes NaN, yielding RangeError Invalid time value. Direct reproduction confirms it; the list now uses clinic-timezone timestamp formatting, shared calendar labels validate inputs, and malformed responses no longer remain in loading indefinitely. Three pure date cases and the bounded native Diagnostics browser list/filter pass. No authorization bypass or original record changes.

## KIOSK-RECOVERY-002 — automatic patient reset on polling failure (repaired)

Source trace shows transient activity/status failures invoke reset/end; stale receive generations also invoke end and advance the boundary again. Network failures can clear forms, and shared-device tabs can invalidate one another repeatedly. Transient failures now preserve input/journey; stale receiving clients halt without automatic end/setup. Explicit Finish/expiry still clear identity. Browser evidence confirms retained identity after a failed submission, retained patient journey after a failed status poll, and one initial end/one rejected receive without repetition under simulated time. Broader physical multi-tab and hard server idle acceptance are not claimed.

## KIOSK-RECOVERY-003 — paired-kiosk staff policy blocker (activation repair)

The initial new backend cases use direct request objects without the middleware ContextVar and pass, while the first actual native browser staff-context request correctly hits the old clinician-only device gate. One narrow policy repair permits only native staff operations.read/appointments.manage on the kiosk endpoints, with active matching device and existing membership/MFA/branch requirements. Two focused real-context boundary cases and one staff browser continuation pass; clinical/financial/GraphQL paths remain denied. No repeated broad test/polish run. The initial fixture also rejects an assumed device/organization match; corrected synthetic setup is isolated rather than weakening scope.

## KIOSK-RECOVERY-004 — retained diagnostics and coverage limits

Scoped ESLint reports zero errors/two warnings (new callback member dependency and existing epoch cleanup ref). Node's direct TypeScript test import emits a module-type warning; all three cases pass. Existing original API logs also show Redis channel receive timeouts and streaming-response warnings; these are separate from the confirmed date formatter and kiosk HTTP reset paths and remain deferred without repair. The shared empty-value select's blank display and broad slow-network/idle/sign-out-failure/Google-MFA/physical-device acceptance remain outside this bounded pass. Exact evidence and limits are in `docs/operations/diagnostics-kiosk-recovery-verification.md`.

## B7-001 — website image SQL purpose constraint (activation repair)

Initial scoped run passes nine/thirteen; four image cases hit the existing document_purpose constraint. Additive websites.0003 permits website images only with no patient/encounter, retaining clinical/diagnostic and other asset rules. Historical migrations and original records are unchanged. Staged focused cases pass after the fixture corrections below; no clean repeated-suite claim.

## B7-002 — image response/scan fixture assumptions (corrected)

First four-case confirmation passes one, then FileResponse.close signals request_finished inside the direct TestCase transaction and closes its DB connection, preventing three cases. Close the fixture's in-memory stream instead. The next three-case confirmation passes two and correctly rejects clean→rejected mutation under the native conclusive-scan immutable guard. The last fixture asserts that guard and uses native unpublish for withdrawal; its one-case confirmation passes. No scan trigger or production document integrity was weakened.

## B7-003 — RHF generic and custom-host routing (activation repairs)

The first build fails on RHF's generic field-value conditional; FieldPathValue corrects the typed helper. Production build/TS passes. The accumulated browser establishes six publisher groups, then discovers nextUrl.hostname is normalized to the internal app host and an unknown Host receives the private-route login redirect instead of404. The proxy now parses/validates the incoming Host and maps only verified published aliases; a bounded read-only HTTP confirmation establishes unknown/verified host private-route404 and verified public root200. Same-batch visual refinement prevents global clinic h1 rules shrinking public headings, uses preview container responsiveness and hides empty public sections. No third browser round or unrelated UI repair.

## B7-004 — focused phone-preview locator mismatch (deferred acceptance)

The focused continuation selects the editorial/dental template and forest palette, then waits for capitalized Phone; its actual accessible text is lowercase phone with visual capitalization. Final phone-preview capture/save/republication/style assertions remain unexecuted. Initial desktop/phone captures and six core groups remain evidence; final build/TS/lint pass, but no complete post-refinement responsive or template-control browser acceptance is claimed. No further browser run.

## B7-005 — custom alias canonical remains application clinic URL (deferred)

Verified local alias root serves the published page, but its canonical points to the stable Medframe /clinics/[slug] URL rather than the alias root. The focused custom-domain canonical assertion fails; HTTP inspection records that actual canonical. Mapping/private-route denial/robots/domain sitemap checks pass separately. Primary custom-domain canonical selection is deferred; real domain DNS/TLS/hosting is operator setup and was not changed or accepted. Unrelated older findings remain deferred.

## IMPROVE-001 — Initial review setup/locator failures (historical, bounded correction)

October20 Phase1/2: the first isolated fixture wrapper set DATABASE_URL, whereas
Django uses its separate DJANGO_DATABASE_URL/NAME target. The fixture's database
assertion stopped before mutation. The corrected wrapper explicitly selects the
review DB. A prematurely opened review API received only anonymous login/session
reads before restart; no original fixture/session import or authenticated review.
Initial browser groups did not leave the default dental dialog; the historical
export dialog was covered by that canvas. The initial history group also assumed
a named region for an unnamed section. One focused confirmation uses Clinical
notes and the actual section, then passes historical export/revocation and older
payment/refund/confirmation. Other groups remain independently recorded. Initial
logs/screenshots preserved; no third browser round. See workflow-finance-improvements-verification.md.

## IMPROVE-002 — Applying specialty guidance browser acceptance incomplete

Specialty selection and edited starter save succeed through native controls.
After Clinical notes, the focused group waits for the inner Consultation guidance
summary while its outer Consultation template & prompts details is collapsed.
The screenshot shows the unchanged synthetic unpublished SOAP and collapsed
parent; this is a harness discovery/acceptance gap, not a reproduced application
failure or authorization issue. Browser apply/save/SOAP-preservation assertions
were not reached. The reusable helper/click path now includes the parent, but was
not rerun after exhausting one pass/one confirmation. Do not claim full connected
specialty-application acceptance. No native template/editor owner change or
speculative UI/permission repair. Remaining B8-002 template-application scope is
tracked here; saved CSV/exact JSON/review invalidation/revocation/reader gaps now
have passing evidence in this phase.

## IMPROVE-003 — Recorded-payment print spans five A4 pages (deferred)

Open invoice → Recorded payments → View confirmation and render print media.
The browser-generated PDF preserves only the confirmation's text and correct
original/refund/retained/current-balance/source fields, but paginates the compact
confirmation over five A4 pages. Impact: excessive paper/whitespace. Evidence
output/playwright/improvements12/payment-confirmation.pdf and
/tmp/medframe-improvements12-confirmation-print.txt; PDF page count5. The UI
confirmation works for staff/portal and the backend denies nonexistent/foreign
payments; no financial or patient authorization bypass was observed. Print
layout remains deferred without a polish/rebuild/third-browser loop; physical
printing and the refreshed-on-print button were not exercised. Do not claim a
single-page receipt or complete printer acceptance.

## October20 Phase1/2 status update to older findings

B4-004's unbounded detail serialization is resolved in 48d6bb0: first20 rows for
payments/events, scoped signed keyset pages and an independent full eligible
refund lookup; whole-ledger totals remain authoritative. Ten focused cases pass.
SERVICE-CONTEXT-001's missing draft/uninvoiced/void/workflow-reader/portal branches
now pass in this phase, together with partial→deposit-settled payment and native
schedule filters. This does not establish every historical retry/editor/catalog
permutation from SERVICE-PLAN-002. B8-002's saved-file defect is a corrected harness
path: actual CSV and exact historical JSON files parse; remaining template apply
acceptance is IMPROVE-002. Older unrelated findings remain deferred.

## TABLET-IMPROVE-001 — Initial dental dialog locator (historical)

Phase3 probe asks for Dental editor, but Radix uses the patient title. Four dental
groups stop before actions; screenshots show the editor. The one confirmation
uses data-dental-editor and passes cross-visit save/reopen and model-fetch
fallback. Initial anatomy GPU fallback passes. No missing-editor failure or
permission change inferred. See tablet-editor-improvements-verification.md.

## TABLET-IMPROVE-002 — Navigation error reproduced; component still unproven

Saved editor→notes→home→walk-in→notes reproduces STATION-GALLERY-003 at
2026-10-20T04:57:39.793Z with a full React production deletion stack (first frame
ui,2nii411saqstq.js:1:108261). Walk-in notes still render; no saved-record loss.
Final Dental locator mismatches actual Dental chart. No app component identified;
no speculative React/Three/portal rewrite. Still deferred, not resolved. Evidence
/tmp/medframe-improvements3-confirmation.log and ignored improvements34 captures.

## TABLET-IMPROVE-003 — Drawer responsive/keyboard acceptance remains partial

1024 dental canvas/full-height drawer/close hit test and Escape retaining parent
pass. At768 close hit testing fails during fade/transform;390 not reached.
Anatomy stops on immediate1024 canvas-size comparison;390/GPU continuation not
reached. Settled layout/pointer/focus semantics unproven; no product repair
inferred or complete responsive claim. No third browser run. Older gaps remain.

## TABLET-IMPROVE-004 — GPU/save final browser reload assertion gap

Dental context loss reaches fallback, Continue in2D, notes edit and native Draft
saved. Reload Subjective locator then times out with the dental dialog open.
A read-only isolated native require_encounter query verifies version3 and the
exact saved SOAP/crown/missing/impaction states, writing nothing. Keep the split
evidence, not a clean full browser-group claim. Model-fetch fallback passes with
its intentionally aborted request's expected browser error retained.

## October20 Phase3 cross-visit status

DENTAL-ILLUSTRATION-004 now has a passing known-writer browser save/reopen for
prior crown and missing/impacted states, without weakening grants/provider/lease.
That specific acceptance gap is resolved; navigation, responsive drawers and
other deferred findings remain. Phase4 product work awaits written display/
payment contract review and is not implemented.
