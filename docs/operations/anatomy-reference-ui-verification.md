# Anatomy reference UI and assistant preview

October 19, 2026. Branch `codex/anatomy-reference-editor`. The user supplied the visual reference and explicitly requested a visible AI chat sidebar with integration deferred. This is a frontend extension of Batch 6, implemented natively without subagents.

## Scope and preservation

Baseline `fa1b614`, tag `checkpoint/pre-anatomy-reference-2026-10-19`; `.next-batch6` remains intact. No Django models, migrations, permissions, authentication, patient-release logic or persistence services changed. Review used the existing synthetic Batch 6 clone on8001/3001. No synthetic records were imported into original, and no original credentials/MFA were changed. The original API/worker/beat continued running during UI development.

The anatomy tab now opens a focused workspace with the reference's consultation header, grouped navigation, real model canvas, floating camera controls, four view thumbnails, selected-structure/findings inspector and a right Medframe AI panel. Back returns to consultation notes; fullscreen toggling and responsive drawers retain the same RHF owner and aggregate version. The header uses actual patient metadata/save status, not the reference's fictional patient or relative-save text. Existing completed-draft/finalization rules remain; no fake Finalize action was added to editable drafts.

Patient-side registry IDs and mesh-local annotations remain unchanged. Camera framing uses registry bounds for full-model/isolated views, with zoom and fit/reset. Mesh pin buttons open their associated finding. Navigator groups are display-only organizational aids, not new clinical facts or registry IDs.

Desktop secondary panels scroll independently. Tablet/phone use actual shadcn/Radix Sheets; clinical input is kept in the existing form. Measure/cross-section and unsupported organ/system modes are explicitly unavailable. The left view-mode controls switch between the actual surface/skeletal layer and the illustrative map.

The Medframe AI panel is an **unconnected preview**: welcome content, starter text, a local composer and working close/reopen controls. Send and attachment buttons are disabled. There is no AI SDK, provider key/configuration, chat endpoint, request, fabricated diagnostic reply, clinical-context upload or persistent chat store. Starter controls only fill the local composer. Its text does not dirty/save the clinical form, and closes clear the panel draft.

Eight transparent view thumbnails were rendered directly from the existing licensed body/skeleton GLBs using the installed Three.js renderer. No model geometry or source hashes changed. `scripts/render-anatomy-previews.mjs`, `assets/anatomy/previews.json`, the public previews and existing attribution record the derivative relationship. No AI image generation or external model download was needed.

## Bounded checks and actual results

Raw evidence: ignored `.impeccable/review/anatomy-reference/`.

| Check                         | Result                                                                                                                                                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preview generation            | Eight real model renders, about100KiB total                                                                                                                                                                             |
| Production build / TypeScript | Initial and corrected `.next-anatomy-reference` builds pass                                                                                                                                                             |
| Prettier                      | Supported changed files formatted; check passes                                                                                                                                                                         |
| Scoped ESLint                 | Initial camera-control immutability error; corrected to declarative OrbitControls bounds. Final: zero errors, one unused-import warning                                                                                 |
| Backend tests                 | Not repeated: backend source/contracts/persistence unchanged                                                                                                                                                            |
| First browser attempt         | Stopped before model verification: an effect in the Canvas fallback component incorrectly selected the 2D view even when WebGL was available                                                                            |
| Corrected browser             | Desktop layout/AI isolation and real annotation/save/camera/same-owner groups pass; tablet fields and AI panels captured. A closing-drawer timing race interrupted the combined tablet/phone harness before phone steps |
| Remaining-step confirmation   | Phone workspace/finding/AI drawers pass; intentionally blocked GLB loads retain the draft and permit saving an edited note through the 2D findings view                                                                 |

The Canvas fallback issue was traced from DOM/model state with zero page errors to a side effect in fallback children, which mount even inside a supported canvas. It is now pure fallback markup; actual errors/context-loss handlers select the map. Hidden meshes remain excluded from raycasts. The camera lint error was resolved by setting limits declaratively on OrbitControls rather than assigning hook-returned properties.

The tablet/phone automation race was in the harness: after closing the AI sheet, a viewport change briefly encountered its closing dialog and looked for the inspector's generic Close button. No product repair followed. The remaining run waited for actual dialog teardown, used the already-saved synthetic consultation and did not repeat successful desktop checks.

Nine captures cover1742×980 desktop,1024×768 tablet and390×844 phone. All geometry reports have no document horizontal overflow. Early full-page desktop/tablet captures can include the underlying page below the fixed viewport; the phone remainder uses viewport captures. The ordinary corrected editor has **zero page errors**. The model-failure run records one expected `Failed to fetch` from intentional GLB abort; it is not an ordinary runtime failure.

Specific assertions: AI starter/composer interactions cause zero network mutations; send remains disabled; close/reopen clears preview text; a synthetic right-femur mesh pin persists with exact mesh/side metadata; camera preset/zoom/fit leave its clinical identity intact; Back/reopen retains the same note; responsive fields retain their content; blocked model loads permit editing/saving the existing note without changing its model anchor. No finalization, full backend regression, exhaustive a11y or clinical-anatomy validation claim is made from these checks.

## Remaining limits

- One nonblocking unused Bot import warning remains; no lint rules were suppressed.
- On narrow screens, the toolbar scrolls horizontally and the current shadcn sheet base width leaves a narrow findings/AI panel. The finding form remains vertically scrollable; its controls and save path were exercised. Wider drawers/toolbar density are refinements rather than a new polish cycle.
- View thumbnails overlay the lower model area, so lower anatomy can be partially covered in the default whole-body frame; isolate/zoom/fit and the structure list remain available.
- The full PatientAnatomy history widget is reused inside the inspector; compact history/comparison layout has not received dedicated browser acceptance in this update. Existing unrelated backend/dental deferred findings remain unchanged.
- The older B6-004 expanded-layout/selection-semantics/isolate-framing issues are addressed by this explicitly authorized redesign and new captures. Visible 2D map-pin overlays remain deferred. B6-006's model-download-failure editing/save path now has passing phone evidence; direct GPU-context-loss acceptance remains unverified.

## Graphify, Jev and Impeccable

Existing frontend Graphify query traced AnatomyEditor/AnatomyViewport/FindingForm/EncounterEditor:328 reachable nodes,34 shown under the950-token budget; this was navigation, not exhaustive proof. Source was inspected directly. Refreshed frontend corpus:233 TS/TSX files in app/components/features/lib, **1,134 nodes,5,487 edges,40 communities**. Output `graphify-out/frontend-anatomy-reference/` retains manifests, numeric cohesion/confidence, report and cost. One icon barrel yielded no modeled symbols. Deterministic AST extraction uses zero external extraction tokens; generated contracts, tests/scripts, non-code documents, images/models and build outputs are excluded. Backend graph was not needlessly rebuilt because backend source is unchanged.

Jev0.7.0 / jev-1.13.0 received sanitized architecture/results only, without the reference image, patient data or credentials:

| Stage  | Choice            | Confidence | Input/output tokens |
| ------ | ----------------- | ---------: | ------------------: |
| Design | truthful_preview  |       1.00 |             476 /48 |
| Review | interface_preview |       1.00 |             472 /43 |

These support prioritization; they do not prove functionality or authorize clinical actions. Impeccable's direct PRODUCT/DESIGN/reference/craft guidance and the supplied screenshot informed the Operate composition. Its earlier launcher permission failure was not retried or bypassed. The surface brief records this extension and its bounded verdict.

## Activation

Frontend source is ready for the local web cutover. Original API8000, worker and beat are unchanged. Local activation will replace only the web process with `.next-anatomy-reference`, preserve `.next-batch6`, and record read-only HTTP/asset readiness below. No database migration/restore, role reset or authenticated original-data mutation is part of this UI activation.
