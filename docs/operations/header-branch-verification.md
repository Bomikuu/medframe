# Shared header branch across clinic pages — October21,2026

## User request and implementation

User requested an application-wide check and removal of duplicate Clinic branch selectors because branch selection belongs in the header.

Source inventory covered frontend page components, branch state, branch option maps and shared selectors. Removed page-context controls from Dashboard/analytics, Patients directory, Queue, Provider schedules, Services, Billing, financial overview, Communications, registration review, patient appointment actions, Patient Stations/department workspace, Clinical Station home and doctor-code dialog. Deleted the unused BranchChoice primitive and obsolete schedule/Station branch-control slots rather than retaining empty panels. Other period/provider/status/department/currency filters retain their native owners. Temporary manual refresh on Appointments and Queue remains in place.

Clinic pages consume WorkspaceProvider.branchId, including default billing/operations setup. Header URLs carry the selection. A permitted recent branch is retained within the mounted organization workspace for legacy navigation that omits its query parameter; an explicit valid URL branch takes precedence. Header changes still pass the existing unsaved-work guard. The branch-keyed workspace subtree resets pagination, open panels, searches and branch-specific async owners on actual branch changes, without remounting for every ordinary data event. Backend membership/branch/patient/device authorization remains authoritative.

Signed-in native Clinical Station now uses HeaderBranchControl in its header, reusing ClinicSwitcherDialog. Code/delegated Station sessions show their assigned branch read-only and do not receive an unrestricted chooser. Doctor access codes use current header branch with read-only context text. No new delegation permission or access duration was introduced.

Preserved genuine assignments/configuration: staff Assigned branch access control, device Device branch, patient/Station new-patient Registration branch, multi-branch service availability, public website queue branch and onboarding primary-branch data. New patient/device/walk-in defaults use the current branch where appropriate; existing record assignments remain unchanged. Patient-specific appointment actions retain the actual patient branch as a pinned operational scope and no longer offer reassignment through a context selector. Organization-wide staff/settings views retain their existing domain scope; removal of context selectors is not a claim that every organization-wide resource became branch-owned.

## Preservation and local activation

No backend/schema/migration/identity/credential/MFA/grant modification for this feature. Broad unrelated source edits and the user's pre-existing clinic-shell width snippet were not edited. Private per-file source snapshots are under `.medframe-runtime/header-branch-before`; source corpus manifest `.medframe-runtime/header-branch-final-files.txt` contains23 files, including the unchanged shared chooser inspected as a dependency.

Fresh encrypted checkpoint `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261021-205926-a89bd41` was restored into new isolated `medframe_django_header_branch_20261021_b19e4c`; all167 tables verified. Original database was not overwritten, reset or migrated. Existing storage untouched. Services use original medframe_django and `.next-local-dev` through the root launcher. Frontend restarts after temporary review cleanup; remaining managed services retain API1950712, worker1950845, scheduler1950846, media1950847. No source push, public deployment, messaging, live money movement or AI integration.

## Actual tool use and bounded verification

Native/no-subagent implementation. Graphify root query `BranchChoice useWorkspace branch_id --budget220` returned stale graph1150 nodes,6/592 nodes shown,586 truncated. Direct source determined the inventory/impact. Refreshed the private23-file focused AST corpus to147 nodes/286 edges in `.medframe-runtime/header-branch-graph`; query `useWorkspace HeaderBranchControl useBillingSetup --budget220` showed6/33 nodes,27 truncated. The graph covers these files and parsed import/symbol relationships, not complete project semantics or runtime authorization.

Sanitized Jev chose context removal while preserving assignments/server scope (jev-1.13.0,confidence1.0,421 input/31 output tokens). No private records, credentials or attachments sent; its judgment is not verification.

Existing design/interaction contracts, shared primitives and Impeccable guidance retained. Prettier formatting only; no builds, automated tests, typecheck/lint suites. One manual CUA visual pass at desktop1280x720 used newly created synthetic clinic/clinician/provider/two branches/three patient fixtures. A native synthetic MFA-complete session was seeded for review, not a real MFA challenge. A development/localhost/key/expiry-guarded temporary route used a credentialless iframe to preserve the user's browser authentication. Temporary SAMEORIGIN exception applied only to that review route; real-route DENY rules remained. No original clinic was enabled or modified.

Observed in native UI:

- Appointments retained manual-refresh status without branch filter.
- Patients initially displayed the two synthetic first-branch patients without a directory branch selector. Selecting Second review branch from the header changed the URL, reset the workspace and displayed only the one synthetic second-branch patient.
- Navigation retained that branch across Queue, Schedules, Services, Billing, Communications, Dashboard and Patient Stations. These pages rendered their ordinary controls/data/empty states with the duplicate branch UI absent. Queue retained manual Refresh; schedule/provider controls remained. Billing/Dashboard comparison controls remained without branch selectors; Dashboard current patient count was1 in the second branch.
- Patient Stations expanded Patient kiosk access into the removed branch-panel space and showed actual empty configuration/queue state. No service/link/message/settings mutation was performed.
- Patient registration dialog showed its current-branch reusable-link and pending-list interface without another selector. No registration link or invitation was created/sent.
- Devices & Stations native navigation opened Clinical Station. Station header displayed Second review branch; dashboard had no local selector. Connect my device dialog showed read-only “Branch: Second review branch”. No doctor code was generated, no device paired/approved, and no media permission requested.

The initial navigation snapshots sometimes preceded the Next.js transition; later native destination headings/content, not old snapshots, establish observations. No broad repair/retest loop. Full phone/tablet/responsive acceptance, all assignment form saves, clinical save/lease retention, unsaved-work confirmation, stale async mutation races, role denial, cross-device/delegated branch enforcement, every legacy deep link and full backend security regression remain unverified. Existing backend policy was not changed. Do not treat source inventory as browser coverage of every route.

Minor observed finding HEADER-BRANCH-001: Dashboard subtitle still lists every organization branch although its metrics correctly followed the selected branch. Logged without repair per user preference. Existing unrelated deferred findings remain deferred.

Cleanup revoked/deactivated only the new synthetic session/user/membership/clinic; history retained, no hard deletion. Review tab closed. Temporary route source archived privately then removed; original Next configuration restored byte-for-byte. No review authentication/bootstrap/framing exception is part of shipped feature. Frontend restarted to discard temporary development module state.

Final activation: frontend restarted as managed PID2049576 after cleanup; launcher reported ready at localhost:3000. No build generated. Backend/worker/scheduler/media remained running through this frontend-only phase.
