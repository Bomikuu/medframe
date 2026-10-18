# Medframe Batch 3 — Clinic Operations

Status: design approved by the user on October 19, 2026. Implementation plan prepared for review; no Batch 3 product code or migrations have been applied.

## Purpose and execution

Deliver the Django Edition's ten Clinic Operations capabilities together: provider schedules, availability, booking, rescheduling, appointment management, patient check-in, receptionist queues, wait estimates, real-time updates, and patient queue monitoring. Staff should manage a clinic day while verified patients can monitor and act on their own appointment without learning anyone else's identity.

Work natively in this chat without subagents. Preserve the current accounts, role additions, provider profile, patient grants, clinical records, patient invitations, and Batch 1/2 checkpoints. Keep checks targeted; record failures in `docs/operations/error-log.md` and defer repairs until requested. Never claim a failed or blocked capability is delivered.

The existing clinical encounter remains authoritative. Appointment creation, check-in, queue transitions, cancellation, and absence do not create, finalize, amend, or delete a consultation.

## Approach

Use one `medframe_apps.operations` Django domain with focused scheduling, appointment, queue, estimate, and authorization services. Extend the existing staff and patient GraphQL schemas separately. Use Django Channels with Redis for authenticated invalidation events; clients fetch fresh authorized GraphQL snapshots rather than receiving patient data in broadcast messages.

Alternatives considered: polling alone is simpler but does not satisfy the specification's Channels requirement; GraphQL subscriptions add a second real-time authorization surface unnecessarily. Channels invalidation plus existing queries reuses current session and typed-client ownership. Polling remains a visible reconnect fallback.

No billing, payment collection, SMS, automated clinical follow-up, public booking site, or general anatomy work belongs to this batch.

## Roles and patient boundaries

- Clinic administrators manage branch operating hours, provider schedules, and operational settings. Receptionists and administrators manage bookings and queues in their permitted branches using operational identity/contact data only.
- Doctors and dentists view their schedules and manage their own queue and linked consultations. Starting a consultation still requires an active provider profile and explicit patient clinical grant.
- Operational booking authority does not grant clinical access. Queue assignment never silently creates a patient clinical grant. An authorized administrator uses the existing explicit access-grant action when needed.
- Add explicit `operations.read`, `appointments.manage`, `queues.manage`, and `schedules.manage` permissions through additive role migrations. Administrators receive all four, receptionists receive the first three, and doctors/dentists receive the first three with service-level own-provider restrictions. Provider schedule changes remain administrator-only in this batch.
- A patient session uses a live clinic-verified self/guardian PortalLink for every read and mutation. No patient discovery by email, date of birth, phone, or an opaque queue token.
- Recheck tenant, branch, provider, session realm, membership, and live relationship on every mutation. Existing patient and staff realm separation remains.

Expose setup blockers together: inactive/missing provider profile, wrong branch, missing patient grant, or missing schedule. Describe the exact missing requirement and authorized next action before starting a clinical workflow. Do not loosen permissions to remove a blocker.

## Scheduling and availability

Persist recurring weekly provider windows per clinic/branch, their effective local dates, and dated closures/overrides. Use the clinic's existing IANA time zone; store booked instants in UTC. Default appointment duration is 30 minutes, configurable from 5–240 minutes in five-minute increments. Windows do not cross midnight; staff create two windows when needed. No overbooking option.

Availability is computed from schedule windows minus closures, active bookings, and provider conflicts across branches. Slots are half-open intervals; adjacent appointments are allowed. A provider has one simultaneous appointment or active walk-in reservation. Patient appointments cannot overlap within the same clinic. Availability queries cover at most 31 local dates; list pages return at most 50 rows with signed, scope-bound cursors.

Reject nonexistent or ambiguous local times unless an explicit valid UTC offset resolves them. Show local date, time, zone, provider, branch, and duration in booking and rescheduling confirmation. Schedule edits cannot silently invalidate future bookings: reject a change that conflicts with existing appointments and list affected bookings for manual rescheduling. Do not cancel bookings implicitly.

Represent finite shared capacity as named branch resources with unit capacity, such as a chair or room. A booking may reserve one resource. Provider and resource reservations use PostgreSQL exclusion constraints on active UTC ranges, with additive `btree_gist` enablement. Walk-ins reserve their provider/resource only when service starts; until then their provider assignment is queue intent, not a timed reservation. A walk-in start that conflicts with a booked interval is rejected with an operational explanation, not silently overbooked.

## Appointment lifecycle and concurrency

Persist appointments with clinic, branch, patient, provider profile, optional resource, start/end, type (`routine`, `follow_up`), short operational reason (240 characters), status, version, and attribution. A follow-up can optionally reference an existing same-patient follow-up instruction but never changes its clinical version.

States: booked → checked_in → in_service → completed. Booked may become cancelled or no_show; checked_in may become cancelled. No-show is an explicit staff action after the scheduled start; no automated medical conclusions. A completed appointment indicates an operational visit finished, not that a consultation was finalized.

Rescheduling changes the same booking's slot only while booked, preserving an immutable before/after event and required reason. Patients may keep, cancel, or choose an available replacement slot for their own future booked appointment; same-clinic/provider/service-duration and branch rules apply. Patients cannot change checked-in/in-service appointments; contact-clinic guidance explains that case. Keeping an appointment records an acknowledgement, not a new slot.

Use version checks, request receipts, and transaction-level locks consistently. A reschedule either releases the old reservation and claims the new one atomically or leaves the old slot intact. Double submission replays its original result. Conflicting booking attempts return a human-readable conflict and fresh availability. Lock a stable provider/resource order; database constraints are the final overlap guard.

Keep append-only appointment/queue events with actor and server time. No hard deletion of operational history. Event text and audit bodies exclude clinical notes and unnecessary personal details.

## Check-in, walk-ins, and staff queue

Each branch has a clinic-local service day and a monotonically allocated display ticket. A booked check-in creates at most one ticket; repeat submissions return it. Walk-ins select an existing patient and intended provider, issue a ticket, and work without any appointment. Midnight does not silently discard a waiting patient; open tickets remain visible as carryovers.

Queue states: waiting → called → in_service → completed. Waiting/called may become cancelled or no_show. Calling does not mean the clinician has started care. An explicit return from called to waiting retains the ticket and records a reason. No automatic conversion from elapsed time to no-show.

Default order is check-in time and ticket ID within an assigned provider. Reordering uses explicit move controls, version checks, and a required reason; it is an operational action, not automated medical triage. A clinician is limited to one in-service ticket. Starting service reserves provider/resource time for the configured duration after a conflict preview. Extending service rechecks future conflicts; estimate delays remain visible when a clinician runs late. Completing service releases the active reservation.

Optional linking to a consultation validates the same patient, clinic, branch, and provider. Linking an existing consultation and starting a new one both retain current clinical authorization. Queue completion does not finalize a linked consultation, and clinical finalization does not complete a queue ticket automatically.

Receptionist rows show ticket, patient identity needed for check-in, provider, booking time, status, and delay. Clinical SOAP, diagnoses, documents, and chart findings stay outside operational query types.

## Wait estimates

Return a range, update time, and explanatory confidence label; estimates are never promises. Simulate eligible waiting tickets across available providers/resources using current queue order, expected appointment durations, active-service remaining time, schedules/closures, resource capacity, future reservations, cancellations/no-shows, and recorded manual delays. Respect assigned-provider eligibility rather than dividing waiting count by all clinicians.

Default expected duration is the appointment/provider setting, initially 30 minutes; no invented historical measurements. When service exceeds its expected end, use a remaining-time floor of five minutes plus any recorded delay. The nominal predicted start yields a range of approximately 75%–125% of predicted wait, rounded outward to five-minute bounds; show “Up next” for zero wait. Label these setting-based estimates until measured operational data supports a future estimator.

If no eligible open schedule/resource or a valid future start exists within the day, show “Estimate unavailable — ask reception.” Recompute on queue/schedule events and every 30 seconds while a queue is viewed. Show last-updated and stale states after disconnects rather than frozen values presented as live.

## Real-time confidentiality

Use authenticated same-origin WebSockets backed by Channels and a dedicated Redis channel-layer prefix. Authenticate Django sessions with the existing MFA and realm checks; validate Origin. Do not replace Celery's current broker or consume another environment's jobs.

Messages contain only an invalidation kind and monotonically increasing branch revision, never patient names, notes, positions, or appointment details. Branch staff subscriptions require current operational permission; patient subscriptions derive their own live relationship and permitted branch server-side. Clients cannot select arbitrary broadcast groups.

Authorize on connect, before processing each request, and at least every 30 seconds while connected; close revoked/expired sessions. Refetch queries enforce current authority even if an invalidation was delivered during a revocation race. Publish only after transaction commit. Persist the branch revision in PostgreSQL; a reconnect always fetches a snapshot, recovering from dropped messages or Redis downtime. Coalesce invalidations and bound reconnect backoff. WebSocket failure does not fail committed appointments.

No unauthenticated public calendar or queue endpoint is added in this batch. The patient view can show aggregate waiting/in-service counts for its authorized branch, its own ticket and position, patients ahead as a number, delay, estimate, and keep/reschedule/cancel controls. Other patient identifiers or ticket lists never appear in its schema or payloads.

## Interface

Retain DESIGN.md's white clinical workspace, existing real shadcn/Radix primitives, Lucide, Tailwind, RHF/Zod, and readable modules. Staff navigation gains Appointments and Queue; administrators gain schedule/resource settings. Use an accessible daily agenda with a date/provider/branch filter and a list view as the primary interaction, not a drag-only calendar.

Booking groups patient/provider/branch, date/time/duration, and optional resource/reason. Patient selection uses the authorized directory. Show current slot during rescheduling and preserve form values on conflicts. Confirm cancellations and state transitions with clear consequences; do not hide errors behind optimistic success.

Queue uses a compact operational table with keyboard actions and an equivalent stacked narrow-screen layout. Patient navigation gains My appointments and My queue, using its verified relationship switcher. Keep estimates and delay notices legible with a visible updated-at time. Preserve light/dark preference, focus, loading, empty, permission-denied, stale, retry, and conflict states. Profile avatars remain circular and clinical imagery is unaffected.

## Preservation and bounded verification

Before applying migrations, commit the current completed account-setup log and testing preference, create a Batch 2 Git checkpoint, and take a private encrypted database checkpoint using the established helper. Do not reset the active database, credentials, sessions, or saved builds. Use additive migrations and native services, maintaining broker DB 2 for the active environment.

Perform one focused PostgreSQL test group for interval conflicts, atomic rescheduling/replay, lifecycle/check-in uniqueness, clinic/branch/realm/relationship isolation, and estimate edge cases; use real concurrent transactions only for overlap/reschedule invariants. Perform one focused Channels group for authentication/origin, revocation, opaque invalidations, and reconnect revision behavior. No broad Batch 1/2 suite rerun by default.

Run type, lint, formatting and contract generation once at the integrated checkpoint, plus one production build needed to activate the new UI. Run one connected synthetic browser journey: administrator schedule → receptionist booking/check-in → clinician queue/consultation handoff → verified patient queue/cancel/reschedule, with one narrow-screen check. Verify existing admin/Dentist provider and patient-grant prerequisites before that journey to avoid the prior setup gaps.

On the first discovered defect, record reproduction, impact, and evidence and defer its repair; independent work may continue. Do not repeatedly rerun broad checks. Record failed checks as failures. If a failure prevents safe data activation or makes the core workflow unusable, preserve the running Batch 2 artifact and mark Batch 3 activation blocked rather than claiming completion.

## Delivery criteria

All ten operations capabilities connect to persisted authorized data, including actual Channels updates and explicit reconnect fallback. Appointment/encounter independence, provider/resource concurrency, operational-versus-clinical access, and patient confidentiality remain enforced. Report the exact implemented scope, actual bounded check outcomes, logged defects, migration/checkpoint details, and whether the new phase was activated locally. Later roadmap batches remain separate.
