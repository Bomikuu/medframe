# Provider availability and calendar — October 21, 2026

## Intent and implementation

The user requested doctor availability/schedules and a clickable calendar, using a 9:30 booking as
the example. They explicitly selected both seeing the actual current patient and being able to
start another patient's consultation while preserving the original booking. This extends existing
operations; no new scheduling engine, clinical authorization policy or schema was introduced.

- Appointments has day/week timetables and the preserved agenda, date navigation, provider/status
  filters, clinic timezone, working-hour bands and a configured-hours summary. Week ranges use
  Monday–Sunday in clinic calendar dates. The existing 50-item cursor pagination remains explicit:
  a partial page is labelled, and empty space is never presented as a verified bookable slot.
- Clicking a booking opens its scheduled identity/status and the provider's actual in-service
  ticket(s) in that permitted branch. The current-care snapshot is explicitly current even when
  viewing another calendar date. Appointment time and an open clinical draft are not used to infer
  ongoing treatment. No treatment diagnosis/procedure is invented.
- The same native QueueRow renders compact call/start/complete and clinical-link controls in the
  modal for queue managers. Existing version, idempotency, payment clearance, reservation conflict,
  scope and one-in-service-provider enforcement remain authoritative. The current patient must be
  completed before another queue service starts; completing service does not finalize clinical notes.
- Another-patient search uses the existing branch operations search and opens native consultation
  setup with a permitted provider preselection. It creates notes through the existing owner and
  never relabels the selected booking or automatically transfers queue service. Native clinical
  patient grants and provider checks still apply. Walk-in arrival remains available through Queue.
- Schedules adds a weekly availability table including effective dates and closure/override
  precedence. Operations readers may view their permitted providers; schedule-management permission
  is still required for all configuration forms. The sidebar now exposes this read-only destination
  to operations readers. Existing schedule mutation services are unchanged.

Main source owners: features/operations/{appointments,appointment-calendar,appointment-details,
schedule-week,calendar-dates,schema,queue,schedules}; operations/calendar.py and appointment_page.
New calendar context is opt-in JSON on the existing appointments query, bounded to one–seven days.
No generated GraphQL schema change is needed. Ordinary appointment/portal requests retain their
existing response and filters. Current operational ticket identities use the existing operational
read scope; clinical record opening remains separately authorized.

## Preservation and activation

Native execution; no agents. Before-edit copies for the five initial modified files are private in
`.medframe-runtime/calendar-before-20261021-005217`; later supplemental source copies are also there.
These are source copies, not a new database restore/fingerprint claim. Existing unrelated edits and
the clinic-shell width snippet were retained. No migration, account, role, credential, MFA, patient
grant or original clinical/financial record mutation was performed for this feature or review.

Prettier formatted supported feature sources; Ruff format handled the two Python files. No
production build, TypeScript/lint suite or automated tests were run, following the user's preference.
The launcher stopped/restarted backend services and returned Ready. Active API3932411,
worker3932576, scheduler3932577, frontend3863206 (.next-local-dev), original medframe_django.
Frontend development source updates remain active through the existing launcher-owned process.

## Bounded visual evidence and limits

One batched CUA pass used a temporary synthetic-only component preview, not an authenticated clinic
or imported fixture. Desktop day/week screenshots show a 9:30 sample booking, explicit in-service
styling and configured working hours; clicking 9:30 selected the correct sample identity. A390x844
day screenshot shows contained scrolling and readable time/patient labels. Weekly table content was
present in the accessibility tree. Its off-screen phone rendering was not separately captured.
The preview's selection dialog was synthetic; it does not establish the native care modal's behavior.
The actual /clinic/appointments route redirected this unauthenticated review browser to /login.
The temporary preview was removed and viewport reset after review.

Short appointment blocks clip secondary status lines (including the one-hour sample); accessible
names contain status and the full appointment modal is implemented. Logged CALENDAR-001 without
repair under the user's log-first instruction. Authenticated live data, native modal/search/care
mutations, rescheduling, permissions/revocation, payment/conflict boundaries, mixed providers,
overlapping/overnight/DST edge cases, pagination and reconnect behavior remain unverified. No full
workflow, security, no-console-error or production-readiness acceptance claim.

## Actual Graphify/Jev use

Root Graphify query used appointment/schedule/provider/queue/encounter vocabulary against the
existing1150-node graph;429 adjacent nodes were found and37 shown within1200tokens. Its source paths
were old and the traversal truncated, so direct current-source inspection governed implementation.
A fresh focused code-only AST corpus covers30files,250nodes/803edges under
`.medframe-runtime/provider-calendar-graph/graphify-out`; original root graph retained. A focused
query for calendar_context/AppointmentDetails/QueueRow/windows found148nodes,23shown at700tokens.
Graphify warned about crossing detection/cache roots in one process, parallel extraction from stdin
failed and fell back successfully to sequential, and declarative routing.py yielded no symbols.
An auxiliary interpreter-marker write used a redundant relative path and failed; the actual graph
query succeeded. No semantic extraction or external record upload. This is structural impact
mapping, not runtime or authorization proof; no complete graph-health claim.

Jev0.7.0 auth status returned ok without printing credentials. Planning choice selected reuse of
native queue/consultation owners over overwriting booking identity, confidence1.0, jev-1.13.0,
378input/31output tokens. Final acceptance choice selected presentation-only evidence over a fully
verified native clinical workflow, confidence1.0,395input/31output tokens. Only generic sanitized
engineering state was submitted; no patient data, account identifiers, credentials or attachments.
Jev judgments are not verification. Impeccable used the existing PRODUCT/DESIGN/craft context;
its already-reported launcher failure was not retried or repaired.
