# Medframe UI revamp — implementation and bounded verification

Date: October 19, 2026. Branch: `codex/ui-revamp`. User approved the saved UI revamp plan and required native execution without subagents. All implementation, browser inspection and review were performed in this chat. The Impeccable finish/documentation review was substituted with its in-thread degraded workflow; no independent review is claimed.

## Preservation and implementation

Checkpoint `checkpoint/pre-ui-revamp-2026-10-19` preserves `30c7c67`. The active Batch 3 production artifact remains in `apps/web/.next-batch3-rehearsal`, and the older `.next` artifact remains intact. The new production artifact is isolated in ignored `.next-ui-revamp`. No database migration, restore, original credential change, permission reset, push or public deployment was performed. Browser writes used the clearly synthetic UI review clinic and private review identities only. The portal fixture was established through native clinic invitation and MFA activation; its credentials remain outside Git.

The shared shell now uses the actual shadcn Radix Sidebar, compact header, grouped navigation, mobile Sheet, account DropdownMenu and notifications Popover. New registry primitives include Card, Badge, Avatar, Tabs, Table, Breadcrumb, Separator, Skeleton, Empty, Progress, Tooltip, Dialog, AlertDialog, Sheet and Sonner, alongside the preserved canonical inputs/buttons. Components were generated using the configured `radix-nova` registry, then adapted to the project's canonical `cn`, real Radix state attributes and existing theme owner. TanStack Table 8 owns column visibility; sorting and pagination remain server-owned. No Base UI migration occurred.

Connected changes include real dashboard metrics/provider rows; patient directory table/cards and scoped view preference; global name/reference ordering, search and branch filters; registration Sheet; a patient identity/action header and lazy permission-gated URL tabs; visible Dental Chart and Start Consultation actions; persistent consultation task tabs and a patient context rail; focused diagnosis, observation, procedure and finding Sheets; 2D/3D FDI selection; treatment Progress and focused plan/follow-up entry; scanned document upload and authorized preview Dialog; appointment/walk-in/schedule entry Sheets; operations status and collection framing; appearance Tabs; template list/detail composition; compact staff/patient auth and portal navigation/record cards.

The new read-only `patientDirectory` query uses signed string cursors bound to actor, organization, query, order, branch, current membership permissions and active patient grants. The original UUID `clinicPatients` API remains compatible. No patient data or clinical draft is written to localStorage; only a user/organization-scoped table/cards preference is stored. Dashboard provider names are fetched only through existing authorized clinical encounter scope.

## Actual verification

One accumulated check invocation and one broad browser round were followed by a bounded correction/confirmation for the findings. This was **not literally one command or one build**: the initial source checks caught a menu syntax error and an incorrect provider relation in the newly extended dashboard query. The initial build stopped at the syntax error; the corrected preview build passed. A final build after the UI correction batch passed. No full historical backend or operations acceptance suite was rerun.

| Check                                  | Result                                                                                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Final production build with TypeScript | Passed; all existing routes compiled into `.next-ui-revamp`                                                                                     |
| Directory query/authority tests        | 3 passed in 0.648s on isolated `medframe_django_ui_revamp_test`                                                                                 |
| Targeted Ruff                          | Passed; changed Python formatted/imports organized                                                                                              |
| Source ESLint confirmation             | Exit 0, zero errors, two existing RHF/React Compiler warnings                                                                                   |
| Impeccable detector                    | One invocation, `[]` findings                                                                                                                   |
| Broad browser round                    | 29 named checks: 26 passed, 3 required correction/selector adjustment; 44 captures; zero page errors                                            |
| Focused browser confirmation           | All 6 named checks passed, 13 captures; zero page errors                                                                                        |
| Final evidence captures                | Loaded schematic model and rendered synthetic PDF with extracted text captured; stitched dental captures replaced with normal viewport evidence |
| Formatting / diff whitespace           | Prettier and Ruff applied; `git diff --check` passed                                                                                            |

The broad lint invocation initially included saved custom Next artifacts, producing generated-code noise. Explicit ignores now cover those artifacts. Source findings were the menu parser error and the generated mobile hook's effect-driven initialization. These were corrected without disabling source lint rules. The directory test's first run had 2 passes and one error from the new provider relation; the native relationship is `provider.membership.user`, and all three tests passed after correction. An initial browser attempt on port 3001 was stopped because its review web process lacked `WEB_ORIGIN=http://localhost:3001`; this was review configuration, not an application authentication defect. Authentication guards were retained.

The actual UI findings were a close button behind a sticky Sheet header and a 16px Appearance overflow at 390px. The close action now has the correct stacking position, and the tab/grid containers can shrink. The ambiguous Diagnosis 1 test selector matched both the labelled dialog and its input; confirmation targets the textbox. Early loading-state captures were replaced with loaded dashboard/chart evidence.

Confirmed interactions: staff and portal password/MFA sign-in; directory table/card persistence, search/no-results and order selection; mobile navigation open/close; dirty registration cancel/keep/discard; diagnosis cancellation; selected-tooth finding entry; procedure entry; SOAP preservation across tabs and reload after a confirmed draft save; model load; patient tab/deep-link navigation; dark preview and cancel; upload, clean scan, private PDF rendering/text and closing cleanup. Finalization/amendment mutations were deliberately not exercised in this styling batch; their existing owners remain unchanged.

## Route/state coverage

Every one of the 27 existing page entry points was source-reviewed and reached in the browser round, with the following explicit state limits. Shared screens are changed through their canonical owner rather than duplicate page wrappers.

| Route group                                               | Rendered/reviewed state                                                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/`                                                       | Existing staff redirect to sign-in                                                                                       |
| `/login`, `/auth/recover`, `/auth/reset`                  | Staff sign-in/MFA, recovery request, missing-reset-token state                                                           |
| `/clinic`                                                 | Loaded scoped dashboard at 1440, 703 and 390px                                                                           |
| `/clinic/patients`, `/clinic/patients/new`                | Table/cards, empty search, standalone registration and guarded registration Sheet                                        |
| `/clinic/patients/[id]`, `/edit`, `/history`              | Identity/contact, medical, consultations, dental, treatments, documents, shared/access tabs; edit and attributed history |
| `/clinic/consultations`, `/new`, `/[id]`                  | Filtered list, authorized start form, draft notes/dental/procedure/documents and context                                 |
| `/clinic/appointments`, `/clinic/queue`                   | Empty authorized agenda/queue, filters and mobile framing                                                                |
| `/clinic/settings/schedules`, `/templates`, `/appearance` | Schedule/resource/override setup, empty template list/editor, personal/branding/dashboard preferences                    |
| `/portal/login`, `/invite`, `/recover`, `/reset`          | Patient sign-in/MFA and missing-invitation/reset-token states                                                            |
| `/portal`, `/appointments`, `/queue`, `/reports`          | Verified synthetic own-record portal, empty releases/appointments/queue and separate reports form                        |
| `/portal/records/[id]`                                    | Unavailable-release state; no new published clinical release fabricated for a styling check                              |

The important viewport round used 390×1000, 703×1000 and 1440×1000. It did not cover every route at every width, 1920px, every keyboard path, a full accessibility audit, fresh valid reset/invitation acceptance, real published portal payloads, populated appointment/queue transitions, loaded treatment histories, or all clinical permission roles in the browser. These remain coverage limits, not fabricated passes.

## Remaining work and boundaries

- Existing B3-004 RHF warnings and B3-006 older operations-test MFA selector remain deferred; this UI-specific harness used the actual label.
- Last-visit/status/photo metadata is not supplied by the demographic API. The directory displays supplied identity/reference/DOB and initials; it does not invent clinical status or photos. A calculated age column and additional profile metadata remain refinements.
- Schedule resources/overrides and some access/release forms retain their existing inline structure. Selected-tooth history remains a disclosure; a separate nested Findings/Treatments/History tab set and contextual treatment editor are not part of this delivered composition.
- Existing private file serving emits Django's synchronous-stream-under-ASGI warning. The rendered PDF/cleanup check passed; transport refactoring was not attempted.
- Package installation reported 12 high-severity audit findings. No extra audit, forced upgrade or unrelated dependency repair was performed.
- `.impeccable/review/ui-revamp/` contains ignored synthetic screenshots, the two review harnesses and result JSON. The loaded dashboard, patient overview, Appearance and private PDF captures are usable evidence; dental evidence uses normal viewport captures after replacing stitched full-page artifacts.

## Native activation

The new source and artifact are ready for local cutover. Activation evidence is appended below after restarting only the native web/API processes. The worker, beat, infrastructure, original data and saved credentials remain in place. The prior Batch 3 artifact can be selected again with `NEXT_DIST_DIR=.next-batch3-rehearsal`; the read-query additions remain backward compatible.

### Activated locally

The native API and web restarted successfully on 8000/3000 with the final source and `.next-ui-revamp` artifact. `/health/ready` returned `{"status":"ready","backend":"django"}` and `/login` returned HTTP 200. The compiled WebSocket origin targets port 8000; the review server's earlier reconnect indicator was expected because it used a separate 3001 origin. No full operations socket journey was repeated after cutover. Native logs are `/tmp/medframe-django-ui-runtime.log` and `/tmp/medframe-web-ui-runtime.log`.

### Native finish review

`disposition: ship` applies to the delivered UI composition and corrected findings, with the remaining refinements and coverage limits above explicit. This is an in-thread self-review using the skill's degraded reviewer/documenter instructions, not an independent review or complete acceptance of every plan checkbox.

- **Persistence:** PRODUCT.md, DESIGN.md, UX-CONTRACT.md and `.impeccable/design.json` retain the established brand, token authority and behavior owners. Git checkpoint and old runtime artifacts remain.
- **Fidelity:** Inter typography, cool white ground, navy/teal actions, modest geometry, actual shadcn/Radix controls, scoped data, patient/task tabs and clinical context rail match the approved operating direction. Narrow Sheet navigation is the responsive adaptation. No external comp or new visual identity was supplied. Nested tooth tabs and remaining inline editors are explicitly deferred, rather than claimed complete.
- **Ceiling:** The required clinical workspace composition is visible in loaded desktop, 703px and mobile evidence. Model geometry remains the existing unvalidated schematic. No production clinical-validation claim is made.
- **Material fixes:** The found close-button and Appearance overflow defects are resolved in the confirmation. Loading captures were replaced with loaded evidence. The stitched dental captures were subsequently replaced with ordinary viewport captures showing the complete model and its surrounding controls; no further product edit/build or broad test round followed.
- **Keep:** Preserve exact clinical states, scoped permissions, visible Dental Chart/Start Consultation, persistent draft behavior and private preview cleanup.
