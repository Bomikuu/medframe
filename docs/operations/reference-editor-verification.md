# Reference-guided editor — October 19, 2026

**Current status: activated locally after authorized REF-001 repair.** The initial failed pass below remains historical evidence; the activation record at the end supersedes its runtime status. Desktop interactions pass focused confirmation. Full visual acceptance is incomplete because REF-003/004 remain deferred.

## Reference and scope

The user supplied `/tmp/codex-clipboard-c34d3e71-7556-46fb-968e-c643cf2f38df.png` as the surrounding editor layout, explicitly excluding replacement of the existing 3D model. The new composition uses the real patient identity/status/save feedback, consultation navigation/actions, FDI/Universal display toggle, ordered jaw rows, shared jaw/isolation controls, canvas tools, view-thumbnail strip and a tooth inspector with Findings/Treatments/History/Notes. The existing 3D geometry, source materials/lighting and clinical persistence owners are retained.

Navigation targets existing Notes/diagnoses, procedures, patient treatments and documents. Save/completion/finalization remain callbacks to the original EncounterEditor lifecycle and permissions, including completion before finalization. The reference's sample name, age, identifiers and timestamps are not copied. Measurement is explicitly unavailable because the anatomical source is uncalibrated. Tooth labels, rotate/zoom/pan and canvas expansion have actual state bindings.

The right inspector uses a source-derived selected-tooth image and explicitly assigned surface labels. Surface cards reuse the identity image; they do not claim a segmented or automatically inferred clinical surface. Point notes and exact revision/history owners remain unchanged.

## Preview assets

`node scripts/render-dental-previews.mjs` rendered **37 transparent PNGs**: 32 individual tooth meshes and five camera views. Total output is approximately 664 KiB. The existing prepared Dundee GLB supplies all geometry and materials; no additional models were downloaded. Source, author, CC BY 4.0 license and modification information are embedded in PNG metadata and recorded in `assets/dental/previews.json` and `assets/dental/ATTRIBUTION.md`. The generator uses one temporary local WebGL renderer and shuts it down after rendering.

Native inspection viewed tooth 16 and upper occlusal preview images. This validates asset appearance only, not product rendering. FDI/Universal display logic follows the [ADA Universal Tooth Designation System](https://www.ada.org/-/media/project/ada-organization/ada/ada-org/files/publications/cdt/universal_tooth_designation_system_valueset_2.pdf); stored records and mesh selection continue to use FDI.

## Single accumulated verification

| Check                               | Actual result                                               |
| ----------------------------------- | ----------------------------------------------------------- |
| Prettier                            | Applied to supported changed files                          |
| Preview production                  | 37 PNGs rendered from the existing GLB                      |
| ESLint                              | Passed, zero errors, two pre-existing operations warnings   |
| Impeccable scoped detector          | Three advisory 11px sizes outside documented ramp; deferred |
| Production build                    | Failed: missing `@/components/ui/switch`                    |
| TypeScript build stage              | Not reached after module-resolution failure                 |
| Browser/desktop/mobile confirmation | Not run; no working artifact                                |
| Local activation                    | Not performed                                               |

REF-001/002 in `error-log.md` contain reproduction and evidence. The user was asked for narrow authorization to add the missing registry control and complete one confirmation/activation. No repair or rebuild is assumed authorized merely by elapsed time. The planned browser harness is prepared under `/tmp/medframe-reference-browser.cjs` but not executed. Native finish review cannot accept missing screenshots; no independent/subagent review or visual pass is claimed.

## Preservation

Work branch: `codex/dental-reference-editor`. Source checkpoint: `checkpoint/pre-reference-editor-2026-10-19` at `389ee64`. Existing `.next-dental-editor` and `.next-anatomical-dental` artifacts remain intact. No backend/schema/database changes, credential changes, public deployment, source reset or additional third-party download occurred.

The preserved live web/API use ports 3000/8000. Review API 8001 was started while preparing verification; review web 3001 cannot start without the successful build. Review API 8001 is stopped while awaiting the required instruction; port 3000 remains unchanged. The approval prompt remains pending.

## Authorized activation — October 19, 2026

The user requested “Fix blocker and activate locally”. Commit `51de539` adds the actual [shadcn Switch](https://ui.shadcn.com/docs/components/radix/switch) from the [radix-nova registry source](https://ui.shadcn.com/r/styles/radix-nova/switch.json). Its virtual cn import is mapped to `@/lib/utils`, and data-state selectors match the installed Radix implementation. No dependency or backend change was required.

The one repair build passes production compilation and TypeScript; targeted Switch lint passes. One focused browser confirmation records five passed assertion groups with zero page errors:

- Real identity/header/navigation, 32 selectable teeth and loaded PNG previews; captured at 1770px and 1440px.
- FDI/Universal display (FDI 16 displays as Universal 3), camera tiles and matching camera select, show-label switch, Pan/Rotate and expand/restore panels.
- Manual mesial surface selection passed into the existing finding Sheet; cancelling removed the synthetic unfinished entry.
- Clicked FDI 26 point, added a note, saved through the parent draft, reloaded, reopened the anchored pin and inspected its Notes tab text.
- At 390px, inspector controls, persisted note text, 2D alternative and return to SOAP/navigation remain accessible at the asserted scope.

These group results are **not a full visual pass**. Native screenshot inspection found the shared 90dvh dialog height cap and mobile blank-canvas/action-clipping/pin-layering evidence. REF-003/004 document exact scope and uncertainty. No repair/retry followed the confirmation. The three REF-002 text advisories and older backend-test import ordering remain deferred. No backend tests were repeated because this repair adds only the UI primitive.

Current web port **3000** runs `.next-dental-reference` with BACKEND_URL `http://127.0.0.1:8000`, WEB_ORIGIN `http://localhost:3000` and built socket URL `ws://localhost:8000/ws/operations`. Runtime session 99125; log `/tmp/medframe-reference-runtime.log`. API process 3715796 was retained. Database, existing accounts, passwords/MFA, worker and beat remain unchanged. Only the dedicated synthetic draft received `Synthetic reference editor: point note.` during confirmation. No consultation was completed/finalized.

Local HTTP smoke checks returned 200 for login and the tooth-16/upper-view PNGs; both asset checksums matched the prepared files. Temporary review API 8001/web 3001 were stopped. Evidence/harness/logs are retained in ignored `.impeccable/review/reference-editor/`.

For UI rollback, stop only the reference web process and restart `.next-dental-editor` from `apps/web` with the same BACKEND_URL/WEB_ORIGIN on port 3000. No API/database rollback is necessary. The earlier `.next-anatomical-dental` artifact and all source checkpoints also remain intact.

Impeccable review/documentation were performed inline, without subagents. Screenshot review requires fixes for REF-003/004 before full visual acceptance; those defects were not canonized as design-system choices. Existing DESIGN.md token values and `.impeccable/design.json` remain unchanged.
