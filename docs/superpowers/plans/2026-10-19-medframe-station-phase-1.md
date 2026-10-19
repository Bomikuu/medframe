# Medframe Station Phase 1 implementation plan

**Goal:** Pair and revoke clinic devices, then continue one saved consultation between authorized clinicians/devices with server-enforced ownership.

**Architecture:** Add a Django `stations` app. Keep existing clinical store and API contracts; request-local device context extends existing encounter write policy. Extend the existing editor instead of forking it.

**Tech stack:** Django/PostgreSQL/native MFA, Next.js/TypeScript, RHF, shadcn, Tailwind, Prettier/Ruff.

**Spec:** `docs/superpowers/specs/2026-10-19-medframe-station-design.md`.

**Execution:** Native in this chat, explicitly authorized. No delegated implementation/review. User's bounded accumulated verification overrides per-task repeated test cycles.

## Constraints and review focus

- Preserve accounts, MFA, original rows, finalized history and backups. Additive migrations only.
- Pairing is not staff or patient verification; non-clinical mode never inherits staff access.
- Stale sender writes and concurrent acceptances must fail after transfer.
- New edits, lease expiry or revocation must invalidate pending handoffs without changing ownership.
- Responsibility receiver needs existing patient grant/provider; no automatic grants or financial authority.
- Connection failure must retain clinician input and honest save/connection status.

## Work packages

- [ ] Preserve source/tag and encrypted verified review clone. Query existing Graphify graphs and source; record sanitized Jev judgment.
- [ ] Add `stations/models.py`, `policy.py`, `pairing.py`, `ownership.py`, `handoffs.py`, `views.py`, `middleware.py`, `context.py`, `inputs.py` and migration. Models: Device, DeviceCredential, PairingChallenge, EditingLease, ConsultationHandoff, StationEvent. Use native permissions, row locks, digest-only codes, secure cookies, event/audit records and live revocation.
- [ ] Integrate middleware/settings/URLs/proxy allowlist and `require_encounter` write guard. `authorize_write(encounter, user)` is inert for unleased encounters; rejects unauthorized/expired/locked leased writers. `claim(request, organization_id, encounter_id)` reuses existing clinical policy. `offer/preview/accept/cancel` share encounter→lease lock ordering and exact version/generation checks.
- [ ] Add `features/stations/` typed client, management page, pairing page, Station home and focused consultation wrapper. Add a shared editor ownership control with save-before-transfer, explicit acceptance, lock/resume/reclaim, and read-only ownership loss. Restore bounded tooth/anatomy selection in the existing editors. Reuse permission-gated PatientBilling and current queue context.
- [ ] Add synthetic tests in `tests_django/test_stations.py`: pairing expiry/reuse/approval, staff realm and tenant/branch isolation, credential expiry/revocation/non-clinical restrictions, claim conflicts, lock/expiry, handoff stale versions/cancel/acceptance/replay, prior sender write denial, provider reassignment/no grant/immutable finalized denial. Add browser harness for pairing management, public state, two-context handoff and responsive controls.
- [ ] Format, run one accumulated scoped check and browser pass on isolated data/build; log actual failures. Refresh relevant code graph; record sanitized Jev review. Repair only necessary activation blockers, then focused confirmation.
- [ ] Fresh encrypted checkpoint/verified restore, stop local writes, fingerprint originals, apply additive Station migration, verify preservation and activate `.next-station` with original API/worker/beat. Record evidence, unfinished functionality and exact rollback boundary; commit without push.

## Next connected phases

Phase 2: minimal verified kiosk sessions, appointment availability/booking/check-in, one Visit with linked department queue stages and staff operations, session clearing and timeout. Phase 3: real provider-backed idempotent payment intents/webhooks/reconciliation, configurable payment gates, receipt release and minimal TV polling/announcements. Each requires its own exact implementation plan and bounded activation evidence; do not label reserved Station modes as complete workflows.
