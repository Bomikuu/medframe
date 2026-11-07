# Phase 4 — Schedules, appointments and room continuity

October22,2026. Native implementation of the authorized next roadmap phase, without subagents, builds, automated tests, typechecks, lint suites or benchmarks. Prettier formatted supported source files; Ruff formatted the launcher. The existing Django data/authentication/permission and mutation owners remain authoritative.

## Changes

- Phone/tablet schedules show a selected day and circular provider identity, actual hours, date-override/closure wording and existing availability/saved-window actions. Desktop keeps the weekly table. Both use `scheduleHours` with the existing closure/override/effective-date precedence.
- Schedule sections and the weekly table scroller establish positioning boundaries. The pre-edit native phone probe measured document client375/scroll968; the hidden Provider actions label sat at x967 despite the table's scroller being341px wide. Containing those absolute labels fixes the demonstrated page overflow without changing the preserved clinic-shell width snippet.
- Existing bounded month cells/day dialogs and native permission/version checks remain. Appointment details add the recorded visit reason, complete start/end time and clinic timezone.
- Room information uses private snapshot names with shared identity placeholders; no unauthorized photo endpoint was added. Instant rooms show Created and manual closure, scheduled rooms show Appointment time and their actual closing time. The waiting-room admission banner uses semantic info colors and includes patient/provider identity context.
- `useRoomUpdates` accepts the native refresh frame, coalesces invalidations for250ms, refreshes visible disconnected rooms on a five-second fallback, and uses a30-second safety snapshot for a quiet connected socket. Focus/visibility return catches up.4403 stops reconnecting and triggers reauthorization. `useCallRoom` serializes pending snapshots with a queued follow-up, ignores old request generations and asks Django to confirm expiry rather than ending a possibly extended room from an old local clock. Server participant/admission/expiry/media authorization is unchanged.
- Launcher environment now supplies the operations socket address from the selected API port/public origin. The dormant hook no longer guesses an HTTP-development port8000. Clinic appointment/queue live hooks stay unmounted; the remaining portal appointment/queue hook was also removed to honor the user's temporary manual-update policy. Portal focus refresh is disabled and the shared Refresh control replaces live-status wording. Portal runtime acceptance was not sampled in this pass.

## Preservation and review setup

Fresh encrypted checkpoint: `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261022-224415-a89bd41`; isolated restore clone `medframe_django_phase4_20261022_53f9c2`,167 tables verified, source_written=false. Exact pre-edit files are in private ignored `.medframe-runtime/improvements-phase4-source`; other dirty work remains intact. No backend product/schema/migration/original-account/MFA/permission/private-storage change.

A new synthetic clinic, doctor, patients, seven weekly windows, one date closure, six appointment rows across two clinic days and scheduled/instant rooms supported native visual review. Room creation/join/regeneration/admission used existing services. Review staff assurance was fixture-prepared, not an MFA acceptance exercise. Temporary localhost-only routes opened actual product routes inside credentialless iframes, leaving the user's browser session unchanged. No camera/microphone permission, real message, file, payment, email, SMS or AI operation was performed. An unsent synthetic chat draft stayed local.

## Bounded visual evidence

One focused pre-edit diagnostic probe and one final batched native review; no product repair/retest loop after that final review.

- At390×844 the schedule client/scroll widths both became375px. Friday's closed override appeared instead of weekly hours; day navigation and the existing Add weekly availability form worked. The form preselected the correct provider and was closed without changes. A768px sample retained the day list;1280px retained the week grid and document client/scroll1265/1265. Same closure appeared in both presentations. Narrow screenshot: private ignored `.medframe-runtime/improvements-phase4-schedule.jpg`.
- Native appointment calendar retained a176px month cell with three same-day rows, View all/day-modal navigation, patient/provider placeholders and manual refresh. The synthetic rows straddle midnight, so this is three-per-day coverage, not a five-per-day claim. Details displayed the reason/timezone/full interval and native Edit appointment opened the existing reschedule form with patient/provider and duration suggestions. No booking/reschedule save was submitted. Phone calendar document client/scroll375/375.
- Native patient waiting view displayed instant-room wording, identity placeholders, admission status and local-device-check instructions. The camera preview was not started. Doctor room information displayed Created with the actual reference timestamp and When the doctor ends the room. Scheduled public entry displayed its written appointment date, ten-minute opening window and reschedule link. Scheduled private room-information layout was not separately sampled.
- The probe doctor had already joined from another credentialless browser, so the first final doctor join correctly returned ROOM_OCCUPIED. The synthetic manager regenerated that room's access through its native service; private proofs then retained the review browser identities. This fixture correction is not an access-boundary repair. The subsequent doctor view showed the patient lobby; Admit patient moved the patient from waiting to the appointment workspace. The doctor's exact unsent composer text remained through the resulting snapshot refresh. No call was started and no media flowed.
- Connection-lost warnings appeared in the patient room; API log inspection also found Redis channel-layer TimeoutError entries. The final doctor/schedule console samples contained no errors, but the warning/transport problem prevents a clean call-flow acceptance claim. No causal diagnosis or Redis repair was attempted. See IMPROVEMENTS4-001.

Remaining acceptance: no forced network/reconnect race, snapshot-request count comparison, extension-at-deadline, revocation/4403, physical-device media, internet DNS/HTTPS/TURN, portal manual refresh, dark/custom theme contrast or exhaustive long-name/keyboard acceptance. The source removes unconditional connected polling, but no measured performance improvement is asserted. Initial runtime observation established room entry/socket activity, not request-volume baselines.

## Graphify, Jev and design guidance

Initial existing root graph query: `graphify query 'ScheduleWeek AppointmentMonth AppointmentDetails PatientWaitingRoom useCallRoom useOperationsLive' --budget 1000`;1150-node stale corpus matched only useOperationsLive, found87/shown31/cut56. Source inspection resolved newer file relationships.

Refreshed local AST corpus staged21 relevant files, including unchanged calendar/native socket consumers and the extensionless launcher. Graph result106 nodes/247 edges; extensionless launcher extraction is not claimed, and its environment was inspected directly. Query `graphify query 'ScheduleWeek ScheduleDay scheduleHours useRoomUpdates useCallRoom RoomInformation' --budget 1000` found44/shown36/cut8. This is focused source coverage, not whole-repository or behavioral proof. No LLM/private attachment graph extraction.

Jev CLI0.7.0 auth-status returned ok:true without exposing a key. Sanitized choice compared focused reuse/coalescing/manual calendars against an architecture rewrite/live calendar activation. Modeljev-1.14.0 selected focused, confidence1.0, usage420 input/31 output. No patient data, identifiers, credentials or private attachments were sent; output is prioritization, not verification.

Impeccable context launcher failed with Permission denied; the failure was disclosed, and PRODUCT/DESIGN plus Operate/adaptation/craft-floor guidance were read directly. Existing white/navy/teal tokens, readable code, written dates and circular identity placeholders remain the visual authority. No new style system.

## Cleanup and local activation

Temporary review routes/configuration, fixture access and frontend runtime outcome are recorded below after cleanup. Root `./medframe` retains ownership; only the frontend is restarted with `.next-local-dev`. Existing API8001/worker/scheduler/media and unrelated port8000 remain untouched. This is local activation, not public deployment or live-call readiness.

### Cleanup and activation confirmed

Both synthetic rooms ended through native services (zero open synthetic room rows); synthetic clinic/user/membership deactivated and session revoked; metadata expired. Temporary review routes were removed and their source preserved privately. Exact pre-phase Next configuration restored. Review tabs closed and viewport reset. Original identities and private storage were untouched.

`./medframe stop --only frontend` and `./medframe start --only frontend --dist-dir .next-local-dev` completed: web PID684061, Ready http://localhost:3000, API http://127.0.0.1:8001. Launcher status confirms API180925, worker181113, scheduler181114 and media181115 running. Read-only inspection of the active frontend's three public connection URL ports confirms8001 for backend/operations/calls, without printing its other environment values. No build was run. Infrastructure reports healthy, which does not close the observed Redis/application transport warning.
