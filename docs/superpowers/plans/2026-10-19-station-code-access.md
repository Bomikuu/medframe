# Station code access implementation plan

**Goal:** A code issued by a named authenticated clinician opens the same consultation on an approved tablet without another login.

**Architecture:** Link ConsultationHandoff to a new HandoffAccessProof with source native-session/auth-epoch proof, and add StationAccessSession, then atomically accept the existing handoff and create a bounded native staff session. Reuse existing clinical editor/lease and enforce narrow authorization at every shared boundary.

**Spec:** `docs/superpowers/specs/2026-10-19-station-code-access-design.md`.

**Execution:** Native, explicitly authorized by the user's answer; no additional permission handoff or subagents. Standing single accumulated verification overrides per-task repeated TDD runs.

- [x] Preserve source tag/build and encrypted verified review clone. Existing graph first; sanitized Jev risk judgment.
- [x] Tests first: synthetic `test_station_access.py` pins anonymous successful redemption, same draft/old writer rejection, unchanged password/MFA, no unapproved/kiosk/foreign credential, no code reuse/expired issuer/stale draft, no responsibility impersonation, issuer/device/session expiry, exact patient/encounter restriction, alias/fragment financial/Admin/identity denial, delegated chain denial and session termination.
- [x] `stations/access.py` owns native issuance/redemption and live StationAccessSession validation; `access_scope.py` owns GraphQL/domain/HTTP constraints. Add separate source-proof/session tables and one additive Django migration, preserving the existing handoff table and its row fingerprints. Integrate existing middleware, handoff, membership/patient/encounter/document boundaries; expose `/stations/access` and scoped context.
- [x] Add public `AccessCodeForm`, native source code disclosure, scoped session strip and end/resume routes. Preserve real shadcn/Tailwind/Impeccable world; no new tokens/assets. Existing provider handoff remains separate.
- [x] Format with Ruff/Prettier; run accumulated new/backend auth/lease cases, scoped lint/build and one two-browser no-login path with phone/tablet capture. Log unrelated findings; repair only activation blockers with bounded focused confirmation. Refresh relevant Graphify code corpus and record Jev/evidence.
- [x] Commit; fresh encrypted checkpoint/verified restore, stop writes/fingerprint/apply additive migration/verify originals/start `.next-station-code` and original Django services. Preserve `.next-station` and accounts. Record actual results and deferred phases, without push.

Review focus: native MFA is delegated from a live session rather than bypassed by a device setup code; copied cookies must not escape binding; aliases/fragments may not bypass GraphQL limits; a stale/failed transfer must not create a logged-in session; another user may not silently replace an existing identity.

## Delivered state

Active locally. Checked work packages represent the delivered code/access/preservation milestone, not exhaustive browser acceptance. The initial backend run and scoped added checks establish 47 distinct passing cases. Code-only entry succeeds in the browser; the confirmation stops at a duplicate status locator after save, leaving later UI assertions deferred. See `docs/operations/station-code-access-verification.md` for exact evidence and limits.
