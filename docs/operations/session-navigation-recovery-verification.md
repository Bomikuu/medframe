# Existing-session navigation recovery — October 19, 2026

Native branch `codex/session-navigation-recovery`. Baseline `3c1ac27` / `checkpoint/pre-session-navigation-recovery-2026-10-19`; `.next-kiosk-reception` retained. User reported existing-session record rejection that persisted across navigation/root while incognito worked, and a usable login page while already signed in.

## Cause and changes

Source established that root always redirected to `/clinic`, clinic/Station layouts checked only cookie presence, and login pages performed no authenticated-session check. Patient realms and scoped/device cookies could reach a staff bootstrap they were not permitted to read. The prior collection button did not resolve the session/surface mismatch.

Native `GET /auth/session` now returns only an authentication flag, route kind and internal destination after existing Django ClinicalSession/Station validation. Staff goes to clinic; patient to portal; doctor to their organization-scoped Station; legacy handoff to its exact consultation; kiosk/display/revoked device context to the appropriate Station surface; stale/anonymous native cookies remain unauthenticated. Only this diagnostic path is added to Station allowlists. Clinical GraphQL, live authorization, MFA and named patient/encounter scope remain enforced.

Root, login pages and staff/Station layouts use a shared no-store server reader with bounded timeout and validated internal destinations. Signed-in users are redirected from both login pages. Login also checks the current session on client mount to handle router content obtained before sign-in; it does not render the form during that check. A failed check shows an honest recovery state rather than treating an API outage as signed out. Ordinary MFA/recovery-code steps remain owned by AuthFlow.

Unavailable-record/no-organization/Station surfaces expose Open my workspace and Sign out of this browser without relying on the blocked WorkspaceProvider. Recovery deliberately uses full document navigation to clear stale client/router state. Explicit browser sign-out revokes only the current native session, clears local device/patient cookies and ends matching patient scope; clinic device registration/approval remains intact. The optional `clear_device` JSON flag is not set by ordinary logout, so routine tablet End session keeps its pairing. No credential/MFA/role change or clinical authorization bypass.

## Actual bounded verification

Production build/TypeScript pass: `.next-session-recovery`, BUILD_ID `hCAhoQlv27fCPb-POHqKd`. Scoped Ruff/format and Prettier pass; schema drift reports no changes. Scoped ESLint has zero errors and one retained warning for intentional full navigation on Open my workspace (SESSION-ROUTING-002).

Initial native backend run passes eight of nine; ordinary form logout exposed JSON parsing of a multipart body. Optional flag parsing now applies only to JSON, and that single focused compatibility case passes. Nine distinct staged passing cases, not a repeated clean suite. Native tests cover anonymous/stale cookies, MFA/revocation, staff and patient realm, kiosk mode/clinical denial, revoked device recovery, explicit local detachment and ordinary pairing preservation. Doctor/exact-encounter destinations are unit hints using already-validated request scope; a new full delegated-session browser lifecycle was not run.

One Playwright CLI run passes seven groups with three captures: client navigation after restored native staff cookies; staff root and both login pages; rejected-record full recovery preserving authorization; patient root/login/wrong-clinic routing; stale-cookie usable login; mixed staff plus approved kiosk cookie routing; explicit local sign-out deleting session/device/patient access cookies and opening login. Synthetic isolated fixtures only. Captures: `blocked-record-recovery`, `patient-session-routed`, `device-browser-recovery` under ignored `output/playwright/session-recovery/`. No broad repeated browser run. Desktop recovery surface was visually inspected. Mobile/keyboard/full outage behavior and every provider/history/navigation edge were not established; older unrelated issues remain deferred.

## Actual Graphify/Jev

Queried existing frontend graph first for WorkspaceProvider/SafetyProvider/LoginPage/useHistoryGuard; directly inspected native realms, middleware, route guards and source. Refreshed AST-only backend config/api_graphql/medframe_apps including migrations: 310 files, 1,830 nodes, 7,764 edges, 114 communities. Frontend app/features/components/lib (excluding generated.ts): 315 files, 1,627 nodes, 7,431 edges, 41 communities. No tests/scripts/assets/private files/runtime in graph. Zero external extraction tokens. Raw backend diagnostics: 811 dangling endpoints, 21 self-loops, 354 collapsed directed edges; frontend 283/4/90. Ten backend init/config files and frontend icon barrel yield no symbols; station-entry remains partially extracted. Queries are budget-truncated structural impact maps, not complete coverage.

Jev 1.13.0 received sanitized architecture only. Planning choice `route` versus permission bypass: confidence 1.0, 411 input/33 output tokens. Completion choice `bounded` versus comprehensive claims: confidence 1.0, 436/31. Used to support correct surface routing and scoped claims, not as authorization or verification. No patient data, credentials, session tokens, codes or private attachments sent.

## Local activation and preservation

Pending fresh encrypted checkpoint/isolated restore, original fingerprints and service activation. No migrations required; existing records/accounts/passwords/MFA/roles and prior artifacts retained. No clone import, database reset, public deployment, external messaging or money movement.
