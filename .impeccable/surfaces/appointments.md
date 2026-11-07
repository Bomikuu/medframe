# Appointment identities and live continuity

Keep native month/day/week/agenda views, date/provider filters, queue linkage and booking owners.
Both people must be recognizable: circular patient and doctor photos when scoped metadata exists,
otherwise circular initials. Time blocks may pair small avatars; preserve full names/time/status in
accessible labels and titles. Shared person selectors keep complete name/reference text and typeahead.
Group and empty choices are not individual people.

Background updates retain the calendar, selected record and local draft. Show a quiet status within
the existing dialog and disable stale mutations. Ignore socket greetings and duplicate revisions;
coalesce changes, poll the appointment calendar only when disconnected and use existing focus
catch-up. Queue estimate polling remains available to queue/portal callers.

Photos stay private: use current native staff portraits and clinically authorized selected patient
images, never arbitrary clinical attachments or fabricated faces. Missing and failed loads use initials.
No new authorization follows from an avatar.

Evidence/limits: docs/operations/appointments-live-identity-verification.md. Wider live/private-photo
acceptance is deferred as APPOINTMENT-LIVE-001; do not repeat broad checks or repair unrelated findings.

Editing now uses AppointmentEditorDialog with current appointment defaults, native save and scoped
self-reservation exclusion. Room entry makes full appointment/opening dates and timezone explicit,
with a patient-portal Request reschedule link. Link navigation alone does not change the booking or
send a clinic request. See appointment-edit-room-recovery-verification.md; native acceptance and phone
fixture overflow remain APPOINTMENT-EDIT-001/002.

Month cells stay fixed at176px with one small patient/doctor preview. Clicking date/count/View all
opens AppointmentDayList through a scoped exact-day query owner with native pagination; additional
bookings scroll inside the dialog. Keep the month selection unchanged on close. Do not mistake month
previews for the full day. See calendar-day-modal-verification.md for bounded visual evidence/native gaps.
