# Devices & Stations reference-guided gallery — October 19, 2026

Native source branch `codex/devices-gallery-ui`. Preserved baseline `1cb16c5` / `checkpoint/pre-devices-gallery-ui-2026-10-19` and `.next-session-recovery`. The user supplied a gallery reference and explicitly requested small icons instead of device images. Existing Impeccable context-launcher failure was already recorded this session; incumbent PRODUCT/DESIGN/Station surface and Operate/craft-floor guidance were read directly without rerunning it.

## Delivered

The device table becomes a responsive icon-led gallery. Existing page heading/actions remain, followed by create/pair/approve guidance with expandable inline instructions, native shadcn category tabs with real counts, search, three sorts, refresh and separate device actions. Cards show actual approval/setup/revocation state, mode, branch, enabled function tags, last contact in clinic timezone and standard/strict kiosk mode. Pending devices prioritize Review; setup devices prioritize Pairing code. Existing Manage and Pairing code dialogs, private-code copying and backend version/permission checks remain their original owners.

No device photos, raster placeholders, IP addresses, QR actions or invented online status. “Approved” describes the actual device state; last contact is a recorded timestamp, not an inferred heartbeat. Queue-display content remains explicitly marked as a later phase. Newest follows the verified native endpoint's -created_at ordering; name/contact sorts use real fields. Search/counts apply to the loaded branch/permission-scoped list, capped at 200 with a visible limit note. Loading, error/retry, first device and no-match states are implemented. No backend/schema/auth/data modification.

## Bounded verification

Initial and final production build/TypeScript and scoped ESLint pass. Final artifact `.next-devices-gallery`, BUILD_ID `b3qNEEakTbyJeKlnLPQ3W`. Prettier applied to touched supported files. No backend test rerun for this UI-only change.

One initial Playwright CLI inspection uses four synthetic devices spanning active/setup/pending/revoked in the isolated review database. Desktop 1440, tablet 1024 and phone 390 captures have no horizontal overflow; icon-only cards, guide expansion, category filters/counts, search/no-match recovery and name/contact sorts execute before the immediate newest-order read stops. A read-only follow-up shows the correct committed newest order; the first diagnostic was narrowed after matching two existing main elements. Initial evidence remains in DEVICES-GALLERY-001.

One refinement batch gives phone search a full row and removes the new status sentence's incorrect positional word “below.” One focused confirmation passes three groups: all three sorts after waiting for committed DOM order; separate functional Manage/Pairing code modals with no automatic generation; desktop and phone bounds with phone search width 343px. No page exceptions in that confirmation. It captures desktop/phone and pairing dialog; no third polish round. Screenshots/raw logs live under ignored `output/playwright/devices-gallery/`. All mutations/approval/code issuance stay with the existing tested modal flows; no new full pairing round or clinical acceptance claim. Empty-load/network-failure/200-device limit/keyboard/dark-mode paths were not independently browser-verified here.

## Graphify and Jev

Queried existing frontend session-recovery graph for DeviceManagement/DeviceDialog/DevicePairingDialog, then verified source including native newest ordering and actual data fields. Refreshed AST frontend corpus app/features/components/lib excluding generated.ts: 317 files, 1,637 nodes, 7,475 edges, 51 communities, zero external extraction tokens. Tests/scripts/assets/private/runtime excluded. Raw health: 283 dangling endpoint edges, four self-loops, 90 directed collapsed edges. Station-entry TSX remains partial and icon barrel yields no symbols. Follow-up DeviceCard/DeviceSetupGuide/DeviceManagement query reaches 210 nodes, displays ten under a 320-token budget; source review remains required. No backend graph refresh was necessary for untouched backend code.

Jev 1.13.0 received sanitized architecture/reference adaptation choices only. Selected truthful icon-led gallery over fabricated online/IP/QR content, confidence 1.0, 432 input/33 output tokens. Used to support scope and factual labels, not as verification or authorization. No image, private attachment, patient data, credential or pairing code was sent.

## Local activation

Active locally on October 20 after completing the interrupted activation through the new root launcher. Encrypted checkpoint `pre-batch2-20261019-224609-a160309` verified a new isolated restore `medframe_django_devices_gallery_activation_20261019`; the follow-up fingerprint check confirms all 6,030 original rows across 139 tables preserved. The fresh storage checkpoint `devices-gallery-storage-20261019` verified all 51 objects in the isolated review bucket. No schema migrations or review-fixture imports.

Runtime is `.next-devices-gallery` on port 3000 with original `medframe_django`, Django API 8000, worker and scheduler, now managed by `./medframe`. Frontend login and backend readiness both return HTTP 200. Existing identity/clinical permissions, prior artifacts and all original data remain preserved. No public deployment, external message or money movement. See [launcher evidence](local-launcher-verification.md) for native commands and bounded runtime checks.
