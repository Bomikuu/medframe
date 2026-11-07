# Compact month calendar and day list — October 21, 2026

The user requested that five appointments not enlarge a calendar day, with a click opening a modal
list. Month cells now stay176px high, preview one booking with patient/doctor circular avatars and
retain the native full count. Date, count and View all open a scrollable day modal without changing
the underlying month/date/view. Empty days are supported. Native day/week timeline behavior remains.

AppointmentDayDialog queries the existing authorized exact-day endpoint with the current organization,
branch, provider/status filters and native cursor pagination. It does not reuse the three month
previews as a complete day list. AppointmentDayList owns only presentation: written date/timezone,
status, patient/doctor photos or initials, reference and room. Loaded page rows sort by start time;
native cursor page order remains authoritative, so no global chronological ordering is promised
across pages. First/More controls expose pages beyond50. Shared loading/error and live invalidation
owners remain; background refresh retains content and disables stale selection/actions.

Selecting a row opens existing AppointmentDetails with current ticket context and a Back to day
appointments action. Editing opens the existing native editor. Closing preserves the month calendar.
No backend/schema/auth/role/grant/account/photo changes or external activity.

## Actual evidence and tools

Native/no agents, Prettier only; no build, automated test, typecheck or lint suite. Existing Graphify
257-node corpus query AppointmentMonth/AppointmentAgenda/appointmentPageSchema:51neighbors,13shown at
450tokens, explicitly truncated. Refreshed focused11-file AST corpus:98nodes/220edges. Query
AppointmentDayDialog/AppointmentDayList/AppointmentMonth:43neighbors,13shown at450tokens, explicitly
truncated. Final source refresh retains98/220. This is relationship tracing, not whole-app coverage.
Jev modeljev-1.13.0 selected day_modal, confidence1.0,385input/33outputtokens, using sanitized generic
engineering state only. The judgment is not verification; no identities/credentials submitted.

One desktop/phone visual pass rendered real AppointmentMonth/AppointmentDayList with synthetic rows:
Tuesday one booking, Wednesday five. Both cells remained equal; read-only DOM measurement found all
seven calendar cells176px. View all5 opened a modal listing all five with times/status/person initials.
At1440×1000 and390×844, the list stayed inside its scroll area and footer remained visible. Selecting
the fifth row returned the synthetic selected-booking status. Phone document375px versus390viewport.
No extra browser round. Native authenticated fetching, >50pagination, filters/live/error/permission
paths and detail/edit/back integration were not exercised: CALENDAR-DAY-001. Small inherited singular
copy “1 visits” was visible; logged as002 without a polish repair.

Temporary review route removed; fixture retained privately in
`.medframe-runtime/calendar-day-modal-presentation.tsx`. Review tab closed and viewport reset.

## Preservation and local activation

Prior source `.medframe-runtime/calendar-day-modal-before`; final source
`.medframe-runtime/calendar-day-modal-source`. Unrelated source and clinic-shell width snippet remain
untouched. Launcher stopped normally. The initial checkpoint guard saw port8000 TIME_WAIT; no listener
was present, no guard bypass/unmanaged kill. The subsequent normal checkpoint succeeded:

- `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261021-154354-a89bd41` encrypted checkpoint.
- Isolated restore `medframe_django_calendar_day_20261021_074353_db3f4c` verified167tables;
  source_written=false. No migration or restore over original.
- `./medframe start --dist-dir .next-local-dev` ready, original medframe_django: API1366591,
  worker1366784, scheduler1366785, media1366786, web1367193. No public deployment.

Rollback is selected source restoration with launcher restart, not schema/database restoration.
Older deferred findings remain untouched. Native/no-agent, visual-only and local-activation preferences
continue.
