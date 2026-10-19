# Tooth and anatomy centering — October 19, 2026

The user requested the anatomy selection behavior for teeth too, with selections focused at the center in both editors. This frontend-only update extends source `79b8f0c` on `codex/anatomy-reference-editor`; that committed source and `.next-anatomy-focus` remain the immediate rollback baseline. Native implementation only, without agents or backend/schema changes.

## Result

Tooth sidebar and accessible 2D selector actions now request camera focus separately from raw model clicks. The camera centers the selected mesh's world bounds, chooses an approximate outward direction from FDI position, and moves closer (65% of full-jaw fit distance, bounded by selected-tooth fit). Other teeth remain visible; isolation remains explicit. Re-selecting restores focus after manual navigation. Reset and whole-jaw/preset choices clear focus.

Surface selectors center the tooth and adjust viewing direction: outward buccal, inward lingual/palatal, mesial/distal tangent, and upper/lower occlusal/incisal. Occlusal focus shows the corresponding jaw. These directions are viewing aids: source geometry has no clinically reliable surface segmentation. No clinical surface is inferred from a click. Inner/contact surfaces can remain obscured until isolation or manual orbit. Missing meshes remain hidden under existing missing-tooth behavior. Primary anatomy remains unavailable, using the existing 2D selector.

Shared `lib/three/place-camera.ts` places both camera and orbit target at the selected center, flushing residual damping first so prior pan/orbit cannot displace focus. Anatomy keeps its approved orientation and contextual zoom. Clinical identities, geometry, pin coordinates, forms and authentication remain unchanged. The assistant remains an unconnected preview.

## Bounded verification

- Production build/TypeScript, scoped ESLint (zero errors/warnings), Prettier and Git whitespace checks passed. No backend regression suite was run for this camera-only change.
- `scripts/review-selection-focus.mjs` passed 32 FDI teeth × 8 surface directions × 2 aspect ratios (512 cases): expected directions, centered projection, bounding-box corners in frame and retained damping preference.
- Anatomy posterior-region orientation/rendering was captured before dental. Desktop assertions passed tooth 11 and all posterior quadrants (18/28/38/48), five surfaces on 18, re-selection, reset, isolation and both-jaw restore. The existing label anchored at the real mesh center measured exactly centered horizontally and about 0.24% below canvas center vertically in all 12 checks. Three dental captures have no document horizontal overflow. No page errors or GraphQL mutation requests were observed.
- The first browser run stopped on a harness locator: DialogTitle gives the dental dialog its patient name, so querying the dialog as “Dental editor” did not match despite a loaded model in the screenshot. One remaining-step continuation used the existing `data-dental-editor` attribute; successful numeric/anatomy work was not repeated.
- The continuation passed desktop, then stopped before phone selection on an incorrectly scoped nested 2D-summary locator. SELECT-FOCUS-002 is logged without another repair/retry. Phone centering and the final persisted before/after comparison were not accepted. Zero observed mutation requests does not substitute for the unreached persisted comparison. Existing dental/mobile deferred findings remain untouched.

Raw ignored evidence: `.impeccable/review/selection-focus/` (build/lint/format, browser and remaining JSON/logs, screenshots, graphs and Jev). No broad patient workflow, pin regression, exhaustive anatomical validation or phone acceptance claim is made.

## Actual Graphify / Jev / Impeccable use

The existing frontend graph was queried first for DentalEditor/Camera/tooth selection: 295 reachable nodes, 26 shown under 700 tokens. Source inspection traced the viewport hook, framing and callbacks. Refreshed `graphify-out/frontend-selection-focus/` covers 236 TS/TSX files in app/components/features/lib, 1,148 nodes, 5,534 edges and 50 communities. A follow-up focusTooth/placeCamera/AnatomicalScene/DentalEditor query reached 313 nodes, showing 24 under 650 tokens. Numeric cohesion, manifests, report and costs remain in graph output. AST extraction used zero external tokens; generated clients, tests/scripts, documents/assets/models and builds are excluded. One icon barrel yielded no symbols. Queries are navigation aids, not complete impact proof.

Jev CLI 0.7.0 / jev-1.13.0 received sanitized choices/results only. Planning chose `contextual`, confidence 1.0 (440 input/45 output tokens); review chose `activate`, confidence 1.0 (464 input/40 output). Judgments do not establish acceptance or authorization. No patient information, credentials or private attachments were sent. Impeccable's existing anatomy/product/design direction and craft floor guided the interaction; its previously failed launcher was not rerun.

## Local activation / rollback

Port 3000 serves `.next-selection-focus`, PID 410894, tool session 97636; log `/tmp/medframe-selection-focus-web-runtime.log`. Login and original API health returned HTTP 200. Original API 252111, worker 252112, beat 252114 and original database remain active. Review used existing synthetic clone `medframe_django_batch6_20261019` at ports 3001/8001; review servers were stopped afterward.

Rollback is web-only: stop the current web process and serve preserved `.next-anatomy-focus` against original API port 8000. Never restore the review clone over original data or change schema for this UI rollback. Earlier checkpoints/artifacts remain intact. No push or external deployment occurred.
