# Dental editor and point notes — October 19, 2026

**Status: available locally for review; browser acceptance incomplete.** Source commit `d803a4f`, branch `codex/dental-editor`. The user requested a default 3D editor, individual teeth and Figma-like point notes. The existing record workflow is extended, not replaced.

## Source scope

Consultations now open the full-viewport dental workspace. Desktop has 32 individual permanent tooth controls, a large canvas and a scrollable inspector. The canonical Radix Dialog owns focus/escape; Back to consultation returns to SOAP without discarding the RHF draft. Save/version/IME state, inline failure feedback and persistence remain in EncounterEditor. Mobile keeps the canvas primary and exposes a toggled inspector and the keyboard/2D dentition selector.

Select identifies teeth; isolation and camera views expose their sides. Comment mode raycasts the clicked tooth and stores its intersection in tooth-local coordinates. A numbered pin opens a note popover. Add note stages a `Pinned note` finding in the existing RHF aggregate; Save draft persists the consultation. Current draft notes can be edited, resolved/reopened or removed. Historical/other-encounter notes are read only. Unposted text has a navigation guard and disables the editor save action until added/cancelled. Drags over four pixels do not create pins.

Optional anchors contain a whitelisted asset version and three finite bounded coordinates. Detailed-molar anchors require FDI 26; primary teeth cannot use permanent anchors. Legacy findings keep their existing shape without null anchor keys. Draft, exact revision and chart JSON preserve anchors; the normalized ToothFinding index retains its existing clinical fields. Comparison detects anchor changes. No schema migration is needed. Authentication, patient scope, permissions and immutable finalization/amendment owners remain unchanged.

Pins identify visual points, not validated anatomical surfaces. Conventional surface labels remain explicit. Arch and detailed-molar coordinates remain separate and reopening a note selects its asset. Read-only ChartView also renders recorded pins. Live collaboration, reply threads and independent clinical validation are not implemented or claimed.

## Single bounded verification pass

| Check                           | Actual result                                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Prettier / Python formatting    | Applied                                                                                                                 |
| TypeScript / production build   | Passed; separate `.next-dental-editor` artifact                                                                         |
| ESLint                          | Passed, zero errors; two existing operations warnings                                                                   |
| Focused Django tests            | Two passed: validation/legacy compatibility and finalized anchor/amendment preservation                                 |
| Targeted Ruff                   | One test-file I001 import-order finding; deferred                                                                       |
| Impeccable scoped detector      | Exit 0, no findings printed; not runtime validation                                                                     |
| Connected browser               | All five groups failed to reach their targets after the editor dialog locator was not found; zero page errors; no retry |
| Screenshots / visual acceptance | Not captured; no visual acceptance claimed                                                                              |
| Local startup smoke             | Login and permanent GLB return HTTP 200                                                                                 |

Source inspection suggests the harness expects aria-label `Dental editor` while Radix's aria-labelledby targets the patient-name DialogTitle. This remains an inference; no corrected-selector run was made. EDITOR-001/002 in `error-log.md` record the exact findings. Per the user's one-pass/no-repair preference, connected point-note save/reload, default full-screen rendering, rotation and mobile interaction remain unverified. Backend persistence/finalization tests passed; that is not a browser pass. The local instance is available for review with these limits, not presented as fully accepted.

Tests used the test database. The browser signed in with the dedicated synthetic fixture but did not create or save a note. No original records were changed. Evidence/harness are retained in ignored `.impeccable/review/dental-editor/`. Impeccable review/documentation were native, without subagents; finish disposition is recapture because required evidence is missing. No additional capture round was started under the user's limit.

## Local runtime and rollback

Preserved baseline: `checkpoint/pre-dental-editor-2026-10-19` at `b479384`, with `.next-anatomical-dental` intact. Local web 3000 now runs `.next-dental-editor` against API 8000, WEB_ORIGIN `http://localhost:3000`. API was restarted for backward-compatible anchor validation. Database, accounts, passwords/MFA, worker and beat remain unchanged. No migration/reset or public deployment occurred.

Logs: `/tmp/medframe-dental-editor-web-runtime.log`, `/tmp/medframe-dental-editor-api-runtime.log`. Native startup sessions: web 81572, API 83277. Temporary API 8001/web 3001 are stopped.

For UI rollback, stop only the editor web process and restart `.next-anatomical-dental` from `apps/web` using the same BACKEND_URL/WEB_ORIGIN. The new API accepts old requests and can remain running. Full source rollback can use the preserved tag in a separate checkout and restart its API; no database rollback is required. Never reset source data or overwrite uncommitted work.

Before browser acceptance, address the logged findings only when authorized and exercise the blocked focused interactions. Do not silently convert the coverage gap into a pass.
