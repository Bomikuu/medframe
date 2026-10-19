# Station patient kiosk implementation plan

Execute natively in this chat under the user's direct implementation authorization. No delegated reviewer or subagents.

**Goal:** deliver the connected Phase 2 patient kiosk, safe verification, existing booking/queue integration and provider-independent departments.
**Architecture:** add Station-owned proof/session/department/visit/stage/intake/idempotency records; retain existing clinical/auth/operations owners. Use dedicated minimal REST kiosk serializers behind device/proof boundaries, separate authorized staff/portal endpoints and shared typed UI.
**Stack:** Django/PostgreSQL transactions, Next.js client components, Tailwind/shadcn, existing scheduling/reservations.
**Spec:** docs/superpowers/specs/2026-10-19-station-patient-kiosk.md.

## Native implementation order

- [x] Add additive Station models/migrations: departments/counters, one daily open visit, stages/tickets, identity proofs/device sessions, bounded request results, intake review. Add append-only event evidence and scoped validation.
- [x] Implement digest-only proof issuance/redemption/live source/device expiry, minimal kiosk config/identity routes, explicit end/activity and revocation. Protect public kiosk URLs from broad staff/portal APIs; allow native portal proof issuance only on the user's own link.
- [x] Implement booking with real schedule/reservation owner and duplicate protection; same-day check-in with arrival-window policy; walk-in/cashier admission and unique labels; preserve same visit across department transfers and reuse consultation tickets without new encounters.
- [x] Implement staff department setup/versioned actions, identity code issuance, intake duplicate review/acceptance, and attributed history. Expose only necessary demographics to staff with operational permissions.
- [x] Build focused touchscreen kiosk journey modules and memory-only inactivity/reset behavior; portal proof control and clinic Station services/queue screen. Preserve current branding and clinician editor behavior.
- [x] Run accumulated targeted checks once against isolated synthetic data, inspect desktop/tablet/phone together, record actual failures, repair activation blockers only with focused confirmation.
- [ ] Refresh relevant Graphify corpora; record sanitized Jev calls and limits; checkpoint original fresh, apply additive migrations and check all original rows/objects, start local services, document current activation/rollback and unfinished Phase 3.

## Review focus

Unauthenticated demographics cannot enumerate records. A stolen/expired/reused proof fails closed and cannot cross branch/device/session. Device and patient source revocation is immediate. Stale/late responses cannot reintroduce patient information after reset. Repeated confirmations/session retries preserve one reservation/visit/stage. Staff provider restrictions apply to consultation stages; other departments never require fake providers. Existing appointments/tickets are not silently relinked across patient or branch. Registration matching remains an explicit staff decision. Payment actions cannot fabricate settlement. Activation never overwrites original data with a clone.
