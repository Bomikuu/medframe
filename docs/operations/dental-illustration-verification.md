# Dental illustration and shared assistant — local activation

Native implementation on `codex/dental-illustration-assistant`: initial `0fac8ca`, activation repair `22963da`. Baseline `011306c`, tag `checkpoint/pre-dental-illustration-2026-10-19`; `.next-station-gallery` remains available. Final active artifact `.next-dental-illustration`, BUILD_ID `gIV8VEzgBfgQtkYPnbpOp`.

## Delivered

Dental inspector has explicit current-state controls for missing/extracted, crown present, braces bracket present, and mesial/distal/horizontal impaction presets limited to permanent wisdom teeth 18/28/38/48. Presets use exact condition labels in the existing versioned findings rather than interpreting partial prose or proposed procedures. Missing teeth are hidden; crowns overlay the reference crown region; a schematic bracket/short wire segment is positioned on each recorded tooth. These accessories are illustrative, not fabricated patient scans or precision restoration/orthodontic planning. Primary 3D anatomy remains honestly unavailable.

Impaction rotates a per-view tooth clone about its original center (45-degree mesial/distal, 90-degree horizontal), restoring its original transform before every update to prevent accumulation. Shared GLTF geometry remains unchanged. Tooth-local annotation anchors move with the transformed tooth. Educational reference mode suppresses rotations/accessories and restores missing anatomy without changing findings.

The selected tooth now has cyan fill, dark silhouette outline, prominent label and a visible tooth/surface status. Surface segmentation does not exist in the source model: the clinician's selected surface appears in the label and chooses approximate viewing direction, rather than inventing a precise clinical surface mask. Existing manually assigned point notes remain authoritative.

`features/assistant/clinical-assistant-preview.tsx` is the single assistant presentation shared by anatomy and dental. Editor-supplied context contains domain, focused title/detail and finding count. Focus changes update the panel and suggestions; unique composer IDs support multiple mounted consumers. Desktop uses a right panel and tablet/phone the existing labelled sheet contract. The composer is local-only with disabled send/attachments: no AI provider, API integration, persistent chat history, clinical upload or generated advice. Current patient changes remount its local text. Existing anatomy presentation and dental Station identity/end-session controls are retained.

State changes stay in the same React Hook Form consultation aggregate and save through existing Django authorization/version checks. Clearing an earlier recorded state copies its finding identity into this visit as resolved. Prior finalized revisions remain untouched. A final activation repair copies only supported finding fields, stripping read-only chart `encounter_id` metadata. No backend implementation, migration, account, password, MFA, role or infrastructure change.

## Bounded verification and limitations

- First production build compiled JavaScript but failed TypeScript on a Three.js attribute union. The activation-authorized bounding-box repair passes production build/TypeScript. The final carry-forward repair has another successful production build; no broad backend suite was run for this frontend-only phase.
- Focused geometry script checks exact active-state semantics, excludes partial/proposed labels and resolved/historical states, keeps impaction on third molars, preserves finding identity, and verifies all twelve preset rotations against the real model. It verifies stable pivot, no drift, reset, tooth-local point round-trip and accessory geometry/reference mode. An initial assertion mistakenly compared changing AABB centers; the corrected same-pivot confirmation passes. The later metadata-stripping assertion also passes. These are staged results, not one clean initial run.
- Scoped ESLint has zero errors and the pre-existing anatomy `Bot` unused-import warning. Supported files pass Prettier; the review fixture passes Ruff. One initial formatter glob included nonexistent `.tsx` variants of `.ts` files; supported files were formatted and the final scoped check passes. No unrelated warning repair.
- The initial single batched browser pass asserts four groups and ten captures: third-molar control/current-state UI; actual Django save/reload for rotation/crown/bracket, missing toggle and resolution; focused surface/tooth assistant context, disabled sending/no AI requests; desktop 1660/1280, tablet 1024 and phone 390 without document overflow; shared anatomy preview. It records zero browser exceptions. Desktop model/impaction/overlay and phone drawer captures were inspected natively.
- A final source review identified chart metadata leaking into copy-forward. The field-copy repair passes production build and focused data/geometry checks. A separate cross-visit browser confirmation displays the prior crown but stops because its button is disabled; it did not establish the reason or complete saving. **DENTAL-ILLUSTRATION-004 remains a cross-visit acceptance gap.** Do not claim a passing cross-visit browser journey. Fixture setup also correctly received an ownership rejection when attempting to finalize a browser-leased synthetic visit; no authorization bypass was added. A separate synthetic prior visit was created with normal service calls.
- Actual browser pin placement/persistence after rotation, exact GPU context-loss behavior, read-only history interactions and clinical/anatomical accuracy were not newly verified. Earlier unrelated editor/Station/GPU findings remain deferred. No further browser/polish or broad repair loop.

Raw ignored evidence is `.impeccable/review/dental-illustration/`: staged build/geometry/lint/format logs, browser JSON/captures and separate carry-forward failure. Reproduction/impact is retained in `docs/operations/error-log.md`, DENTAL-ILLUSTRATION-001 through 004. Private synthetic sessions/IDs remain outside Git in `/home/micxsz/.local/share/medframe/ui-review/dental-illustration.json`. No fixture records were imported into original.

## Preservation and runtime

Initial encrypted checkpoint/verified isolated restore: `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-201327-011306c`, review DB `medframe_django_dental_illustration_review_20261019` (127 tables). No review worker was started. First activation checkpoint `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-202128-0fac8ca` restored `medframe_django_dental_illustration_activation_20261019` and preserved all 5,499 original rows. Original services briefly resumed, then were stopped for the final frontend repair.

Final fresh encrypted checkpoint/verified restore: `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-202446-22963da`, DB `medframe_django_dental_illustration_final_activation_20261019`. **All 5,505 original rows across 127 tables matched fingerprints before final services resumed.** No migrations or imports. Private fingerprints: `/home/micxsz/.local/share/medframe/checkpoints/dental-illustration-final-original-fingerprints-20261019.json`. The earlier count reflects the earlier freeze; intervening legitimate session/audit/worker writes were retained.

Encrypted object checkpoint `/home/micxsz/.local/share/medframe/checkpoints/dental-illustration-storage-activation-20261019` verifies all 51 original objects into separate bucket `medframe-review-dental-illustration-activation-20261019`, with no original writes. Source dental assets/attribution are unchanged. Backups, configuration and secrets remain outside Git.

| Service       | PID    | Tool session | Runtime                                           |
| ------------- | ------ | ------------ | ------------------------------------------------- |
| Web           | 896056 | 55359        | 3000, `.next-dental-illustration`                 |
| Django API    | 896047 | 83594        | 8000, original `medframe_django`                  |
| Celery worker | 896046 | 70389        | original broker, concurrency 2                    |
| Celery beat   | 896049 | 55717        | `/tmp/medframe-dental-illustration-original-beat` |

Logs `/tmp/medframe-dental-illustration-{web,api,worker,beat}-runtime.log`. Local login HTTP 200; API CSRF is checked through the web proxy with its required origin. A raw origin-less direct CSRF request returns 403 as enforced by the existing boundary, not a failed app start. Review services 3001/8001 are stopped after evidence. Local SMTP stays 127.0.0.1:51025 and SMS live delivery is disabled. No external messages, AI transfer or public deployment.

UI rollback can serve `.next-station-gallery` against the same unchanged backend/schema. A source/UI rollback never means restoring a review DB over original or discarding newer legitimate writes.

## Actual Graphify / Jev / Impeccable use

Existing `frontend-station-gallery` graph was queried first for DentalEditor/AnatomicalScene/toothPresentation/AnatomyAssistant; bounded BFS reached 349 nodes and showed 32 under 1,000 tokens, requiring direct source verification. Refreshed AST corpora `graphify-out/backend-dental-illustration` and `frontend-dental-illustration` cover config/api_graphql/medframe_apps including migrations (298 files, 1,745 nodes, 7,312 edges, 100 communities) and app/features/components/lib excluding generated.ts (299 files, 1,548 nodes, 7,026 edges, 44 communities). Tests/scripts/assets/private/runtime data are excluded. Final focused query reaches 188 nodes, shows 24 under 800 tokens. Raw cohesion/manifests/reports/cost and extraction diagnostics stay local; extraction used zero external tokens.

Limitations: backend 759 dangling endpoint edges, 21 self-loops, 335 directed collapsed pairs; frontend 283, two and 75. Ten backend initializer/config files and the frontend icon barrel yield no symbols; station-entry.tsx is partially extracted. Graph traversal is not exhaustive source proof and neither it nor Jev replaces tests or authorization.

Jev 0.7.0/model jev-1.13.0 received sanitized architecture/evidence only: initial `recorded` choice, confidence 1.0, 432 input/36 output tokens; clarified impacted-preset design `preset`, confidence 1.0, 425/31; activation boundary `preserve`, confidence 1.0, 453/33. Activation judgment precedes final carry-forward inspection/repair and final preservation: those later facts are established by actual tools, not the judgment. No patient data, credentials, codes, portraits, private attachments or session tokens were sent.

Impeccable incumbent product/design/anatomy surface and craft-floor guidance informed the existing-world refinement. Its earlier failed context launcher was not repeated; context was read directly. Native implementation/review respected the no-subagent instruction. No new brand direction or AI integration.
