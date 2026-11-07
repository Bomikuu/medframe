# Appointment editing and dated room recovery — October 21, 2026

## Implemented

The user reported that appointments could not be edited and requested an explicit appointment date
in the early-room notice plus a Request reschedule action. This bounded repair reuses native booking,
portal authorization and call-window policy. No new pending clinic-review queue is introduced.

- Calendar details and agenda now expose **Edit appointment**. It opens a focused dialog instead of
  rendering the form below the calendar. Existing permission and booked-status restrictions remain;
  viewing-only access and non-editable statuses have explanatory copy.
- BookingForm starts from the appointment's clinic-local date, duration and current time. The modal
  calls the original versioned reschedule action and closes directly on success. Date/time/duration
  are editable; patient, provider and resource remain assigned. Cancel/close use the existing dirty
  guard. Existing online room access must still be regenerated after a time change.
- Optional `appointment_id` in native availability input is authorized through appointment_scope,
  then checked against requested organization/branch/provider/resource and booked status. Only that
  reservation is excluded; other provider/patient/resource conflicts stay in scope. No database
  migration is needed. Availability for new bookings retains its existing behavior.
- Removed incorrect provider-photo metadata from room-resource options introduced in the preceding
  identity patch while touching this editor. Resources remain ordinary room/chair choices.
- RoomEntry shows the full written appointment date/time, clinic timezone and exact ten-minute-early
  opening date/time. Public room summary now includes timezone, without new patient identity fields.
  Backend ROOM_EARLY also states both dates and directs Request reschedule.
- Request reschedule links to `/portal/appointments?room=<opaque room id>&reschedule=1`. Only a booking
  already returned by native patient authorization can match. It scrolls to and opens the existing
  future-booking reschedule fields; the one-shot flag is consumed so saving does not reopen them.
  Wrong patient/clinic selection gets guidance. No booking changes until the existing confirmation;
  the link does not submit a request, send a message or grant public edit access.

## Actual tooling and preservation

Native work, no agents. Used Impeccable clarification/craft guidance and existing surface context.
Graphify first queried the preceding focused257-node graph for AppointmentDetails/BookingForm/
reschedule/room:84neighbors,17shown at550tokens, explicitly truncated and missing most call code.
Refreshed a focused16-file AST corpus including editor/call/portal and native policy/slot owners:
176nodes/416edges. Query AppointmentEditorDialog/available_slots/RoomEntry/patient found91neighbors,
16shown at500tokens, explicitly truncated. Final extraction refreshed the same176/416 graph after
formatting. Source inspection remains authoritative; not whole-project coverage.

Jev used only sanitized engineering state. Modeljev-1.13.0 chose native scoped repair over public
URL edit bypass, confidence1.0,407input/33outputtokens. This is prioritization, not evidence. No
patient data, credentials or private images submitted. Prettier and Ruff format only; no builds,
automated tests, typecheck, lint suite or external service activity.

Prior source copies: `.medframe-runtime/appointment-recovery-before`; final source copies:
`.medframe-runtime/appointment-recovery-source`. Launcher stopped normally. Fresh encrypted checkpoint
`/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261021-152739-a89bd41` and isolated restore
`medframe_django_appointment_recovery_20261021_072738_8dbf51` verified167tables; source_written=false.
No migration, original account/password/MFA/grant/photo change, source database reset or clone import.

`./medframe start --dist-dir .next-local-dev` activated original medframe_django. API1335208,
worker1335342, scheduler1335343, media1335344, web1335810; final launcher status all running. Existing
unrelated edits and clinic-shell width snippet remain intact. No public deployment. Restore selected
prior source and restart for source rollback; do not restore a database over original data.

## One visual pass and limitations

Temporary synthetic presentation used real RoomEntry/AppointmentRoomSchedule and the editor dialog
frame with representative native controls. It did not mount the authenticated BookingForm owner.
At1440×1000, the room displayed October24,2026 at9:30AM, Asia/Manila, opening9:20AM, and the exact portal
CTA href. The desktop editor opened and Cancel dismissed it. At390×844, room copy/CTA/PIN wrapped
readably; DOM document375 versus viewport390. Initial viewport-transition screenshot was scaled,
then fresh phone capture showed the actual responsive room. Phone editor was visible but its fixture
had horizontal overflow, retained as APPOINTMENT-EDIT-002. Fixture DateInput used defaultValue so its
visible button said Choose a date; native BookingForm uses controlled value, but defaults were not
browser-accepted. No extra visual/repair round.

Authenticated reschedule save, self-reservation exclusion, conflict/foreign-denial cases, dirty guard,
portal deep-link/confirm and regenerated room access were not exercised: APPOINTMENT-EDIT-001. No
claim of complete native or phone-editor acceptance. Broader prior findings remain deferred.

Temporary route removed; fixture retained privately at
`.medframe-runtime/appointment-recovery-presentation.tsx`. Review tab closed and viewport reset.
