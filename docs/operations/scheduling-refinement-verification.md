# Weekly availability and month calendar — October 21, 2026

## User request and implementation

The user requested several weekdays in one recurring availability form, date-specific exceptions,
a clickable month calendar, booked-patient context, suggested durations with Other and written dates.
Native execution only; no agents, builds or automated tests.

Schedules → Add weekly availability now offers seven weekday toggles with independent opening,
closing and default duration fields, a Monday–Friday shortcut, provider and effective date bounds.
Weekly repetition is explicit. Editing loads the selected window plus unique active weekday windows
for the same provider and exact effective bounds. Split shifts remain separate; unchecked days and
other saved windows are explicitly unchanged. Disabling an existing window remains a separate
native versioned action. The form does not silently replace every provider schedule.

The new weekly_schedule action validates one–seven unique weekdays in the same branch/provider,
locks the native provider, checks overlaps and saves the selected rows in one transaction. Each
child reuses save_schedule, optimistic versions, reservation coverage, audit/events and an
idempotent derived request ID; the root also has a request receipt. A failure rolls back the entire
batch. No new persistence model or migration. The specific-date form reuses native overrides for
provider or branch opening hours/closure and existing version/conflict checks; closure precedence
remains unchanged. Neither weekly editing nor an override reschedules existing patients.

Appointments defaults to Month with Day/Week/Agenda alternatives. Month navigation requests a
bounded 42-day clinic-calendar range. Counts aggregate all appointments matching the same native
branch/provider/status query; previews use a per-clinic-day row number limited to three, ordered by
start/id. Empty days and overflow counts open the detailed day; patient previews open the existing
native AppointmentDetails modal. Preview appointments receive the same scoped queue metadata as
normal agenda items. Month counts are not falsely derived from the first 50 agenda rows. Day/week
and agenda keep the existing cursor paging and explicit partial-calendar wording.

Day/week also offers a Working hours & booked patients disclosure with provider, written day,
opening range and clickable booked patient/time/status rows. This is schedule context, not verified
free capacity. Short timetable blocks prioritize start/end and patient; provider/status text appears
when height permits, with full context available in the accessible label/tooltip/details. This
requested context refinement changes the presentation underlying CALENDAR-001 without claiming
full native/browser acceptance of every short-block state.

DurationChoice uses the shared authored FormSelect:15/20/30/45/60/90/120 minutes plus Other duration
and custom5–240 minutes in five-minute increments. Booking/rescheduling/walk-in and weekly schedule
forms share it. The shared DateInput preserves native ISO/date semantics and platform calendar
popup but visually displays e.g. November 11, 2026. Scheduling date controls, weekly effective bounds,
dated overrides, day labels, Queue day labels and shared operations/portal timestamps use written
month names and year. Internal date comparisons/transport remain ISO; day-of-month numbers inside
the month grid remain normal calendar notation. This is not a claim that every legacy application
date field was migrated. DESIGN.md records the written-date contract for subsequent UI work.

## Ownership and preservation

Existing FormField/FormSelect/Switch/EntrySheet/SafetyProvider/OperationNotice/LoadState remain
canonical. The date primitive is shared because no maintained authored calendar existed. Its
browser-owned popup remains native; the product owns the written visible label. AvailabilityDays
is presentation only; WeeklyAvailabilityForm owns native scope/mutation/version behavior.

Private before-edit sources: .medframe-runtime/scheduling-refinement-before-20261021-014827.
The temporary presentation source is preserved privately as
.medframe-runtime/scheduling-refinement-presentation.tsx; its app route was removed after review.
No database/schema migration, fixture import, credential/MFA/grant change, clinical/financial
mutation, public deployment or external communication occurred. Existing unrelated edits and the
user-owned clinic-shell width snippet were retained. This phase does not claim fresh DB row
fingerprints or a new restore verification; infrastructure/schema were unchanged.

## Actual tools and formatting

Graphify was queried first against the existing root graph (1150 nodes;182 neighbors;17 displayed
under budget550). That corpus was stale relative to recent operations work, so source inspection
governed. A focused AST-only corpus was refreshed from operations frontend, shared date input,
operations calendar/inputs/scheduling/appointments/policy, GraphQL operations and record paging.
It produced199nodes/629edges with no LLM extraction. Query:
`graphify query 'save_weekly_schedule calendar_context AppointmentMonth AvailabilityDays DurationChoice' --budget420`
from .medframe-runtime/scheduling-refinement-graph. It found152neighbors and displayed12, explicitly
truncated. This is a focused dependency map, not full-repository/runtime coverage or authorization
proof. The graph/extraction/corpus are private ignored artifacts.

Jev planning choice asked whether weekly updates should be atomic or partial: atomic0.97, selected
atomic, confidence0.94, modeljev-1.13.0,396input/31output tokens. Review choice asked which acceptance
claim the limited evidence supports: limited1.0, confidence1.0,427input/31output tokens. Only generic
engineering state was submitted; no patient data, credentials, account IDs or private attachments.
These are structured judgments, not verification results.

Prettier formatted the touched TS/TSX modules; Ruff format handled the five Python modules.
The weekly form was included explicitly after its new day-field extraction. No production build,
TypeScript check, lint/test suite or broad premium audit ran, honoring the user's explicit bounded
visual-only preference. Installed Next guides and established surface/behavior owners were followed;
Impeccable and frontend design guidance retained the current navy/teal/white system.

## One bounded visual pass

CUA reviewed the exact presentation-only AppointmentMonth, AppointmentCalendar,
ScheduleBookingContext, AvailabilityDays, DurationChoice and DateInput with clearly synthetic names.
No auth middleware bypass, fake permissions or original DB fixtures were used. Native browser6
replaced the unavailable prior browser4; this was a browser handle change, not a product failure.

Observed:
- Desktop month heading/42day grid and complete synthetic count5 versus three patient previews.
- Selecting the9:30Alex sample changed the preview selection to the correct identity; View all5
  opened the detailed day with written date and booking ranges.
- The working-hours disclosure showed Dr.Sample,9AM–5PM and three patient/time/status rows.
- Weekly rows showed Monday9AM–5PM/30minutes and Tuesday10AM–4PM/45minutes independently.
- Authored duration popup displayed seven suggestions and Other; Other exposed custom minutes,
  changed to35. Turning Wednesday on revealed its own fields.
- Date input displayed November 11, 2026 and accepted a native ISO date update in the review UI.
-390x844 screenshots showed stacked availability controls and contained horizontal month scrolling.
- The actual /clinic/settings/schedules entry redirected the unauthenticated browser to /login.

Two role-based automation locators did not resolve native AX-exposed summary/navigation controls.
The actual observed AX elements were then used successfully in the same pass; no product repair or
second browser round. This does not establish native save, conflict, retry, concurrent version,
month-query/aggregate correctness, clinical action or MFA acceptance. Those remain CALENDAR-002.
No complete accessibility, native-popup platform matrix or page-overflow measurement is claimed.
The preview was removed and viewport reset. Older unrelated errors remain deferred.

## Local activation

`./medframe stop --only backend`, then
`./medframe start --only backend --dist-dir .next-local-dev` returned Ready. API4070783,
worker4071016, scheduler4071017, media4071018 and existing dev web4000113 are running; the original
medframe_django remains the target. The frontend consumes live development source changes.
No migration was needed or applied. Launcher readiness is not a functional scheduling test.
Source rollback is the private before-edit copy, reconciled with unrelated changes; do not switch
or restore the database for this schema-free refinement. No new production artifact was built.
