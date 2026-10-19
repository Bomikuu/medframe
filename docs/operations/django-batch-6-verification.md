# Django Batch 6 — anatomy implementation and local activation

October 19, 2026, Asia/Manila. Branch `codex/django-anatomy-batch-6`. Native implementation only; no subagents, separate chats, push, public deployment or live SMS. The design and written plan were approved by the user's “approve” and “proceed implementation”. Standing authorization includes necessary activation-blocker repair and automatic local activation.

**Current state: Batch 6 is active locally**, using `.next-batch6` and original `medframe_django`. Core clinical workflow is available; B6-004/005/006 refinements and acceptance gaps remain deferred.

## Implemented scope

- Real Z-Anatomy outer-body regions and principal skeletal meshes, independently loaded layers, stable version/mesh/side/bounds registry. Canonical patient-left is +X, superior +Y, anterior +Z. Explicit mesh picking and local-coordinate pins, selection/annotation, camera views, manual zoom/pan, isolate, layout expansion and a keyboard/named-structure/illustrative-map alternative.
- Same RHF consultation form and Django draft/version authority as SOAP, dental findings, procedures and documents. General medicine opens Anatomy; dentistry retains Dental. Old records read with empty anatomy; old clients omitting the field preserve newer anatomical facts. Combined draft bound remains 49,152 bytes, maximum 60 anatomical findings.
- Clinician-entered description, certainty, severity, status, notes and optional terminology. Atomic finding-identity reservation, patient/organization validation, exact carry source checks, immutable normalized finding rows and chart entries. Anatomy-only finalization works. Amendments retain keys or explicit correction status.
- Authorized patient Anatomy tab with current/paged exact snapshots, source metadata and exact two-snapshot comparison. Missing evidence does not imply recovery. No patient-global anatomical data endpoint was added.
- Patient releases require a separate exact anatomical chart, explicit finding keys and notes opt-in. Payloads freeze selected anatomy rather than sharing live charts. Existing 64-KiB payload bound, digest, portal-link authorization and withdrawal remain owners.

B6-004/005/006 in the error log describe unfinished refinements and coverage limits. In particular, expanded mobile/tall-inspector layout, automatic isolate framing, visible map marker overlays, navigator semantics and replacing an already-carried stale draft key remain incomplete. No patient-specific geometry, clinical validation, calibration/measurement, automatic diagnosis, organ systems, pediatric atlas or all-206-bones claim is made.

## Preservation and geometry

Baseline `4b7b017`, tag `checkpoint/pre-batch6-2026-10-19`; design `b79b581`, plan `5a5e52b`. Batch 5 and `.next-batch5` remained active while implementation used clone `medframe_django_batch6_20261019`.

Before product changes, `scripts/checkpoint-django.py --clone medframe_django_batch6_20261019` encrypted an original snapshot and verified the restore against all **98 tables**, `source_written=false`. Private checkpoint: `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-141820-5a5e52b` (the historical helper uses a pre-batch2 prefix). Secrets/dumps/fingerprints are outside Git. Clone-only synthetic membership/access/specialty fixture changes were not imported to original.

Source FBX data came from the PC distribution at pinned commit `6c7f9016bd5899ac8edafd31b9900c151df42ed6`. Exact source URLs/checksums, source mesh names, output transforms/bounds/hashes and notices are in `assets/anatomy/`. Downloaded geometry was parsed as data; no source atlas code/add-on was executed. Offline converter: installed Three FBXLoader/GLTFExporter and vertex indexing; no morphology decimation or new runtime service.

| Layer              | Named meshes | Triangles | GLB bytes |
| ------------------ | -----------: | --------: | --------: |
| Body regions       |          246 |   114,262 | 2,763,440 |
| Skeleton selection |          179 |   493,255 | 9,078,340 |

Both are below 25 MiB/500,000 triangles per layer. Original skeleton output exceeded the byte budget; indexing duplicate vertices reduced output while retaining triangle geometry. Helper/attachment/label meshes and unrelated systems were excluded. Attribution preserves Z-Anatomy, Gauthier Kervyn, Lluís Vinent and BodyParts3D/DBCLS/Kousaku Okubo notices. The original project identifies BodyParts3D CC BY-SA 2.1 Japan; the PC distribution/derived GLBs carry CC BY-SA 4.0. Notices are provenance evidence, not a legal clearance opinion. Public model URLs include attribution/license copies. See `assets/anatomy/ATTRIBUTION.md`.

## Bounded verification — actual results

Raw evidence is ignored under `.impeccable/review/batch6/`.

| Check                                | Result                                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Offline asset verifier               | Pass: hashes/byte counts/triangles/node IDs/bounds/canonical sides and frontend/server registry equality        |
| Clone migrations                     | Two additive anatomy migrations applied; drift reports no changes                                               |
| Schema/client export                 | Pass                                                                                                            |
| Production build / TypeScript        | Initial default-type failure; canonical resolver repair passes. Viewer repair build also passes                 |
| Python formatting / scoped Ruff      | Applied; final source check passes                                                                              |
| Frontend formatting / scoped ESLint  | Prettier applied; zero lint errors, one navigator role warning. Viewer confirmation lint passes                 |
| Accumulated domain run               | **26 tests, 24 passed, two fixture errors**, 15.473s                                                            |
| Focused fixture confirmations        | First two cases: one pass, one missing UUID import; final affected case passes (0.930s). No broad backend rerun |
| Compatibility safeguard confirmation | Two affected aggregate/amendment cases pass (1.189s)                                                            |
| Browser                              | See precise staged evidence below; not one flawless run                                                         |

The domain command includes `tests_django.test_anatomy_reference`, `test_anatomy_policy`, `test_anatomy_encounters`, `test_anatomy_history`, `test_anatomy_releases`, `test_boundaries`, `test_dental_annotations`, `test_dental_history`, `test_templates`, `test_portal_releases` (each with the package prefix). Test DB `medframe_django_batch6_test`, clone backend, Redis4/broker5, SMS false. Across the accumulated run and affected confirmations, all 26 distinct cases have passing evidence; no clean repeated full-suite result or concurrency/full clinical regression claim is made.

Browser used real MFA and synthetic accounts on review web3001/API8001. Initial attempts were blocked by review origin config and a dentistry fixture, then a real 3D scene/DOM/picking blocker. Focused reproduction captured stack/DOM/model evidence. The corrected renderer keeps a stable scene clone, uses an external loading status, and excludes hidden meshes from raycasts. Pin creation/save, exact model coordinates and patient-left semantics were verified; back-camera desktop/mobile captures were saved with zero page errors. Returning through the incumbent dental full-screen dialog blocked the next harness locator; remaining checks resumed from the saved consultation rather than repeating successful geometry steps.

Remaining-step confirmation passes saved-pin reload, anatomy-only finalization, exact amendment/comparison, patient chart rendering, explicit note-included release, patient reading and withdrawal. Forced GLB failure switched to the usable map, but the expected notification locator did not match (context-loss switches directly to the map); a subsequent unscoped map locator matched a second hidden history map. These are retained harness findings, not proof of a broken fallback. The final narrowed attempt timed out at post-MFA navigation, before editing/save. Further attempts stopped. Fallback rendering is observed; keyboard editing/save and retention under forced model/context loss remain an acceptance gap (B6-006).

Six desktop/mobile captures already cover expanded editor, patient chart/history and patient release at 1440/390. Geometry reports no document horizontal overflow. Expanded layout has overlap/blank-space issues, so this is not complete responsive acceptance. The blocked-fetch browser deliberately produces a model-load error; distinguish that expected fault from ordinary runtime errors. No exhaustive a11y, clinical geometry correctness or performance claim is made. Impeccable context launcher remained unavailable by permissions; direct PRODUCT/DESIGN/craft guidance was used without chmod. Surface contract: `.impeccable/surfaces/anatomy.md`.

## Graphify and Jev

Graphify queried existing graph context first, then refreshed separate code-only corpora. Initial implementation refresh: backend253 Python files → **1,458 nodes / 5,876 edges / 61 communities**; frontend224 TS/TSX files → **1,101 nodes / 5,312 edges / 37 communities**. The final source refresh retains the same file/node/edge/community counts; reports/manifests/confidence/cohesion/cost are retained separately from Batch 5. Deterministic AST extraction uses zero external extraction tokens. Ten backend and one frontend files yielded no modeled symbols. Tests/generated clients/non-code docs/assets/build output are excluded; asset mapping is separately verified by manifest/hash tooling, not falsely claimed as semantic graph coverage. Query trace covers validate_anatomy_draft/capture_anatomy_revision/build_anatomy_release. Graphs help navigation and do not prove SQL, authorization, licensing or anatomical correctness.

Jev0.7.0 / jev-1.13.0 received only sanitized architectural/check summaries:

| Stage            | Choice                  | Confidence | Input/output tokens |
| ---------------- | ----------------------- | ---------: | ------------------: |
| Design           | semantic_stability      |       0.74 |            588 / 51 |
| Plan             | asset_registry_contract |       0.95 |            594 / 44 |
| Implementation   | anatomy_identity        |       1.00 |            449 / 45 |
| Browser priority | model_anchor            |       0.74 |            454 / 45 |

These are narrow prioritization judgments, not verification or authorization. No patient information, credentials or private attachments were sent. Final cutover Jev selected `data_preservation`, confidence **1.00**, **473 input / 49 output tokens**. It prioritized the already-authorized checkpoint/writer-pause/fingerprint sequence; it did not authorize or verify that sequence.

## Activation record

Source implementation commit: **`6e66c2d`**. Fresh preactivation encrypted checkpoint/verified restore: `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-144809-6e66c2d`, clone `medframe_django_batch6_cutover_20261019`, **98 tables verified**, `source_written=false`.

Old web/API/worker/beat and review processes were stopped. After all original writers exited, `verify-additive-preservation.py capture` fingerprinted **4,682 pre-existing rows across 98 tables** into a private file beside the encrypted backup. Original anatomy `0001_initial` and `0002_integrity` applied successfully. The matching `check` passed before traffic resumed; only permitted migration/content-type/permission metadata additions are exempt from no-addition comparisons, and no original row fingerprints were missing. Existing accounts/passwords/MFA, clinical revisions and old build are preserved. Original anatomy finding count was zero after cutover: synthetic review records were not imported.

Local processes (transient IDs at activation):

| Service |    PID | Exec session | Runtime                                             |
| ------- | -----: | -----------: | --------------------------------------------------- |
| API     | 252111 |        53851 | Uvicorn `config.asgi:application`, `127.0.0.1:8000` |
| Web     | 252120 |        67305 | `.next-batch6`, `http://localhost:3000`             |
| Worker  | 252112 |        37575 | Celery concurrency2, original database/broker       |
| Beat    | 252114 |        58834 | `/tmp/medframe-batch6-celerybeat`                   |

Logs: `/tmp/medframe-batch6-{api,web,worker,beat}-runtime.log`. Review3001/8001 are stopped. Read-only activation checks pass: API ready200, login200, both exact GLB downloads200 with expected byte counts, unauthenticated GraphQL denied403, worker ping`pong`. Runtime settings confirm original `medframe_django`, both migrations applied and `SMS_LIVE_ENABLED=false`. No authenticated clinical mutation was performed against original during activation; no original credential/provider/role/MFA reset occurred. Raw HTTP/settings/preservation/ping evidence is saved in the ignored Batch6 folder.

Open a consultation → **Anatomy** → **Expand editor**; general-medicine providers get the Anatomy tab by default. Patient record → Anatomy provides finalized history; Shared records → Prepare a clinical release provides separate exact chart/finding/note selections.

Rollback preserves original data and later writes. Keep `.next-batch5`, `4b7b017` and `checkpoint/pre-batch6-2026-10-19`. Do not restore a review clone over original, reverse schema by switching UI artifacts, or run the old API against new anatomical drafts without a preservation-aware rollback review. The legacy-client omission safeguard exists in the new API; an older UI cannot edit the new anatomical fields. Public deployment/push remains unauthorized.
