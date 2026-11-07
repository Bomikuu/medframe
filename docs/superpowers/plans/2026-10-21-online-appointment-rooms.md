# Online appointment rooms implementation plan

**Goal:** Native two-person online appointments with PIN guest access, camera/audio, realtime chat, scanned files and server-enforced closure.
**Spec:** docs/superpowers/specs/2026-10-21-online-appointment-rooms.md, approved by user “proceed”.
**Execution:** Native in this chat; no agents. Implement connected features before handing off. Current user preference overrides build/test steps: bounded visual review only.

- [x] Add room, guest/doctor sessions, message and attachment models in operations; preserve original appointment data; checkpoint before additive migration.
- [x] Add Django room authority/services and endpoints. Assigned default and explicit eligible-doctor mode both require native provider/patient grants. Versioned extension reserves provider/patient/resource through the native reservation owner; one doctor slot. Cancellation/reschedule invalidates rooms across all callers.
- [x] Add separate authorized room chat and media gateway. SDK only sees Django room proof, never a reusable media JWT; rewrite media refresh tokens. Per-connection live authority checks. A launcher-owned supervised media process kills its child on authority loss, deadline enforcement failure or parent exit.
- [x] Install official media SDK and verified release binary privately; no production bundle/Docker build. Keep local credentials out of Git and media identities opaque. Local-only media first; HTTPS/TURN/public reachability remains explicit infrastructure work.
- [x] Add focused room UI, pre-call controls, live call controls, chat/files, timer/end/extension states and appointment/portal entry. Upload via native byte validation, quarantine/scanner and room-specific private access.
- [x] Format, checkpoint/migrate/activate with root launcher, one bounded visual pass, log unverified two-party/security/expiry boundaries and tool evidence honestly.

Review focus: cached/reissued media proof after expiry; assigned/pooled clinician authorization; simultaneous claim/extend/cancel; scan completion after end; native logged-in browser coexisting with guest room access. No synthetic clinical records, credential changes, live messages, recording or AI.

Implementation is locally active. Verification limits remain open in docs/operations/online-appointment-rooms-verification.md (CALL-001/002/003); checked implementation steps do not imply authenticated/two-party acceptance.
