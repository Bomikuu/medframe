# Appointments live updates and shared person identities — October 21, 2026

## Request and implementation

Repair repeated live refreshes without replacing the native appointment owner; show doctor and
patient photos or circular placeholders in calendars and person fields. No build, automated test,
typecheck or lint suite was run. Work stayed native in this chat, without agents.

Source inspection found refreshes on socket open, every message (including the server greeting),
close, polling and an extra focus listener. Appointment details replaced their contents whenever a
background snapshot was loading. The shared live hook now validates changed frames, deduplicates
monotonic revisions, batches invalidations at750ms, ignores greetings/unknown frames, removes the
extra focus listener and does not reload on ordinary close. Reconnect catch-up is bounded to once
per30seconds; a4403 rejection reauthorizes once and stops reconnect/poll work. Socket handlers ignore
stopped/stale connections. Appointments disable polling while connected; disconnected fallback
remains30seconds. Queue/portal callers retain their30second estimate polling. Native useRemote still
owns focus catch-up, errors, cancellation and existing scope behavior.

Appointment details stay mounted with a small update status; a disabled fieldset and inert content
block stale actions until the latest snapshot arrives. Mutation versions and all native operation
owners remain unchanged. Month/day/week/agenda bookings, in-service rows and working-hour context
show both identities. Short time blocks keep both small circular avatars visible; full doctor name
remains in the existing accessible label/title when its separate text line does not fit.

PersonAvatar/PersonIdentity and FormSelect's typed person metadata own consistent framing and
initials. Selectors preserve full labels/reference numbers and Radix typeahead text; empty/group
sentinels stay plain. Shared person selectors cover booking, provider filters, schedules, consultation
start, invoice creation, services, diagnostics, communications, kiosk verification/booking, clinician
handoff, portal connections and registration matching. Read-only identity fields were also updated
in consultation cards, profile activity/appointment actions, billing/payment, service cases,
diagnostics, communications, kiosk and queue-display/portal views. Existing adjacent avatars in
patient directories/editor/anatomy headers were retained. These broader surfaces were source-reviewed
and formatted, not individually browser-accepted.

Staff photos reuse the existing private StaffAvatar and current provider portrait pointer. Patient
photos reuse the selected clean same-patient portrait/document reader; missing/loading/failed patient
images now show initials. Batched staff appointment/queue enrichment includes calendar previews and
tickets. Patient portrait metadata is limited through native clinical patient scope; absent authority
produces placeholders, not new grants. Operations setup exposes that same optional scoped pointer.
Existing patient-portal response serialization is not expanded with staff-only image IDs. Other
surfaces without portrait metadata deliberately use initials. No migration, role/grant/account/photo
change, messaging, AI or payment action was made.

## Actual tools

- Existing root Graphify query `useOperationsLive useRemote AppointmentAgenda`, budget450:1150-node
  older graph;537neighbors,13shown, truncated. Source tracing corrected the stale path assumptions.
- Focused AST corpus: live hook, appointment/calendar/detail/booking/queue, shared identity/select/
  private image controls and relevant API/portrait owners plus updated surfaces. Initial225nodes/
  516edges; final refreshed corpus257nodes/599edges, including the optional-poll signature.
  Query `useOperationsLive PersonIdentity attach_portraits`, budget450:105neighbors,13shown,
  explicitly truncated. Native source is authoritative; this is not whole-project graph coverage.
  Private output `.medframe-runtime/appointments-identity-graph`.
- Jev choice, sanitized generic engineering state only: shared scoped owner approach versus calendar
  cosmetics. Modeljev-1.13.0 chose`shared`, confidence1.0;396input/33outputtokens. This informed scope,
  not verification. No credentials, identities or private images were submitted.
- Prettier formatted changed TS/TSX; Ruff format formatted four Python files. One initial formatter
  command used `.tsx` for the two `.ts` hooks/schema; the explicit file manifest corrected this.

## One bounded visual pass

A temporary local-only presentation rendered the real month/day calendar, FormSelect, avatars and
live hook with synthetic names and a local simulated socket. In Codex IAB:

- At1440×1050, initial connection/greeting showed0snapshot reloads. One changed revision produced1;
  repeating the same revision and a greeting did not increment it. Selected appointment and typed
  unsaved text stayed present. This demonstrates the hook/presentation behavior, not native clinic
  WebSocket authentication or transport.
- Desktop screenshot showed circular patient/doctor placeholders in both selectors and a30minute day
  block. Patient menu entries retained names and clinic references. Month booking exposed both names.
- At390×844, selectors stacked with circles and the day calendar retained its contained scroller.
  Read-only DOM width measurement: document375,viewport390. The final scroll moved the calendar to
  later hours; the appointment itself was not separately captured on phone. No full responsive
  calendar/clinic-shell acceptance claim.
- Private authenticated photo success, exact access-denial cases, genuine live reconnect/mutation,
  stale-detail action denial and every other migrated surface remain open as APPOINTMENT-LIVE-001.
  No additional browser pass or repair of unrelated deferred findings was performed.

The temporary route was removed and its source retained privately as
`.medframe-runtime/appointments-identity-presentation.tsx`; review tab closed and viewport reset.

## Preservation and activation

Per-file prior source copies: `.medframe-runtime/appointments-identity-before`; current source copies:
`.medframe-runtime/appointments-identity-source`. Unrelated work and clinic-shell width snippet stay
untouched. A stopped launcher checkpoint initially encountered the known port3000 TIME_WAIT guard;
no unmanaged process was killed or guard bypassed. The later normal attempt succeeded:

- Encrypted checkpoint `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261021-150717-a89bd41`.
- Isolated restore `medframe_django_appointments_identity_20261021_070716_2ee209` verified167tables;
  source_written=false. No migration or restore over original.
- `./medframe start --dist-dir .next-local-dev` activated original `medframe_django`: API1296233,
  worker1296446, scheduler1296447, media1296448, web1296855. Launcher status reported all running.
  Later source-only refinements use the same serving dev artifact. No public deployment.

Rollback is selected source restoration and a launcher restart, not database/schema rollback. Never
restore all prior files over unrelated user edits. Older SCHEDULE-REF-001 overflow and other deferred
findings remain unchanged.
