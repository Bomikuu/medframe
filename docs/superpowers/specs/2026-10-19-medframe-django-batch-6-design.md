# Medframe Batch 6 — general-practice anatomical workspace

Status: proposed written design for review. User requested the next batch with Graphify, Jev and Impeccable. Native execution only, no subagents. Standing authorization includes local activation and necessary activation-blocker repairs after bounded verification; no separate activation question is needed. No Batch 6 product code, database changes or asset downloads have occurred.

## Outcome

Implement the Django Edition roadmap’s Batch 6: general-practice anatomical visualization, body-region annotations and skeletal models. A clinician should select a body region or skeletal structure, record a finding or anchored note, save it within the consultation, reopen the same finalized evidence, amend it without overwriting history, compare visits and explicitly release selected anatomical information to the patient.

Clinical facts remain authoritative; a generic reference model never supplies a diagnosis, patient-specific anatomy or calibrated measurement. Patient-reported concern, clinical observation, suspected diagnosis and confirmed diagnosis remain distinct. Existing dental records, consultations, diagnostic referrals and patient access must keep working.

## Approach and alternatives

**Recommended: extend the existing encounter aggregate, with a focused anatomy domain and viewer.** Django validates the anatomical vocabulary/findings, while the existing consultation save/version/finalize/amendment pipeline owns writes. A new immutable anatomy chart snapshot records each finalized projection. React Three Fiber/Three.js reuse rendering infrastructure; shared shadcn/Radix and SafetyProvider own interactions. Anatomy has its own registry and assets, not dental tooth IDs or renamed tooth surfaces.

A separate anatomy note store would allow independent editing but would introduce competing save/finalization versions and orphaned clinical annotations. A freestanding embedded external atlas would supply visuals but would not integrate protected clinical annotations/history/releases. Neither is selected.

This is one integrated batch: model/region selection, findings/pins, persistence/history, patient release and local activation. Internal tasks are implementation order, not user handoffs. Optional organs, muscles, vessels, neurological mapping, pediatric anatomy, surgical planning, PACS/DICOM and AI interpretation are outside this batch.

## Reference geometry and provenance

No body/skeletal assets currently exist in Medframe; the existing GLBs are dental. Use real named-mesh reference geometry for the 3D body and skeleton, not generated bitmap teeth/body pictures or toy primitives presented as anatomical detail. Start by inspecting **two layers only: outer body surface and skeleton**. Do not import the full multi-system atlas or bundle third-party application code.

Candidate sources inspected October 19, 2026:

- [Z-Anatomy source project](https://github.com/Z-Anatomy/Models-of-human-anatomy): Blender geometry derived partly from BodyParts3D; its source attribution lists additional components with separate licenses.
- [Z-Anatomy PC model distribution](https://github.com/LluisV/Z-Anatomy/blob/PC-Version/README.md?plain=1): links to FBX and Blender model files and its CC BY-SA 4.0 statement.
- [SPI project page](https://www.spi-inc.org/projects/z-anatomy/): project background and source context.

Before shipping any mesh, record exact source file/commit/download URL, checksum, original author, applicable license, modifications and export transform in `assets/anatomy/ATTRIBUTION.md` plus a machine-readable asset manifest. Check the selected skin/bone subset rather than assuming a repository-wide label overrides component attribution. Exclude unrelated restricted components; retain required notices and applicable asset derivative terms. No license/commercial clearance is claimed solely from this design.

Convert selected geometry offline to versioned local GLBs, preserving named structure mapping and morphology. Inspect orientation, units, handedness, normals, mesh separation, visible bone labels and source metadata before binding clinical IDs. Keep source/export tooling outside runtime. The manifest records source-to-scene and mesh-local transforms, bounds and stable canonical IDs. Asset files and registry versions are immutable once used by a finalized record; retain historical versions needed to render old pins. A missing historical asset falls back to labels/2D and an explicit unavailable-pin message, never relocation onto the current model.

Proposed performance targets: lazy-load the active view only; target at most 25 MiB compressed per body/skeleton layer and at most 500,000 visible triangles per active layer after inspecting actual assets. Do not download extra anatomy systems to solve a missing mesh. If a full layer cannot meet usable interaction/memory requirements without destroying structure identity, split by region and lazy-load it. Report measured sizes and limitations instead of claiming validated anatomy or all 206 bones. A source/geometry blocker requires an honest blocked state; a working 2D fallback alone does not establish that the promised 3D skeleton is complete.

The source is a generic adult reference. Do not infer model morphology from the patient’s sex, age or identity, or imply that reference skin tone/body proportions represent the patient. No patient data is sent to asset hosts or model services.

## Server-owned anatomical reference

Create a versioned anatomical registry in the Django anatomy domain, exported as a deterministic frontend reference with the generated contracts. No package or cloud service is required for the vocabulary.

Body-region groups cover head/face, neck, chest, abdomen, pelvis, back, shoulder/upper arm, elbow/forearm, wrist/hand, hip/thigh, knee/lower leg and ankle/foot. Subregions, laterality and supported views come from explicit entries; the implementation registry is the exact contract, not translated display text. Skeletal entries cover the supported imported axial/limb structures with canonical stable identifiers, source-name mapping and patient-side metadata. A grouped spine/hand/foot entry must be labelled as a group; do not pretend it provides individually mapped structures that were not imported.

Use **patient-perspective left/right**, always visible as orientation markers. Rotation/front/back view never changes a selected structure’s side. Midline and bilateral are allowed only on entries explicitly supporting them. Distinguish anterior/posterior/lateral views from left/right laterality. A clicked mesh selects only its verified canonical structure; ambiguous/unmapped meshes cannot silently assign a nearby bone.

Versioned reference endpoint exposes only nonpatient metadata. Clinical queries retain current staff realm, active membership/provider/patient access and branch scope. A center operator, receptionist or administrative role gets no general-practice clinical access merely because anatomy is installed.

## Findings, notes and anchors

Add `anatomy_findings` to the existing Django/frontend consultation draft schema, defaulting to an empty list for old drafts/templates. Keep it inside the current 48-KiB combined draft bound; do not silently enlarge GraphQL/proxy body limits. Allow at most 60 anatomy findings per draft, unique UUID keys, with explicit validation errors before autosave.

Each entry contains:

- Stable finding key; reference-registry version; layer (`body` or `skeleton`); canonical structure ID; patient-perspective side where applicable.
- Short label/description up to 240 characters; category `reported`, `observed`, `suspected` or `confirmed`; severity `unknown`, `mild`, `moderate`, `severe`; status `active`, `resolved`, `historical` or `entered_in_error`.
- Notes up to 1,000 characters. Optional terminology system/code remain clinician-entered bounded strings; no coding-service integration or inferred diagnosis is added.
- Optional anchor: immutable asset version, stable mesh ID, local three-coordinate finite point, with server-known bounds and mapping. A 2D surface anchor uses its own versioned view and normalized coordinates in [0,1]. The two kinds are distinct; never cast screen pixels into model coordinates or reuse an anchor after a structure/layer change without explicit reselection.

Validate region/bone/side/layer/asset compatibility and finite/bounded coordinates on Django, not only Zod. Labels come from the registry; normalized finding indexes retain clinically useful fields, while exact JSON snapshots retain presentation anchors and model/reference versions. A pin location is a visual aid, not calibrated lesion dimensions or a precise anatomical landmark.

Selection mode chooses a structure; annotation mode adds a pin and opens a divided finding form. Dragging a camera does not create a note. Do not save empty pins implicitly. Selecting a pin highlights its existing finding; changing its note/status edits the same draft key. Removing an unsaved local entry is allowed, but correcting finalized evidence uses a new amendment/revision with an explicit status/reason. No mutation writes directly to a finalized snapshot.

General symptoms/observations stay separate from the encounter’s diagnosis list. An anatomical `confirmed` finding is an attributed clinician classification, not an automatic diagnosis insertion. No symptom-to-diagnosis promotion, color-derived medical conclusion or skeleton pathology simulation.

## Save, finalization and exact history

Use the same RHF form owner and `save_encounter_draft` optimistic version as SOAP, diagnoses, dental, procedures and document IDs. Switching between Anatomy/Dental/Notes or expanding the viewer must not remount/reset the draft aggregate. Reuse pending/conflict/offline feedback and memory-only draft protection; never show Saved while anatomy content failed validation/persistence.

Update finalization’s nonempty-record check to count anatomical findings, validate the complete draft and write immutable normalized anatomy findings plus an `AnatomyChartRevision` attached to the exact `EncounterRevision` in the existing transaction. Preserve request/patient/provider locks and document checks. Old drafts/templates/revisions missing anatomy fields read as empty **without rewriting existing finalized rows**.

Current patient anatomy is a labelled projection of latest finalized encounter revisions plus the current editable encounter where requested, keyed by stable finding ID and deterministically ordered by clinical source. Do not mix it with dental `chart` JSON or silently reconstruct exact historical views from today’s projection. Bound/paginate current/history results; retain source encounter/revision/authorship for every item. Updating an existing longitudinal finding explicitly carries forward that key with a visible source reference; Django rejects keys borrowed from another patient. The user must choose a prior finding to update rather than accidentally overwriting it by selecting the same region.

Exact visit history reads that saved snapshot and its reference/model version. Finalized amendment starts from the actual encounter revision and preserves previous content; withdrawing/editing a current finding does not erase the earlier visit. Two-visit comparison shows separate before/after dates, statuses and exact source revisions. A missing historical renderer never substitutes current geometry without disclosure.

## Clinic and patient integration

Add an Anatomy consultation tab and patient-record Anatomy view. General-practice providers start on Anatomy where provider specialty is available; dentistry retains the existing dental default. All clinicians with existing authorized clinical scope can use either appropriate tab; specialty is a presentation default, not an authorization shortcut. Read-only finalized view visibly names the exact visit/revision.

Expose protected anatomy reference/current/draft/exact/comparison queries using the existing GraphQL conventions and bounded serializers. Draft changes remain in the existing encounter save mutation. Regenerate contracts, JSON validators and frontend client usage together. Extend selected encounter templates carefully so old definitions/defaults cannot strip anatomy on save or add undocumented facts.

Patient anatomy is available only through **explicit released clinical versions**. Add a separate exact anatomy-chart selection to release preview/manifest/digest; selecting a SOAP section or a dental chart does not automatically release body findings. Apply the existing 64-KiB payload bound and live PortalLink/published-release/download checks. Each released annotation is frozen with its clinical label/status/side and exact source revision; future amendments/model upgrades cannot change what an old release means. Existing released payloads with no anatomy stay readable.

Patient release uses a simple read-only 2D map and textual findings by default. Optional 3D is a reference view with the same stable labels when feasible; staff-only notes are excluded unless explicitly selected for release. Decide the exact public finding fields in the release preview so the clinician can inspect what the patient will receive. Do not expose all current body findings through patient-global queries.

## Impeccable interface direction — Operate

Extend the established clinical desk and full anatomy-editor interaction rather than redesigning the app. Preserve DESIGN.md, shared shadcn/Radix controls, navy actions, teal selection, Manrope/Jakarta, clinical semantic colors and Tailwind tokens. Existing current-brand evidence: Batch 5 reviewed-result desktop and patient-release mobile screenshots; existing dental editor/source provides selection/pin/camera interaction patterns, not permission to duplicate its old layout defects.

The Impeccable launcher already failed permission checks in this session; continue through the documented direct-context fallback. PRODUCT.md, DESIGN.md and new-work/Operate guidance were read. No permission changes, new visual-world tournament, raster model generation or unrelated drift repairs are authorized by this extension. Read the craft floor immediately before actual UI edits; a planning-only task does not need to load it.

Desktop composition: consultation/patient/status/save header; left region/structure search and body/skeleton/laterality filters; central model-first viewport with Select/Annotate controls and front/back/left/right/reset/fit camera presets; right selected-structure findings/history/details. A clear expand control provides an editor-sized workspace while preserving the same form. Do not repeat the inherited 90dvh dialog height cap or hide save controls behind a second form owner.

3D is the default when supported, with body/skeleton as explicit layers. Bone selection can isolate the named structure and dim others. Pin markers remain identifiable against both layers; labels/status/filtering must not depend solely on color. Notes behave as anchored clinical entries with visible unsaved/saved state, not an unaudited social-chat thread. Do not imply collocated pins diagnose the structure below them.

At 390px the viewport remains useful above a labelled selection/finding panel; navigation and primary save/annotation actions stay accessible. Keyboard/list and 2D front/back maps support the entire selection/edit/read workflow when WebGL is unsupported, context is lost or assets fail. Canvas failure never destroys notes, traps focus, blocks save or forces infinite retry. Empty states teach region selection and say when no findings were recorded. Clear “Reference model” wording and source attribution remain findable without burying the clinical task in developer copy.

No decorative anatomy hero, fabricated metrics, public image uploads or cropped clinical attachments. No custom affordances for basic forms where the existing primitives work. Screenshot verification covers desktop and mobile in one batch, with only a bounded necessary activation confirmation afterward.

## Preservation, verification and automatic activation

Baseline: source `4b7b017`, tag `checkpoint/pre-batch6-2026-10-19`; branch `codex/django-anatomy-batch-6`. Batch 5 `.next-batch5` and original data/runtime remain preserved during design. No SQL or product runtime changed in this design step.

Before implementation/migration rehearsal, take a fresh encrypted original checkpoint/verified clone and isolate review API/web/broker/throttle/channel namespaces. Never overwrite original data from a clone. Keep actual patient records, credentials/MFA, source/config backups and fingerprints private. Synthetic clinical records only; SMS remains false and no external messaging, public deployment or push.

One accumulated verification pass after connected implementation:

1. Domain/schema checks for registry/side mismatch, invalid layer/asset/mesh/NaN/out-of-bounds anchors, duplicate/foreign finding keys, limits and old empty-default compatibility. Exact tests must pin front/back rotation with **patient-left remaining left**, and old model-version anchors not moving to the new version.
2. Existing encounter/dental save/finalization/amendment regressions plus anatomy-only finalization, optimistic conflicts, revoked membership/patient/portal access, immutable rows and unchanged exact historical/released snapshots. Generic model/reference endpoints disclose no patient data.
3. One production build including TypeScript, focused Ruff/ESLint, codegen and clone migration drift. Verify actual asset checksums/licenses/mapping/size and the supported body/skeletal coverage; a placeholder/render screenshot is not source-asset validation.
4. One paced synthetic browser journey with desktop 1440/390 together: select left/right region and bone; pin a note; save/reload; switch tabs; finalize; reopen exact revision; amend/compare; explicitly release and revoke; force WebGL/asset failure and use keyboard/2D fallback. Inspect screenshots once and record actual evidence/gaps rather than declaring complete clinical/a11y acceptance.
5. Refresh actual Graphify scopes and record sanitized Jev implementation/review judgment separately from test results. Neither tool establishes clinical correctness.

Then activate locally under the standing instruction. Necessary activation blockers are repaired and confirmed with focused checks; unrelated findings are logged without a broad repair/polish loop. Take a fresh encrypted pre-cutover checkpoint/verified restore, pause writers, fingerprint every original row, apply additive migrations and verify preservation before starting the new web/API/worker/beat. Preserve old artifacts and all subsequent writes; do not roll back by restoring a rehearsal database. Report the actual running routes/processes and remaining limitations. Asset/clinical integration blockers cannot be concealed by activating an empty tab.

## Actual design evidence and limits

Graphify reflected existing work memory and expanded only present vocabulary: `[encounter, revision, chart, finding, anchor, snapshot, release, preview, save, amend]`. A bounded structural trace located `save_encounter_draft()` → live encounter policy/version/validation; `finalize_encounter()` → draft validation/chart projection and domain writes; `EncounterEditor()` → one form/tab/save owner and DentalEditor; `build_preview()` → immutable explicit release construction. The guessed node start_amendment was absent; direct source inspection found `create_encounter_amendment()` instead. The graph has no new general-anatomy code or model corpus; no such coverage is claimed. Raw trace is ignored `.impeccable/review/batch6-design/graph-trace.txt`.

Jev 0.7.0 / jev-1.13.0 chose `semantic_stability`, confidence 0.74, over aggregate compatibility/viewer performance, **588 input / 51 output tokens**. Only a sanitized architectural summary was submitted. This prioritizes laterality and historical anchor semantics; it is a judgment, not verification. Raw response: ignored `.impeccable/review/batch6-design/jev-priority.json`. Model source pages were inspected read-only; no extraction/download/clinical test was run for Batch 6.

Before implementation, the user reviews this design and then the written implementation plan, per the selected architectural workflow. The native method and automatic local-activation preference are already settled and must not be asked again.
