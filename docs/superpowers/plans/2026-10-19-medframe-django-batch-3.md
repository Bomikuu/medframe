# Medframe Batch 3 — Clinic Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **User override:** implement natively in this chat, with no subagents, independent agent reviews, or separate chats. The quoted generic header does not authorize delegation. This is one integrated batch; task commits are internal checkpoints.

**Goal:** Connect provider schedules and availability to booking, check-in, staff queues, honest wait estimates, and private real-time patient monitoring.

**Architecture:** Add `medframe_apps.operations` to the existing Django modular monolith. Transactional services own reservations, appointment/queue state, permissions, receipts, events, and branch revisions. Existing separate GraphQL schemas deliver staff and patient snapshots; Django Channels/Redis sends opaque invalidations after commit.

**Tech Stack:** Existing Django 5.2/ORM/PostgreSQL, Strawberry, native sessions/MFA, Redis, Next.js App Router, TypeScript, Tailwind, shadcn/Radix, RHF/Zod; add compatible locked Channels and channels-redis dependencies only when executing.

**Spec:** `docs/superpowers/specs/2026-10-19-medframe-django-batch-3-design.md` — user approved October 19, 2026.

## Global Constraints

- Work natively in this chat without subagents.
- Keep checks targeted; record failures in `docs/operations/error-log.md` and defer repairs until requested.
- The existing clinical encounter remains authoritative. Appointment creation, check-in, queue transitions, cancellation, and absence do not create, finalize, amend, or delete a consultation.
- Default appointment duration is 30 minutes, configurable from 5–240 minutes in five-minute increments.
- Windows do not cross midnight; staff create two windows when needed. No overbooking option.
- Availability queries cover at most 31 local dates; list pages return at most 50 rows with signed, scope-bound cursors.
- No billing, payment collection, SMS, automated clinical follow-up, public booking site, or general anatomy work belongs to this batch.
- Preserve credentials/MFA, sessions, administrator/Dentist roles and provider profile, explicit patient grants, portal invitations, clinical data, existing checkpoints, and saved builds. No push, deployment, source reset, or checkpoint deletion.
- Use readable focused files, existing real shadcn/Radix controls, Tailwind, Prettier, and Ruff. Circular avatars; clinical media retain full framing. Read the installed Next.js guides and applicable UI skills before implementation.
- Existing Django remains on 8000, native web on 3000, and active Celery broker on Redis DB 2. Do not switch job environments or consume another environment's jobs.

## Review Focus

1. One clinician with multiple memberships/provider profiles must not receive overlapping reservations across branches or clinics; use the clinician's User ID as the global reservation identity. Task 2 pins it.
2. Two staff members checking in the same booking, or simultaneously calling/starting tickets, must not duplicate tickets or reserve a provider twice. Task 4 pins it.
3. A schedule edit or resource deactivation must not orphan an existing future reservation. Task 2 pins it.
4. A revoked guardian relationship or expired/revoked ClinicalSession must deny snapshots and close a socket even when its browser stays open. Task 6 pins it.
5. Queue carryovers, scheduled breaks, and an overrun must produce conservative estimates or an explicit unavailable state, not negative/stuck live times. Task 5 pins it.

## File boundaries and shared contracts

Backend: `services/api/medframe_apps/operations/` contains `models.py`, `apps.py`, `admin.py`, `inputs.py`, `policy.py`, `scheduling.py`, `reservations.py`, `appointments.py`, `queue.py`, `estimates.py`, `events.py`, `realtime.py`, `consumers.py`, `routing.py`, `serializers.py`, and additive `migrations/`. Split files further by responsibility if needed; no broad refactoring of existing clinical domains.

GraphQL: new `services/api/api_graphql/operations.py` and `portal_operations.py`, composed into the existing staff and portal schema classes. Existing request realm guards remain the entry boundary. New operations are generated independently into the current staff and portal clients.

Frontend: `apps/web/features/operations/` owns staff schedule settings, availability/booking forms, agenda, queue, setup blockers, shared operation schemas, and live status. `apps/web/features/portal/operations/` owns the patient appointments/queue views. Reuse existing remote-data, workspace, dialog, feedback, dirty-state, and portal-link owners.

Service inputs are validated Pydantic models in `inputs.py`; UUIDs are UUID objects, instants are aware datetimes, and persisted timestamps use UTC. Services receive `request` where a session realm is needed and never trust organization/branch/patient/provider IDs from an unvalidated payload. Public snapshots use explicit allowlists and ISO strings. `DomainError` preserves the existing error format.

## Task 1: Preserve Batch 2 and establish operations authority

**Files:** new `operations/{__init__,apps,policy}.py`, `tests_django/test_operations_policy.py`; modify `config/settings/base.py`, `organizations/policy.py`; create operations permission migration with dependencies on existing organization/provider/portal state. Evidence: `docs/operations/django-batch-3-verification.md`.

**Interfaces:** `require_operations(request, organization_id: UUID, permission: str, branch_id: UUID) -> Membership`; `require_provider_scope(member: Membership, provider_id: UUID) -> ProviderProfile`; `consultation_setup(request, organization_id: UUID, patient_id: UUID, provider_id: UUID, branch_id: UUID) -> list[dict]` returns explicit blockers with `code`, `message`, and authorized `action`.

- [ ] **Step 1:** Create `checkpoint/django-batch-2-2026-10-19` at the completed Batch 2 code/history, then branch `codex/django-clinic-batch-3` in this checkout. Check names first; never force-overwrite an existing ref.
- [ ] **Step 2:** With `DJANGO_DATABASE_NAME=medframe_django`, run the established `scripts/checkpoint-django.py --clone medframe_django_batch3` through the API uv environment before any database mutation. If that clone name exists, choose a new unused suffixed rehearsal name; never overwrite a database. Save its actual private path in evidence. Its historical `pre-batch2-` filename is documented, not silently renamed or treated as a failed backup. Retain the current web artifact and all prior checkpoints.
- [ ] **Step 3:** Add policy assertions to the focused operations tests: receptionist operational read without clinical notes; clinician own-provider scope; cross-branch/tenant denial; patient realm denial on staff services; all setup blockers reported without creating profiles/grants automatically. These assertions run at the integrated checkpoint in Task 8.
- [ ] **Step 4:** Implement the three interfaces and an additive migration granting administrators all four operations permissions, receptionists `operations.read`, `appointments.manage`, `queues.manage`, and doctors/dentists those same three under own-provider restrictions. Keep `schedules.manage` administrator-only. Update new-role defaults without changing existing unrelated permissions.
- [ ] **Step 5:** Commit the authority/service slice. Record actual work state; it is not an activated Batch 3 release.

## Task 2: Schedules, finite resources, and collision-safe availability

**Files:** new `operations/{models,inputs,scheduling,reservations}.py`, `migrations/0001_initial.py` and subsequent integrity/permission migrations as generated, `tests_django/test_operations_scheduling.py`, `tests_django/test_operations_concurrency.py`.

**Interfaces:** `save_schedule(request, organization_id: UUID, data: ScheduleInput, request_id: UUID) -> ProviderSchedule`; `save_resource(request, organization_id: UUID, data: ResourceInput, request_id: UUID) -> BranchResource`; `available_slots(request, organization_id: UUID, data: AvailabilityInput) -> list[dict]`; `claim_reservation(owner, provider: ProviderProfile, patient: Patient, resource: BranchResource | None, start, end) -> Reservation`; `release_reservation(reservation: Reservation) -> None` are internal transactional primitives. Portal wrappers later call the same availability core after validating their live link.

- [ ] **Step 1:** Define models: `BranchOperationsSettings` (30-minute default, version); `ProviderSchedule` (provider/branch, weekday, effective dates, local start/end, version); `ScheduleOverride` (branch, optional provider, date, closed/open override windows, version); `BranchResource` (branch, name, active, version); `Reservation` (provider user, patient, optional resource, clinic/branch, half-open `DateTimeRangeField`, active, mutually exclusive appointment/ticket owner); and append-only operational events. Provider/resource FKs and redundant scope fields get database consistency enforcement, following existing domain integrity migrations.
- [ ] **Step 2:** Add exact test assertions for 5/240-minute acceptance, 0/241-minute rejection, 30-minute default, five-minute increments, 31-day cap, adjacent intervals, closures, explicit-offset DST resolution, ambiguous/nonexistent time rejection, and no cross-midnight windows. Future-booking schedule changes and resource deactivation return conflicts rather than changing reservations. Two concurrent different-profile bookings for the same User must leave exactly one active overlapping reservation.
- [ ] **Step 3:** Implement `btree_gist` plus active range exclusion constraints for provider User globally, resource globally, and patient within clinic. Stable sorted advisory locks serialize schedule/reservation mutations; exclusion constraints remain the final guard. Catch integrity conflicts outside the failed savepoint and return a domain conflict, never a partially committed booking.
- [ ] **Step 4:** Implement availability from schedule/override/resource windows minus active reservations. Recurring windows are evaluated per clinic-local date; explicit branch closures win. Do not expose booked patient identities in slot results. Reject schedule changes that invalidate booked or in-service reservations before saving.
- [ ] **Step 5:** Commit the schedules/reservations slice; defer execution of the accumulated focused test group to Task 8.

## Task 3: Versioned appointment management and patient actions

**Files:** new `operations/appointments.py`; extend models/inputs/events; new `tests_django/test_operations_appointments.py`.

**Interfaces:** `book_appointment(request, organization_id: UUID, data: BookingInput, request_id: UUID) -> Appointment`; `reschedule_appointment(request, appointment_id: UUID, data: RescheduleInput, request_id: UUID) -> Appointment`; `transition_appointment(request, appointment_id: UUID, expected_version: int, target: str, reason: str, request_id: UUID) -> Appointment`; `patient_appointment_action(request, link_id: UUID, appointment_id: UUID, data: PatientActionInput, request_id: UUID) -> Appointment`; `appointment_page(request, organization_id: UUID, filters: AppointmentFilters, after: str | None) -> dict`.

- [ ] **Step 1:** Add Appointment with scope, patient/provider/resource, UTC interval, routine/follow_up type, optional same-patient clinical FollowUp reference, operational reason capped at 240 characters, lifecycle status, version, and creator. Reservation is the single collision owner, not a second independently mutable time source. Add explicit before/after event snapshots and request receipts.
- [ ] **Step 2:** Add assertions: successful booking, same-request replay, same-key/different-payload conflict, losing reschedule retains original slot, 50-row scoped paging, stale-version rejection, immutable events, and no clinical record/grant mutation. Deny invalid lifecycle transitions and no-show before booked start. Patient keep/cancel/reschedule only uses the active matching PortalLink, future booked status, same provider/clinic/branch/duration, and fresh availability.
- [ ] **Step 3:** Implement services with transactional authorization, row/version locks, reservation primitives, and append-only attributed events. Cancellation/no-show releases reservations. Do not permit general status edits to bypass queue ownership of checked_in/in_service/completed transitions.
- [ ] **Step 4:** Implement filters by clinic-local date range, branch, authorized provider, and status; use the existing signed scope/filter cursor conventions. Return operational identity/contact fields for staff, explicit own-appointment fields for the portal. No SOAP or clinical source bodies.
- [ ] **Step 5:** Commit appointment services, preserving native encounter creation without appointment dependencies.

## Task 4: Check-in, walk-ins, queue order, and consultation handoff

**Files:** new `operations/queue.py`; extend models/inputs/events and migrations; new `tests_django/test_operations_queue.py`; small existing encounter changes only if an optional validated association requires them.

**Interfaces:** `check_in(request, appointment_id: UUID, expected_version: int, request_id: UUID) -> QueueTicket`; `add_walk_in(request, organization_id: UUID, data: WalkInInput, request_id: UUID) -> QueueTicket`; `transition_ticket(request, ticket_id: UUID, data: QueueTransitionInput, request_id: UUID) -> QueueTicket`; `move_ticket(request, ticket_id: UUID, before_id: UUID | None, expected_version: int, reason: str, request_id: UUID) -> QueueTicket`; `queue_snapshot(request, organization_id: UUID, branch_id: UUID, provider_id: UUID | None) -> dict`; `link_consultation(request, ticket_id: UUID, encounter_id: UUID, expected_version: int, request_id: UUID) -> QueueTicket`.

- [ ] **Step 1:** Model `QueueDay` with clinic-local date, branch, and atomic next-ticket counter; `QueueTicket` with patient, provider intent, optional appointment/resource/encounter, stable display number, checked-in timestamp, operational order/version, delay, lifecycle, service start, and expected duration. Unique appointment linkage prevents duplicate check-ins; enforce at most one in-service ticket per provider User. Append events; no hard deletion.
- [ ] **Step 2:** Add assertions for concurrent double check-in returning one ticket, unique numbering, stable carryovers across midnight, concurrent service-start contention, own-provider enforcement, reorder reason/version requirements, cancellation releasing reservations, and consultation link scope. No queue transition creates/finalizes a consultation or adds clinical grants.
- [ ] **Step 3:** Implement waiting → called → in_service → completed, with explicit waiting/called cancellation/no_show and reasoned called → waiting. Keep linked appointment state synchronized in the same transaction; checked-in cancellation updates its ticket too. A ticket no_show after a booked check-in cancels its linked appointment with an explicit operational absence reason, preserving the appointment state machine; a walk-in ticket has no appointment to change. Appointment no_show remains subject to its booked-time rule.
- [ ] **Step 4:** For booked service starts, update/reuse that appointment's reservation so it cannot collide with itself. For walk-ins, claim a new finite reservation only at service start. Respect future booked intervals; duration extensions use the same checks. Expose a conflict preview and manual delay rather than overriding a booking. Release active reservation on service completion.
- [ ] **Step 5:** Use Task 1's setup blockers before the existing consultation start/link flow. Link only matching patient/provider/branch/clinic with current clinical grants. Commit queue/handoff slice.

## Task 5: Explainable wait ranges and private patient snapshots

**Files:** new `operations/estimates.py`, `serializers.py`; new `tests_django/test_operations_estimates.py`, `test_operations_portal.py`.

**Interfaces:** `estimate_queue(snapshot: EstimateInput, now: datetime) -> dict[UUID, WaitEstimate]` is deterministic and has no authorization/ORM side effects; `patient_operations(request, link_id: UUID, now: datetime | None = None) -> dict`; `patient_available_slots(request, link_id: UUID, data: PatientAvailabilityInput) -> list[dict]`. `WaitEstimate` has minimum/maximum minutes or null, label, basis, and calculated-at time.

- [ ] **Step 1:** Add assertions for assigned-provider queues, two providers with one resource, cancellation/no-show removal, scheduled breaks, future reservations, recorded manual delay, five-minute overrun floor, 75%/125% outward five-minute rounding, zero-wait Up next, unavailable estimates, midnight carryovers, and deterministic output at a supplied clock.
- [ ] **Step 2:** Implement event-time simulation of provider/resource eligible intervals using queue order and expected durations. Project each queued ticket's reservation into the simulation without changing the database. Do not count unavailable clinicians as capacity; return unavailable when no feasible service interval exists that day. Clearly label estimates as setting-based, never measured history or promises.
- [ ] **Step 3:** Add privacy assertions that a portal payload includes only its own appointment/ticket, own position/ahead count/estimate, authorized branch aggregate counts, and updated time; no other patient names, IDs, ticket list, notes, or clinical bodies. Revoked relationships deny every read/action, including availability wrappers.
- [ ] **Step 4:** Implement the allowlisted snapshots and fresh-link patient actions. No public endpoint, anonymous queue identifier, or demographic patient matching. Commit estimator/portal slice.

## Task 6: Channels invalidations and revocation-aware reconnect

**Files:** new `operations/{events,realtime,consumers,routing}.py`; modify `config/asgi.py`, `config/settings/base.py`, `config/runtime.py`, `services/api/pyproject.toml`, `uv.lock`, local environment examples/start instructions; new `tests_django/test_operations_realtime.py`.

**Interfaces:** `bump_branch(branch_id: UUID, kind: str) -> int` increments a persisted BranchRevision within the caller's transaction and schedules an opaque publish after commit; `OperationsConsumer` accepts authorized staff branch or patient link subscriptions at `/ws/operations`; `validate_live_session(scope, realm: str) -> User` reuses the existing native MFA/session epoch, ClinicalSession activity/expiry/revocation, and realm rules. Do not invent parallel auth tokens.

- [ ] **Step 1:** Install compatible Channels/channels-redis through uv once at execution time after checking official current docs. Compose HTTP RequestBodyLimit unchanged with a WebSocket protocol router, native session middleware, explicit configured web-Origin validator, and Channels consumers. Use a dedicated Redis channel-layer prefix/config; preserve current Celery broker DB 2 and shared throttle configuration.
- [ ] **Step 2:** Wire each committed schedule/appointment/queue change to `bump_branch`. Messages contain only kind and branch revision. Derive server group names from authorized scope; never accept raw client group names. Bound incoming message size and subscription rate; do not accept medical or identity data in socket messages.
- [ ] **Step 3:** Add a single focused Channels test group covering forbidden Origin, unauthenticated/non-MFA/wrong-realm connect, cross-branch subscription, revoked guardian, session expiry/auth_epoch change, opaque after-commit delivery, rollback producing no event, and revision recovery after a missed invalidation. Revalidate membership/session/link on messages and at most 30 seconds between checks; cancel timers and group membership on disconnect.
- [ ] **Step 4:** Keep DB commits successful when Redis publication is unavailable; record sanitized infrastructure failure and retain DB revision for reconciliation. Expose disconnected status and HTTP snapshot fallback, never unbounded retries or a promise of guaranteed delivery.
- [ ] **Step 5:** Document native transport: configured browser WebSocket URL `ws://localhost:8000/ws/operations` for local non-HTTPS, web Origin `http://localhost:3000`, host-scoped existing session cookies. Hosted same-origin `wss` routing is a documented later deployment configuration, not a claimed Next.js HTTP proxy upgrade. Commit real-time slice.

## Task 7: Separate typed contracts and connected staff/patient interfaces

**Files:** new `api_graphql/{operations,portal_operations}.py`; modify existing `schema.py`, `portal_schema.py`, export/codegen configs only as needed; new `apps/web/lib/graphql/operations.graphql`, `portal/operations.graphql`; new feature modules under `features/operations/` and `features/portal/operations/`; new routes `/clinic/appointments`, `/clinic/queue`, `/clinic/settings/schedules`, `/portal/appointments`, `/portal/queue`; modify `features/workspace/clinic-shell.tsx`, existing portal navigation owner, DESIGN.md/UX-CONTRACT.md only for new durable behavior.

**Interfaces:** staff queries `operationsSetup`, `providerSchedules`, `appointmentAvailability`, `appointments`, `branchQueue`; mutations map 1:1 to Tasks 2–4 services. Portal queries `myAppointments`, `myQueue`, `myAppointmentAvailability`; mutation `myAppointmentAction`. Use existing UUID/JSON typed-document conventions plus explicit Zod payload allowlists. No staff operational query or clinical body is copied into the portal schema.

- [ ] **Step 1:** Implement schema adapters and operation documents without duplicate persistence or permissions. Export staff and portal schemas and generate both clients once after operation documents settle; keep generated files formatted and committed. Portal records and clinical schemas remain independent.
- [ ] **Step 2:** Build schedule/resource settings using weekday/effective dates/local windows, closure overrides, configured duration, and version-aware Save/Cancel. Show affected booking conflicts rather than automatically rescheduling. Use current form primitives and date/time fields sized for expected input.
- [ ] **Step 3:** Build the daily staff agenda with branch/date/provider/status filters, authorized patient selection, booking and grouped reschedule confirmation, cancellation/no-show confirmation, request receipts, and retained input on conflict. Primary navigation labels are Appointments and Queue. No drag-only calendar.
- [ ] **Step 4:** Build staff queue with ticket/state/delay, manual move controls/reason, booked check-in and walk-in creation, service conflict preview/extension, and setup-blocker summary before clinical handoff. Reuse the existing patient-specific grant-management action for administrators; do not add automatic grants or imply receptionists can view notes.
- [ ] **Step 5:** Build patient My appointments/My queue with the existing relationship switcher, own keep/reschedule/cancel, aggregate busyness, position/ahead count, honest range/update time, and contact-clinic states. Preserve mobile, keyboard, current theme/density, dirty forms, loading/empty/error/retry/conflict behavior.
- [ ] **Step 6:** Add `useOperationsLive` using the configured WebSocket URL, opaque revisions, coalesced refresh, bounded exponential reconnect up to 30 seconds, focus refresh and 30-second visible polling fallback. Always fetch a snapshot on reconnect and relationship/branch change; tear down old sockets/subscriptions/timers. Mark disconnected/stale data visibly and refetch after authority errors.
- [ ] **Step 7:** Prepare one synthetic Playwright journey in `apps/web/tests/operations.spec.ts` with a dedicated Django fixture in `services/api/tests/e2e_operations_seed.py`; use native provisioning to include role/profile/branch/grants together. Do not modify original admin credentials or reuse inaccessible random test passwords. Commit UI/contracts as an integrated feature checkpoint.

## Task 8: One focused verification checkpoint and safe native activation

**Files:** modify `docs/operations/django-batch-3-verification.md`, `docs/operations/error-log.md`, PRODUCT.md; update existing CI/Docker/native-start configuration for Channels/transport only where required, without claiming unrun container/hosted checks.

**Interfaces:** consumes all preceding deliverables; produces an honest evidence document identifying implemented features, actual check outcomes, checkpoint/migrations, remaining defects, and activated/not-activated state.

- [ ] **Step 1:** Use the retained rehearsal clone, not original data: set `DJANGO_DATABASE_NAME=medframe_django_batch3` (or the actual unused suffixed clone), `REDIS_URL=redis://127.0.0.1:56379/4`, `CELERY_BROKER_URL=redis://127.0.0.1:56379/5`, and a distinct `medframe-batch3-test` channel prefix for test commands. Start no worker against original jobs. Django creates its separate `test_` database. Run the accumulated domain tests once against real PostgreSQL and isolated test Redis configuration: `uv run --project services/api python services/api/manage.py test tests_django.test_operations_policy tests_django.test_operations_scheduling tests_django.test_operations_concurrency tests_django.test_operations_appointments tests_django.test_operations_queue tests_django.test_operations_estimates tests_django.test_operations_portal --keepdb`. Expected outcome: assertions pass; any failure is logged and its repair deferred. Missing modules during implementation are not counted as successful verification.
- [ ] **Step 2:** Run `tests_django.test_operations_realtime` once through the same management command. Verify actual opaque Redis delivery and reconnect behavior, not merely consumer imports. Keep API/development/test broker namespaces separate.
- [ ] **Step 3:** Run one integrated type/lint/format/migration-drift checkpoint: `npm run typecheck`, `npm run lint`, Prettier on changed supported files, `uv run --project services/api ruff check services/api/medframe_apps/operations services/api/api_graphql services/api/tests_django`, and `manage.py makemigrations --check --dry-run`. Record exact failed commands and sanitized output; do not expand into repeated broad testing or repair loops.
- [ ] **Step 4:** If core authority/reservation tests permit safe continuation, run one production frontend build and the one connected synthetic operations browser journey against a separate rehearsal database. Cover administrator schedule/resource → receptionist booking/reschedule/check-in/walk-in → clinician queue/setup handoff → verified self/guardian own queue and keep/cancel/reschedule, actual socket refresh/reconnect, and one narrow viewport. No full historical browser/backend suite, vulnerability audit, or unnecessary package reinstalls by default.
- [ ] **Step 5:** If a core check fails, preserve the running Batch 2 web/API artifact and label activation blocked; independently completed source remains reviewable. Do not migrate active data or assert completion while a safety/integrity blocker remains. User-requested deferred fixes are separate work.
- [ ] **Step 6:** If activation is safe, take a fresh encrypted checkpoint after pausing writers briefly, apply only additive migrations to original `medframe_django`, retain the original web artifact, and restart the native API/web with Channels configured. Resume original worker/beat without broker changes. Do not restore rehearsal over original. Record migration names and basic readiness/login results; the rehearsal journey need not be repeated in full on the active database.
- [ ] **Step 7:** Commit the final code/evidence and confirm clean status. Report actual local URLs and scope, check counts without exaggeration, deferred issues, and whether Batch 3 is running. Do not mark later billing/diagnostics/anatomy/site work complete.

## Planning self-review

The ten roadmap capabilities map to Tasks 2–7; Task 1 preserves and authorizes them; Task 8 verifies and activates them together. All five Review Focus conditions have explicit assertions in their owning task. Portal/staff contracts are separate; queue state and linked appointment transitions share transactional ownership; reservation collisions use provider User across profile boundaries. Expected red-test/repair loops from generic plan templates are replaced by one accumulated verification checkpoint per the user's explicit testing preference. No product code or migration has been applied while writing this plan.
