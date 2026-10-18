# Anatomical dental replacement implementation plan

> User execution method: natively in this chat, no subagents. The supplied replacement brief specifies the desired design and one cohesive implementation batch. Use the two existing official assets first and preserve the working clinical system. Verification remains one accumulated focused pass; findings are logged, without an open-ended repair loop.

**Goal:** Replace the primary permanent-dentition renderer with 32 individually mapped anatomical Dundee teeth and an optional detailed FDI 26 reference.

**Architecture:** Preserve Django/GraphQL/RHF persistence and exact historical revision owners. Prepare known-hash GLBs with explicit FDI extras and smaller textures, then use a geometry-aware scene and camera inside the existing lazy dental viewer. Make anatomy the primary view with selected-tooth Findings/Treatments/History and an accessible 2D alternative.

**Spec:** `docs/requirements/medframe-anatomical-dental.txt`.

## Review focus

- Patient left/right and tooth-specific morphology must map by explicit identity, including the source's left molar as 26.
- Materials/geometries in the GLTF cache must not be mutated by selection, condition rendering or teardown.
- Missing teeth and hidden jaws must not intercept raycasts; isolated missing teeth must retain a valid camera and an explanatory state.
- No unavailable primary anatomy, mesh surface segmentation or clinical dimensional calibration may be fabricated.
- Hidden consultation tabs must preserve RHF values without loading anatomical assets on unrelated screens.

## Native work order

- [x] Inspect both original GLBs, embedded metadata, scene hierarchy, geometry, transforms and textures; verify source availability/license. Render original geometry in a temporary isolated inspector.
- [x] Preserve the UI baseline at `checkpoint/pre-anatomical-dental-2026-10-19` and branch `codex/anatomical-dental`.
- [x] Add reproducible known-hash asset preparation, attribution, explicit 32-tooth FDI metadata, texture optimization and the single-tooth reference. Do not alter tooth geometry or original downloads.
- [x] Implement the source replacement with anatomy, cloned materials, scoped raycasts, jaw controls, bounds-based camera views/isolation and educational reference mode. Runtime acceptance remains blocked by DENT-001/DENT-002.
- [x] Implement model-first layout, compact 2D fallback, conventional surface inputs, selected-tooth tabs and existing historical/procedure owners. Clinical mutation owners remain unchanged; connected persistence verification was not reached.
- [x] Format source and run the single accumulated asset/TypeScript/lint/Ruff/build/browser pass. Log failures without repairing or retrying. Desktop geometry is blank; mobile and save/reload coverage were blocked by failed selection.
- [x] Record actual results/limitations and pending behavior contract. Preserve the incumbent design system and reviewable changes.
- [ ] Repair logged blockers and complete the blocked acceptance checks only after a later user instruction. Activate locally only when important checks pass; preserve earlier artifacts and data.

Actual result: `docs/operations/anatomical-dental-verification.md`. **Not activated.**
