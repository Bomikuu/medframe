# Provider calendar

Mode: Operate. Extend the existing clinical desk design system.

Appointments defaults to Month, with day/week timetables and an agenda, date navigation,
provider/status filters, explicit clinic timezone and configured working hours. Week scrolling stays
inside the calendar; a semantic weekly availability table keeps schedules readable with keyboard
and narrow-screen access. Provider scope remains native; only schedule managers edit availability.

Clicking a booked patient opens focused booking/current-care context. Scheduled identity is never
replaced by the patient actually in service. Ongoing care means an explicit native in-service queue
ticket, not an appointment time or draft encounter. Another-patient selection reuses native patient
search and consultation setup; switching queue service uses existing transitions and conflict checks.

Keep partial-page and working-hours wording honest: empty space does not establish bookability.
The one synthetic desktop/phone pass found clipped secondary status text on short booking blocks;
CALENDAR-001 records this without a repair loop. Native authenticated acceptance remains open.


## Weekly/month refinement — October21

Appointments now defaults to Month, retaining Day/Week/Agenda. Full scoped daily counts and up to
three previews are separate from the paged day/agenda response. Patient previews open the native
booking details; date/count opens a day. Working-hours disclosure names booked patients/time/status
without claiming free capacity. Weekly availability uses seven independent day rows in one bounded,
atomic save; compatible existing weekdays share editing while split shifts remain separate.
Unselected rows are unchanged, with disabling an existing window explicit. Specific-date opening
or closure uses native versioned overrides. Shared DurationChoice gives presets and Other, while
DateInput and scheduling labels use written month/day/year and retain native ISO values.

Keep existing white/navy/teal tokens, authored FormSelect/Switch, shared fields, safe sheet close
and operation feedback. Calendar scrolling belongs to the calendar, not the page shell. Short
appointment blocks show essential time/name; full metadata remains in details/accessibility text.
One synthetic desktop/phone visual pass only; authenticated acceptance is CALENDAR-002.


## Schedule reference refinement — October21

Provider schedules follows the supplied reference's content hierarchy within the existing shell:
header calendar/add actions, branch selection, section navigation, compact week/provider table and
saved weekly windows, then resource/date-override panels. These are in-page section links, not
unmounting tabs. Use circular initials for available name-only provider data; do not fabricate photos,
specialties, resource types or named schedule templates. Show precise native window effective dates.

Week navigation keeps written dates and native override/effective logic. Provider menus open scoped
availability or filter saved windows. Search/clear and resource menus reuse native operations; resource
add/rename uses a guarded dialog. Existing multi-day and date-override owners retain confirmation,
versions/reservation checks and dirty guards. Section styling is a ScheduleSection variant; other
operations pages retain their established sections. EntrySheet accepts ReactNode triggers only.

One synthetic desktop/phone visual pass: desktop/reference hierarchy and local controls observed;
phone page overflow remains SCHEDULE-REF-001, native saves/permissions SCHEDULE-REF-002. No repair or
second pass. See docs/operations/schedule-reference-ui-verification.md for actual evidence and limits.


Schedule portrait repair: operations setup now carries the current authorized staff photo ID.
Weekly/saved rows reuse compact StaffAvatar with circular image framing and initials for absent/
failed images. Do not substitute patient-document imagery. Private endpoint rechecks native provider
visibility; uploads/selection remain Staff & Access. Native image authorization acceptance stays
SCHEDULE-PHOTO-001; see schedule-provider-photo-verification.md. Existing phone overflow is unchanged.
