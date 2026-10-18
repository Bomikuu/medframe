# Medframe UI/UX baseline audit — October 19, 2026

## Scope and evidence

The user's full UI/UX revamp brief is preserved verbatim in `docs/requirements/medframe-ui-revamp.txt`. It governs this work; later feature batches are paused. This is a refinement of the established white/Inter/navy/teal identity and a comprehensive replacement of weak page composition, not an unrelated brand or backend rewrite.

Source inventory: **27 page entry points**, plus their shared layout, collection, form and clinical owners. Actual browser baseline inspected: staff login/MFA, dashboard, patient directory, patient profile and consultation detail, using a separate clearly synthetic review clinic. Original administrator credentials/roles and real patient records were not used or changed. The synthetic fixture added three patients and one empty draft encounter through existing native services; secrets are stored outside the repository with private permissions.

Browser evidence is from the running production Batch 3 application at the user's actual **703×900** viewport. This is baseline observation, not a claim that all routes have passed visual/functional verification. Other pages are included in the source/implementation coverage matrix and still require the integrated viewport pass after implementation.

## Principal findings

| Priority | Finding                                                                       | Evidence                                                                                                                | Required change                                                                                                   |
| -------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| High     | Navigation consumes almost half the available height at the actual user width | Navigation, organization and account controls occupy approximately 416px before main content                            | Proper shadcn Sidebar; short mobile/tablet header and Sheet; grouped authorized navigation                        |
| High     | Patient profile renders every major category and its forms together           | Mostly empty synthetic profile is 5,164px tall at 703px; multiple H1 headings within one profile                        | Patient identity header, contextual actions, meaningful summaries, lazy content tabs and corrected heading levels |
| High     | Dental chart is not a discoverable patient destination                        | Profile only exposes a collapsed Compare dental history section; 3D editor sits below SOAP on consultation              | Explicit Dental Chart tab with current authorized chart, 2D/3D controls and selected-tooth panel                  |
| High     | Consultation composition is a long serial form                                | Empty consultation is 3,839px tall at 703px, with context/actions then SOAP, observations, dental, procedures and files | Persistent identity/save context, task tabs, contextual detail rail, focused entry sheets/dialogs                 |
| High     | Shared component kit is too small for the requested application patterns      | Only six files in components/ui: button-link, button, checkbox, input, select, textarea                                 | Install actual shadcn source components and reuse them through business components                                |
| High     | Dashboard lacks clear metric hierarchy                                        | Available real counts appear in paragraphs inside configurable widgets; recent consultations use text links             | Metric cards, compact clinical table, recent-patient avatars, meaningful authorized quick actions and activity    |
| Medium   | Patient directory lacks card view, avatars and advanced table controls        | Current plain table has name, reference and DOB only; no view persistence/column visibility/sorting                     | TanStack manual table, authorized search/filter/sort/paging, initials Avatar, persisted table/card view           |
| Medium   | Loading and error surfaces use generic wording                                | Shared LoadState says Loading patient information on unrelated routes; operation errors also refer to patient records   | Contextual Skeleton/Alert/Empty owners with appropriate retry and authority messages                              |
| Medium   | Clinical collections do not share a status and action grammar                 | Documents, plans, follow-ups, releases and queues each handcraft rows/labels/actions                                    | Shared Badge/status mapping, Table/Card/Progress, contextual menus and focused overlays                           |
| Medium   | Feedback and confirmation ownership need consolidation                        | Inline success paragraphs are widespread; custom application confirmation wraps Radix directly                          | One Sonner owner for confirmed nonblocking outcomes; shadcn AlertDialog through existing SafetyProvider           |
| Medium   | Form/toolbar density is inconsistent                                          | Multiple border-top sections, repeated headings/filter forms, wide controls and permanent entry fields                  | Shared page/header/card/toolbar/form-group spacing; errors remain next to fields; one primary action              |
| Medium   | Operations and portal must join the same system                               | Operations added their own section/live-status/collection layouts; portal has independent shell                         | Include all schedules/booking/queue/patient-portal screens in this same batch                                     |

## Route coverage matrix

Every entry below is in scope, including redirects and token-driven states. A row denotes inventory and planned coverage, not a fabricated completed redesign.

| Route                           | Source                                               | Planned treatment                                                                                            |
| ------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `/auth/recover`                 | `apps/web/app/auth/recover/page.tsx`                 | Shared staff authentication frame; aligned fields, MFA/recovery/reset states, focus and errors               |
| `/auth/reset`                   | `apps/web/app/auth/reset/page.tsx`                   | Shared staff authentication frame; aligned fields, MFA/recovery/reset states, focus and errors               |
| `/clinic/appointments`          | `apps/web/app/clinic/appointments/page.tsx`          | Daily agenda/table, compact filters, booking/reschedule Sheet, confirmations and live status                 |
| `/clinic/consultations/[id]`    | `apps/web/app/clinic/consultations/[id]/page.tsx`    | Clinical workspace, SOAP groups, dental/tooth rail, entry overlays and existing finalization/amendments      |
| `/clinic/consultations/new`     | `apps/web/app/clinic/consultations/new/page.tsx`     | Focused care-start form with patient context and explicit existing setup blockers                            |
| `/clinic/consultations`         | `apps/web/app/clinic/consultations/page.tsx`         | Compact consultation table, certainty/status badges, filters, dates and row actions                          |
| `/clinic`                       | `apps/web/app/clinic/page.tsx`                       | Real metric cards, structured recent tables, quick actions, configurable widget groups                       |
| `/clinic/patients/[id]/edit`    | `apps/web/app/clinic/patients/[id]/edit/page.tsx`    | Grouped patient editor in an appropriate Sheet/Dialog with preserved standalone route and unsaved protection |
| `/clinic/patients/[id]/history` | `apps/web/app/clinic/patients/[id]/history/page.tsx` | Attributed timeline and grouped revision detail; preserve exact versions and authorization                   |
| `/clinic/patients/[id]`         | `apps/web/app/clinic/patients/[id]/page.tsx`         | Patient header and lazy clinical/dental/treatment/document/access tabs                                       |
| `/clinic/patients/new`          | `apps/web/app/clinic/patients/new/page.tsx`          | Grouped patient editor in an appropriate Sheet/Dialog with preserved standalone route and unsaved protection |
| `/clinic/patients`              | `apps/web/app/clinic/patients/page.tsx`              | TanStack table/cards, initials avatars, search/filter/sort, columns, persisted view and cursor paging        |
| `/clinic/queue`                 | `apps/web/app/clinic/queue/page.tsx`                 | Operational board, grouped ticket actions, delay/reorder controls and clinical handoff                       |
| `/clinic/settings/appearance`   | `apps/web/app/clinic/settings/appearance/page.tsx`   | Accessible settings tabs/groups with unchanged branding preview/save/cancel/reset                            |
| `/clinic/settings/schedules`    | `apps/web/app/clinic/settings/schedules/page.tsx`    | Schedule/resource tables, grouped window/override editors and clear conflict feedback                        |
| `/clinic/settings/templates`    | `apps/web/app/clinic/settings/templates/page.tsx`    | Versioned guidance list/editor, focused prompts, archive confirmation                                        |
| `/login`                        | `apps/web/app/login/page.tsx`                        | Shared staff authentication frame; aligned fields, MFA/recovery/reset states, focus and errors               |
| `/`                             | `apps/web/app/page.tsx`                              | Verify existing redirect and destination state; preserve auth routing                                        |
| `/portal/appointments`          | `apps/web/app/portal/appointments/page.tsx`          | Own booking cards/actions with bounded reschedule editor and confirmation                                    |
| `/portal/invite`                | `apps/web/app/portal/invite/page.tsx`                | Shared patient authentication frame; verified invitation/recovery states, no authority changes               |
| `/portal/login`                 | `apps/web/app/portal/login/page.tsx`                 | Shared patient authentication frame; verified invitation/recovery states, no authority changes               |
| `/portal`                       | `apps/web/app/portal/page.tsx`                       | Patient shared-record summary/cards and simpler contextual navigation                                        |
| `/portal/queue`                 | `apps/web/app/portal/queue/page.tsx`                 | Own queue ticket/position/estimate and live/stale states without other identities                            |
| `/portal/records/[id]`          | `apps/web/app/portal/records/[id]/page.tsx`          | Exact shared clinical record panels, chart, treatment progress and protected previews                        |
| `/portal/recover`               | `apps/web/app/portal/recover/page.tsx`               | Shared patient authentication frame; verified invitation/recovery states, no authority changes               |
| `/portal/reports`               | `apps/web/app/portal/reports/page.tsx`               | Clearly separate patient-reported forms/list and receipt/status feedback                                     |
| `/portal/reset`                 | `apps/web/app/portal/reset/page.tsx`                 | Shared patient authentication frame; verified invitation/recovery states, no authority changes               |

## Data honesty and preservation

Existing `clinicDashboard` already provides patient count, open draft count and pending treatment count. Its recent-consultation rows currently lack provider names and a total completed count; add only narrowly authorized read fields/aggregates when needed, otherwise explicitly show unavailable. Do not treat the length of a paged list as a total. Missing patient photo support uses initials, not external avatar services. Clinical status, treatment evidence, amendments, portal publication and queue estimates retain their backend meanings.

No product UI, database schema or security policy was changed during this audit. Existing Batch 3 known functional/test-harness issues stay separate unless required for the requested UI flow. Native implementation and review remain in this chat without subagents. The supplied brief authorizes fixing UI problems; unrelated defects remain logged under the user's earlier preference.

## Implementation outcome

The approved native batch is implemented on `codex/ui-revamp`. All 27 entry points were reached in the bounded browser round; the exact rendered states, remaining refinements and verification limits are recorded in [ui-revamp-verification.md](ui-revamp-verification.md). This does not claim every plan assertion or token-driven state passed. Patient overview at 703px is now approximately 1,033px tall in the synthetic fixture, compared with the 5,164px baseline; main chrome is approximately 64px instead of 416px. The explicit Dental Chart tab and patient-header Start Consultation action are visible. The connected clinical save and private preview checks passed in the focused confirmation. Existing Batch 3 artifact/data/credentials remain preserved.
