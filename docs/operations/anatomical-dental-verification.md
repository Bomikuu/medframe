# Anatomical dental replacement — October 19, 2026

**Status: implementation saved; activation blocked.** The single verification pass found DENT-001 and DENT-002. See `error-log.md`. No repair/retest cycle was attempted. Existing local production on port 3000 remains unchanged.

## Preservation and assets

Source baseline: `0bb876f`, tagged `checkpoint/pre-anatomical-dental-2026-10-19`. Work branch: `codex/anatomical-dental`. Existing production artifact `.next-ui-revamp`, original database, authentication and backend clinical persistence remain in place. No migration, reset or deployment was performed.

Only two pre-existing, legally obtained source exports from Downloads were prepared: Dundee's [Permanent Dentition](https://sketchfab.com/3d-models/permanent-dentition-2f69d7b59c3e4a6a8bcae041bd8e591b) and [Maxillary First Molar (Left)](https://sketchfab.com/3d-models/maxillary-first-molar-e719a474ef7e4bd7abec508f85f1e984). Both carry [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) attribution. Full source, hashes, modifications, naming and limits are in `assets/dental/ATTRIBUTION.md` and `assets/dental/manifest.json`.

The permanent export contained 32 tooth meshes and one tiny export fragment. Prepared geometry retains the 32 distinct teeth with explicit FDI extras and source transforms. The separate molar is **UL6 / FDI 26**. Geometry/normal/UV/index buffer bytes are preserved; image payloads are resized to 512px for the arch and 1024px for the detailed molar. Prepared sizes are about 2.0 MB and 2.8 MB. No generic teeth or new mirrors were introduced.

The temporary source inspection rendered all three expected canvases (front arch, upper occlusal, single molar), without page errors. Its screenshot is `.impeccable/review/dental-assets/asset-inspection.png`. This demonstrates asset geometry, not successful product integration.

## Implemented source scope

- Actual GLB assets replace the schematic URLs in the primary renderer. Source identity metadata is validated before rendering. Runtime materials are cloned; source geometries/textures are shared.
- Added visible jaw controls, five camera views, bounds-derived framing, isolated-tooth mode, reset, educational reference preview and optional detailed FDI 26 reference. These paths exist in source but cannot be accepted while geometry is blank.
- Model-first workspace with selected-tooth Findings, Treatments and History. Conventional surface inputs retain existing RHF paths; exact active missing/absent-tooth terms hide a tooth without inventing segmented pathology. Primary dentition retains 20 proper FDI buttons in 2D.
- Existing GraphQL documents, backend permissions, encounter save/version/finalization, finalized snapshots and tooth history remain the data owners. No clinical content is stored in the GLB. A hidden consultation tab does not mount the model, while RHF panels stay mounted.
- Outer consultation fieldsets are replaced with layout wrappers so read-only camera/navigation controls remain usable. Clinical controls still receive readOnly/lifecycle state and retain their own disabled owners. Mutation safeguards remain authoritative in Django.

## Single accumulated verification pass

| Check                                               | Actual result                                                                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Prettier / Python format                            | Applied to changed supported source                                                                               |
| Prepared asset identities and geometry              | Passed: 32 permanent identities, one FDI 26 reference, preserved non-image buffers, jaw/side metadata and license |
| `npm run typecheck`                                 | Passed                                                                                                            |
| `npm run lint`                                      | Failed: three new immutability errors; two pre-existing operations warnings                                       |
| Ruff on asset preparation script                    | Passed                                                                                                            |
| Isolated production build `.next-anatomical-dental` | Passed                                                                                                            |
| Scoped Impeccable detector                          | Exit 0, no findings printed; does not validate runtime anatomy                                                    |
| Connected browser run                               | Six groups, three passed, three failed; no page errors; no retry                                                  |
| Visual review                                       | Blocked: blank product geometry; required mobile capture absent                                                   |
| New clinical finding save/reload                    | Not reached after selection failure                                                                               |
| Local activation                                    | Not performed                                                                                                     |

The successful browser groups cover synthetic staff sign-in, no model request on unrelated Notes, primary 2D fallback and absence of finding-edit controls in the patient finalized chart. Ready text alone is not a visual pass. Dependent detailed-molar/persistence checks failed to reach their targets because FDI 26 was not selected. The source helper raycasts against all 32 prepared meshes; successful real-browser selection of every tooth is not claimed.

Logs and the one browser harness/report are retained in ignored `.impeccable/review/anatomical-dental/`. Screenshots include only synthetic data. The temporary review servers on ports 8001/3001 and asset inspector on 3012 are stopped after evidence is saved. Current production API/web and worker/beat are preserved.

## Native design review and limits

Impeccable review/documentation were performed inline, as the user prohibits subagents. Finish disposition: **recapture**, with no recapture attempted under the testing limit. Required evidence is blank or missing. Existing white/navy/teal tokens, Inter, shadcn/Radix controls and normal document scrolling are retained; no visual-system replacement is recorded. The active schematic description in DESIGN.md remains the shipped baseline until the replacement passes.

Independent clinical validation, calibrated dimensions, gingiva, restorations/implant variants and reliable mesh surface segmentation are unavailable. The source proportions and explicit mapped identities are educational references, not patient-specific measurements. Exact stored findings and proposed/completed statuses remain authoritative; whole-tooth feedback does not establish precise disease location. Primary 3D anatomy is intentionally absent.

Before activation, resolve the logged renderer/lint blockers with user authorization and perform the specifically blocked acceptance checks. Keep the prior build for rollback. Do not treat the successful build or source asset inspection as acceptance of the product renderer.
