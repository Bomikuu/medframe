# Reference-guided Provider schedules — October 21, 2026

## Implemented scope

The user supplied a Provider schedules layout reference. This bounded frontend refinement keeps the
current clinic shell and reporting navigation, while matching its schedule content hierarchy:
header calendar/add actions, branch choice, section links, weekly provider table, saved windows and
side-by-side resource/date-override panels on wide screens. Section links navigate within the page;
they are not tabs that hide or unmount forms. Phones stack sections and the week table has its own
horizontal scroll region.

Weekly availability now shows circular initials, compact written weekday/date headings, actual
hours/no-hours/closure states and previous/next/pick-week controls. Manager-only provider menus
open provider-prefilled availability or filter that provider's saved windows. The original weekly/
date-override/effective-range resolution logic remains. A missing specialty/photo/resource-type field
is not invented; the current setup provides provider names and generic resources. Reference names,
images and fabricated specialties were not seeded into the clinic.

Saved windows retain separate native rows, exact effective dates, durations/status and existing
versioned edit/enable/disable actions. No non-atomic bulk toggle was introduced to mimic a grouped
reference row. The existing multi-weekday form remains the save owner. An optional providerId only
prefills new availability from a selected provider. Existing EntrySheet now accepts ReactNode trigger
content so the top action can reuse the same sheet with its icon; other behavior remains unchanged.

Resources use local name search/clear, real active/inactive status and an actions menu. Add/rename
uses a focused guarded dialog and the existing resource action, expected version and branch context.
Enabling/disabling still confirms and uses the original reservation conflict checks. No new resource
taxonomy or scheduling engine. Date override fields/list were separated from their existing owner
for presentation reuse; Switch/date/time fields, dirty guards, confirmations, versions and native
mutation remain in DateAvailability. No backend, schema, account/MFA/role/grant/device changes.

## Preservation and local activation

Selected pre-edit sources: .medframe-runtime/schedule-reference-before-20261021-142611.
Focused implementation archive: .medframe-runtime/schedule-reference-source (18 source files,
not a full repository backup). Synthetic presentation source is private at
.medframe-runtime/schedule-reference-presentation.tsx; its temporary review route was removed.
The user's clinic-shell width snippet and unrelated working-tree changes remain untouched.

Launcher stopped local services. Its first checkpoint attempt refused port3000 after stop; a later
listener observation was empty. No unmanaged process was killed or guard bypassed. A fresh encrypted
checkpoint and isolated restore then completed:

/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261021-143325-a89bd41

Clone medframe_django_schedule_ui_20261021_063324_fa590f verified167 tables, source_written=false.
No migration was required or applied in this phase; original medframe_django remains the runtime
store. This is checkpoint/isolated restore evidence, not post-traffic row/object fingerprints.
No clone restore over original data, fixture import or original credential/permission change.

Launcher .next-local-dev is active: API1226557, worker1226690, scheduler1226691, media1226692,
web1227218. Final status reports all running. Existing local call media and public-domain preparation
remain unchanged. No build, deployment, live message or actual appointment/resource/schedule mutation.

## Actual verification

Prettier formatted touched supported files. A JSX closing-tag mismatch during toolbar construction
was caught by formatting and corrected before activation/visual review (SCHEDULE-REF-003). No build,
automated tests, typecheck or lint suite under the user's visual-only preference.

One bounded desktop/390x844 phone CUA pass used actual ScheduleLayout, ScheduleWeek, SavedWindowsPanel,
ScheduleResources, DateAvailabilityFields/List, BranchChoice, EntrySheet, AvailabilityDays and shared
primitives with explicitly synthetic provider/resource/window data. It made no native operation save.
Observed desktop hierarchy, week advance and written date/header changes, provider menu/filter,
resource search/clear, actual scope dropdown options and closed-day field presentation. The switch's
setChecked command reported a locator deadline after its accessible name changed from Available to
Closed; subsequent fresh region text showed Closed on this date with time fields removed. This is
staged presentation evidence, not an assertion that the command completed cleanly or native closure
was saved. The shared availability sheet with multi-day controls rendered at phone width; its native
weekly save owner and native resource dialog were not exercised in this synthetic route.

Phone week controls and panel/table rendering were inspected. The table stays inside a341px scroll
region with about969px content, but document scrollWidth946 exceeded viewport390 and a page-level
horizontal scrollbar appeared. Root cause was not established. SCHEDULE-REF-001 records this without
repair or a second visual pass, following user preference. No complete responsive acceptance claim.

Native authenticated branch switching, provider-prefilled weekly form persistence, resource add/
rename/status, effective-date/version/conflict/permission boundaries and actual override saves remain
unverified (SCHEDULE-REF-002). No real provider/appointment/resource/window data were changed. Temporary
tab closed, viewport reset and review route removed. No further broad testing/polish loop.

## Actual Graphify and Jev use

Existing1150-node root query ProviderSchedule/ScheduleWeek/SchedulesPage returned100 neighbors,
14shown at450-token budget, explicitly truncated, with historical paths. Source inspection remained
authoritative. Refreshed18-file focused AST corpus .medframe-runtime/schedule-reference-graph-corpus,
output .medframe-runtime/schedule-reference-graph: final145nodes/321edges, no extraction warning.
An optional weekly.py candidate was absent and not included; no missing-file graph coverage claim.
Vocabulary expansion selected [schedule, week, resource, availability]. BFS2 query returned74neighbors/
16shown at500-token budget, truncated. AST only, no LLM semantic extraction, whole-repository,
permission or runtime coverage claim. No private records or reference image sent to extraction.

Jev0.7.0 auth status available; official default provider/model jev-1.13.0. Sanitized engineering
planning chose native presentation reuse (confidence1.0,418input/31output tokens); review chose
bounded honest evidence (confidence1.0,445/31). No PHI, credentials, private attachment/image or actual
clinic data sent. Judgments are not validation, authorization or passing native acceptance.
