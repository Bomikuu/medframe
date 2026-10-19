# Device settings and pairing-code dialogs — October 19, 2026

Native implementation on `codex/device-code-modals`. Preserved source: `880788a` / `checkpoint/pre-device-code-modals-2026-10-19`; old artifact `.next-station-kiosk` remains available.

The device list now has separate Manage and Pairing code actions. Manage edits existing settings and handles physical approval/revocation. The code dialog contains explicit generation/regeneration with the existing access-ending confirmation and optimistic version check. Opening does not generate or invalidate anything. Close drops the displayed secret; previous secrets cannot be retrieved. Existing tenant/admin authorization and backend pairing behavior remain unchanged.

The shared TemporaryCode component adds raw-code clipboard copying, success after the actual write, honest blocked-clipboard feedback, expiry display/copy disable and state reset for a replacement code. Doctor and responsibility handoff code displays inherit this control. Their complete flows were not retested. No secrets are persisted to browser storage by this change.

## Bounded evidence

Production build/TypeScript pass in `.next-device-code-modals` (BUILD_ID `KsKCLGDk5EoQ72RF9Bbfw`). Scoped ESLint on the four touched components passes; Prettier and diff whitespace checks pass. No Python/backend/schema changes or backend test rerun.

Playwright CLI was used through its wrapper invoked with bash (the wrapper file itself lacks execute permission). Initial real synthetic-clinic Manage interaction confirms editable fields and no generation action; the next assertion incorrectly queried a hidden background table. One focused confirmation used native read-only device status instead, then generated ready/copied/phone captures. Reaching the phone capture establishes earlier sequential assertions: active access before explicit generation, code length, actual clipboard equality, blocked-copy message, regeneration to a different code and cleared error state. The user interrupted before the CLI returned a final result. Expiry/close-reopen assertions remain unverified; no clean end-to-end browser-pass claim. See DEVICE-CODE-001. Four ignored captures under `output/playwright/device-code-modals/`; phone modal stays within the tested viewport, with its content scrollable.

## Graphify and Jev

Queried the existing frontend Station graph first for DeviceDialog/DeviceManagement/TemporaryCode; verified source and backend manage action contracts directly. Refreshed AST-only frontend corpus `app`, `features`, `components`, `lib` (excluding generated.ts; no tests/scripts/private data/assets): `graphify-out/frontend-device-code-modals`, 310 files, 1,608 nodes, 7,327 edges, 45 communities, zero external extraction tokens. Follow-up query `DevicePairingDialog CopyableCode DeviceDialog` reaches 171 nodes, displays 16 under a 450-token budget. Raw extraction health has 283 dangling endpoint edges, 3 self-loops and 86 directed collapsed edges; station-entry TSX is partially extracted and icons barrel has no symbols. Graph is a limited impact map, not verified coverage.

Jev 1.13.0 received only sanitized architecture/request text. `choice` selected `separate` over automatic regeneration, confidence 1.0, 398 input/35 output tokens. Used to support separation and explicit generation, not as proof of correctness or authorization. No code, patient data, credentials or private attachments sent.

## Local activation

Active locally from implementation `fcc5193`, `.next-device-code-modals`, original `medframe_django`. No migration or credential/MFA/role change was made. Before restarting traffic, a fresh encrypted checkpoint at `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-212823-fcc5193` restored into new isolated `medframe_django_device_code_activation_20261019` and verified all 137 table counts. Capture/check fingerprints preserve every one of the 5,912 original rows across 137 tables. The encrypted storage checkpoint at `/home/micxsz/.local/share/medframe/checkpoints/device-code-storage-20261019` verified 51 original objects into new isolated bucket `medframe-review-device-code-20261019`; originals were not written. No review data was imported.

Runtime: web PID 1031856 (port 3000), API 1031847 (8000), worker 1031848 (concurrency 2), beat 1031849. Tool sessions 64546/2792/50350/76887 respectively. Logs `/tmp/medframe-device-code-{web,api,worker,beat}-runtime.log`; beat state `/tmp/medframe-device-code-original-beat`. Both local login and proxied CSRF return 200 after restart. Review services remain stopped. Local SMTP capture and SMS preview-only configuration retained.

Rollback: preserved prior source/tag and `.next-station-kiosk` are retained; use the old artifact with the same original database if needed. Do not restore a review clone over the original or reset schema. No external messages, online money movement or public deployment. Older unrelated deferred findings remain untouched.
