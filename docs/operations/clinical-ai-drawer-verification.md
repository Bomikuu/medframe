# Floating clinical AI drawer and dental clarity — local activation

Active on `codex/clinical-ai-drawer`, implementation `7e331dc`, build `.next-clinical-ai-drawer` / BUILD_ID `WQ7upqQvldBDX-wpFXvrP`. Preserved baseline `33719fe`, tag `checkpoint/pre-clinical-ai-drawer-2026-10-19`, prior `.next-dental-illustration` intact.

## Requested changes

One reusable `ClinicalAssistantDrawer` wraps the existing local-only assistant preview in an official shadcn Sheet. Both anatomy and dental open it on request as a fixed, full-viewport-height right drawer. Neither parent reserves an AI column; the drawer is a nonmodal overlay and outside interaction does not dismiss it. Close and Escape remain available. Its own side-width classes override shared Sheet defaults; no shared Sheet implementation/global theme was changed. Focused editor context still supplies the same shared preview, with disabled send/attachments and no AI provider, remote upload or generated clinical advice.

Crowns now retain a distinct gold material while selected, with a dark boundary band and slightly expanded shell to avoid competing with the underlying tooth surface. Local clipping is explicitly enabled on renderer creation. The gold overlay status is suppressed when missing or educational reference mode takes precedence. It remains a schematic indication, not a claim that the patient's restoration is gold or measured anatomy.

Missing teeth now remain as red reference placeholders, including while selected. The original material texture is temporarily removed for the red appearance and restored when the state clears; selected outline/label remains visible. Explicit text explains that the reference position does not represent a present tooth. Crown/bracket accessories are suppressed for missing teeth. Jaw/isolation controls still intentionally filter teeth. Educational reference mode restores normal reference appearance without changing clinical findings.

Existing findings, draft/versioning, permissions, exact history and storage remain unchanged. No backend implementation/schema/migration/account/password/MFA/role changes. Previous deferred cross-visit acceptance DENTAL-ILLUSTRATION-004 is not claimed repaired.

## Bounded verification

Both initial and final production builds/TypeScript pass. Scoped ESLint has zero errors and the existing anatomy unused `Bot` import warning. The geometry script passes explicit state semantics, all twelve real-mesh impaction rotations/reset/pivot/anchor checks and updated crown/bracket/reference accessory assertions, including the exact distinct gold material. These checks do not establish clinical accuracy.

One initial batched browser run passes two groups: desktop drawer fills viewport height while canvas x/y/width/height stays identical; selected gold crown and red missing placeholder render and save/reload through the real Django draft. Three captures were inspected natively. No browser exception or AI traffic. The run then fails a phone y-position assertion after a direct desktop-to-phone resize; cause is not established. This is retained as CLINICAL-AI-DRAWER-001.

One focused confirmation waits for viewport frames and drawer animations and checks canvas dimensions. Phone bounds are identical before/after (366×405.109375 at x12/y601.65625), and drawer is 390×844 at viewport height. It then switches to anatomy and fails `anatomy-confirmation parent width changed`; the cause and failed before/after anatomy values were not established. This remains CLINICAL-AI-DRAWER-002. No third browser, speculative viewport repair or broad test loop. Do not claim a fully passing anatomy no-resize browser assertion. The phone capture also retains an inherited scroll-gap/left-edge placement refinement. The anatomy source removes the layout-consuming column, but that fact does not replace browser acceptance.

Raw ignored evidence `.impeccable/review/clinical-ai-drawer/` retains both browser JSON/failure captures, build/lint/geometry/graph/Jev logs. Prior unrelated editor, Station, GPU and history findings remain deferred. The test uses synthetic native MFA-complete sessions in the isolated dental review DB, not original patients. No broad backend regression suite was repeated for this frontend-only change.

## Preservation and runtime

After stopping original services, fresh encrypted checkpoint/verified restore `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-203627-7e331dc` restored `medframe_django_clinical_ai_drawer_activation_20261019`, 127 tables. **All 5,603 original rows across 127 tables match preservation fingerprints before traffic resumes.** Fingerprints `/home/micxsz/.local/share/medframe/checkpoints/clinical-ai-drawer-original-fingerprints-20261019.json`. No migrations/imports. Accounts/passwords/MFA and earlier builds remain intact.

Encrypted storage checkpoint `/home/micxsz/.local/share/medframe/checkpoints/clinical-ai-drawer-storage-activation-20261019` verifies 51 original objects in the isolated `medframe-review-clinical-ai-drawer-activation-20261019` bucket; originals were not written. Configuration/backups/sessions stay private outside Git.

| Service    | PID    | Tool session | Runtime                                          |
| ---------- | ------ | ------------ | ------------------------------------------------ |
| Web        | 921759 | 15970        | port 3000, `.next-clinical-ai-drawer`            |
| Django API | 921750 | 76561        | port 8000, original `medframe_django`            |
| Worker     | 921751 | 93654        | original broker, concurrency 2                   |
| Beat       | 921753 | 92182        | `/tmp/medframe-clinical-ai-drawer-original-beat` |

Logs `/tmp/medframe-clinical-ai-drawer-{web,api,worker,beat}-runtime.log`. Local login and origin-bearing proxied CSRF both return HTTP 200. Review ports 3001/8001 are stopped. Local SMTP stays 127.0.0.1:51025, live SMS disabled. No public deployment, external messages or AI integration.

UI rollback can serve `.next-dental-illustration` against the same unchanged backend/schema. Never restore a review clone over original or discard newer writes to roll back UI.

## Actual Graphify, Jev and Impeccable use

Queried existing `frontend-dental-illustration` first for ClinicalAssistantPreview/EditorPanel/updatePresentation/updateIllustrationOverlays (180 reached, 25 shown under 800 tokens), then inspected source directly. Refreshed AST corpora `backend-clinical-ai-drawer` (298 files, 1,745 nodes, 7,312 edges, 100 communities) and `frontend-clinical-ai-drawer` (300 files, 1,550 nodes, 7,036 edges, 51 communities), then a final bounded query. Backend config/api_graphql/medframe_apps including migrations and frontend app/features/components/lib excluding generated.ts only; tests/scripts/assets/private/runtime data excluded. Zero external extraction tokens. Raw cohesion/manifest/cost/health reports remain local.

Graph limitations: backend 759 dangling endpoints/21 self-loops/335 collapsed directed pairs; frontend 283/two/75. Existing station-entry partial TSX extraction and symbol-free initializer/config/icon-barrel warnings remain. Graph output was truncated and is relationship guidance, not complete proof or authorization.

Jev model jev-1.13.0 receives sanitized architecture only: design choice `overlay`, confidence 1.0, 406 input/31 output tokens; activation choice `preserve`, confidence 1.0, 422/33. The latter precedes the final reported anatomy gap and actual preservation results; neither is verified by model judgment. No private attachments, patient records, secrets, session tokens or credentials submitted.

Impeccable existing-world/craft-floor guidance informed the scoped refinement. The earlier failed context launcher was not rerun; established PRODUCT/DESIGN/source context remained authoritative. No brand replacement, delegated agents, AI integration or unrelated polish loop.

## Station header stacking repair — latest active build

User explicitly reported the AI drawer being covered by the header. Source established the conflict: portalled shared drawer z90, Station identity strip z130. The narrow repair `9452d7a` sets only the drawer to z150, keeping end-session overlay/content at z160/170. No parent layout, global header or clinical behavior changed. Preserved source `4f2904c` / tag `checkpoint/pre-ai-drawer-layer-2026-10-19`, previous `.next-clinical-ai-drawer` retained.

**Current active artifact `.next-ai-drawer-layer`, BUILD_ID `F0vpJEJCP_ykIGSbUMAan`.** Production build/TypeScript, scoped ESLint and Prettier pass. One focused real Station browser run uses a native MFA-complete synthetic clinician to issue a one-use doctor code for an approved synthetic tablet. It opens the actual consultation/drawer, verifies computed layers 150 over 130, confirms the top close button wins `elementFromPoint` hit testing over the header, checks y0/full viewport height, then closes without losing the editor. Zero page errors. Screenshot inspected natively. Raw evidence `.impeccable/review/ai-drawer-layer/`. No broad regression or repeat responsive tests; older CLINICAL-AI-DRAWER-001/002 and other deferred findings remain untouched.

Graphify first queried existing frontend graph (222 nodes reached, 19 shown under 600-token cap), verified sources and refreshed the relevant frontend AST corpus `frontend-ai-drawer-layer`: 300 files, 1,550 nodes, 7,036 edges, 51 communities; zero external extraction tokens, same scope/limits above. Backend graph was not rebuilt for this literal-only UI fix. Jev sanitized choice `drawer` over global-header changes, confidence 1.0, model jev-1.13.0, 405 input/31 output tokens. No private identities/codes/credentials were submitted. Impeccable craft-floor/direct source and systematic root-cause inspection informed the targeted repair; no agents.

Fresh encrypted checkpoint/verified restore `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-204343-9452d7a`, isolated DB `medframe_django_ai_drawer_layer_activation_20261019`. **All 5,656 original rows across 127 tables matched fingerprints before services resumed**; no migrations/imports/backend or credential changes. Private fingerprints `/home/micxsz/.local/share/medframe/checkpoints/ai-drawer-layer-original-fingerprints-20261019.json`. Encrypted storage checkpoint `/home/micxsz/.local/share/medframe/checkpoints/ai-drawer-layer-storage-activation-20261019` verifies all 51 original objects into separate `medframe-review-ai-drawer-layer-activation-20261019`, originals not written. Synthetic review data stayed in the isolated prior dental review DB; review services are stopped.

Latest runtime: web PID937766/session63790, API PID937757/session15838, worker PID937760/session58208 (concurrency2), beat PID937758/session63636. Original `medframe_django`, ports3000/8000. Logs `/tmp/medframe-ai-drawer-layer-{web,api,worker,beat}-runtime.log`, beat schedule `/tmp/medframe-ai-drawer-layer-original-beat`. Local login/proxied CSRF HTTP200. Existing SMTP/SMS preview constraints unchanged. UI rollback can serve the previous `.next-clinical-ai-drawer` against the unchanged backend, without restoring a clone over original.
