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

Pending checkpoint/preservation and runtime restart after the interruption. No database migration, account, password, MFA, clinical record, financial or external-message change is required.
