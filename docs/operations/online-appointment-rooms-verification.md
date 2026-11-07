# Online appointment rooms — October 21, 2026

## Scope and approval

The user requested live two-way doctor/patient appointments with camera, chat, uploads, a patient
PIN and no access after the scheduled end. They selected explicit doctor extensions, reviewed the
written design and said “proceed”. Their initial assigned-or-any-doctor request is supported as
two explicit options with assigned doctor as default. Native execution/no agents, standing local
activation, no production builds/automated tests and bounded visual-only review govern this work.
Spec and native execution plan are in docs/superpowers/{specs,plans}/2026-10-21-online-appointment-rooms.md.

## Implemented

- Existing appointments default to in-person. Native staff booking can select Online and Assigned
  or Eligible clinic doctor. Existing upcoming appointments can create a room in the calendar's
  appointment detail. Patient portal appointments link to the same room entry. Staff management
  displays the saved link and encrypted display PIN, copy controls, refreshed version details and
  explicit access regeneration. No automatic email/SMS was sent.
- New operations models AppointmentRoom/RoomParticipant/RoomMessage/RoomAttachment bind exact
  appointment/patient/branch/time and access generation. One live patient and one live doctor slot;
  a doctor user cannot hold two active room claims. Expired/unauthorized prior claims can be retired
  before a new claim. Existing accounts/passwords/MFA/patient grants/roles are unchanged.
- Patient entry is room PIN possession, not proof of real-world identity. PINs are password-hashed,
  rate limited and redeemed into a room-only HttpOnly cookie. A different browser cannot take the
  occupied role with the same code. Guest access does not replace the normal native/portal login.
  Doctor joining requires native MFA, active provider/membership, branch and clinical patient scope.
  Eligible-doctor claim is serialized, checks native reservation conflicts and explicitly updates
  the appointment's provider; a checked-in visit requires reception reassignment first. No new
  patient grants or credential changes are performed by this flow.
- Entry opens ten minutes early; doctor Start is enforced at or after the appointment time. A
  doctor cannot start while a different patient's native queue service is in progress. Starting a
  room does not finalize notes, charge money or infer completion of a clinical encounter. Doctor
  extensions update the appointment end and its native reservation atomically, checking schedule,
  provider/patient/resource conflicts; total room duration is limited to four hours. Patient cookie
  expiry refreshes with the authoritative end time, without repeating PIN verification.
- Chat uses persisted, request-ID-deduplicated plain-text messages, current history and authorized
  earlier-page retrieval. A dedicated Channels room socket delivers immediate refresh notifications;
  scoped five-second polling/focus refresh is a fallback. Server authorization is rechecked for
  sockets, messages, uploads, downloads, reconnect and room actions. No branch-wide chat broadcast.
- Room uploads support PDF/JPEG/PNG/WebP up to20MiB through the existing metadata/byte validation,
  private storage and ClamAV stream scanner. They use room-specific authorization rather than
  impersonating a doctor through native document write APIs. Pending/unavailable/rejected files
  cannot download. Original bytes remain private; there is no automatic clinical-record attachment
  or patient-portal release. The room supports up to100 attachments. Already downloaded copies
  cannot be recalled when the room ends.
- Camera/audio use the official livekit-client2.23.0 and livekit-api1.2.2. The public SDK receives
  a constant inert placeholder, not a reusable media JWT. A cookie- and Origin-authorized Django
  signaling gateway injects media credentials only upstream, rewrites refresh tokens and removes
  moved-room credential/URL fields. Media identities/names are opaque IDs. No recording/AI/egress.
- A separate launcher-owned native supervisor starts a pinned local LiveKit1.13.10 child. Every
  enforcement cycle rereads native room/doctor authority, removes expired/revoked/unpermitted rooms
  and participants, and renews a three-second Redis health lease. The gateway checks authority and
  health on admission and during signaling. A watchdog kills media if enforcement falls behind;
  Linux parent-death signaling also kills the child if its supervisor dies. Client countdown is
  additional presentation, not the sole time-control mechanism. Normal cycle delay is nominally
  half a second plus database/media API work; the watchdog budget is three seconds. No measured
  two-party disconnect-latency or adversarial bypass claim is established in this phase.
- Appointment cancel/complete/no-show, reschedule mismatch, patient/branch identity change,
  provider change after claim, doctor authority loss, explicit end and elapsed deadline deny the
  old room. Resetting access for a valid updated appointment creates a new generation and revokes
  old participants. Ending a room does not finalize the medical record. User-controlled Leave
  disconnects local media without ending the room for everyone.

## Local activation and preservation

Before-edit source/dependency copies: .medframe-runtime/online-room-before-20261021-010928. Existing
unrelated edits and the clinic-shell width snippet were retained. No Git reset/commit/push, fixture
import, patient-grant mutation, live message, public deployment or original data reset occurred.

The root launcher stopped owned services. First migration attempt correctly refused because port
3000 remained in TIME_WAIT; no unmanaged process was killed. Once ports cleared, ./medframe migrate
created the encrypted checkpoint and verified an isolated restore of all160 original tables:

- checkpoint: /home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261021-012542-a89bd41
- isolated clone: medframe_django_launcher_20261020_172541_a3e298
- checkpoint output: tables_verified160, source_writtenfalse

Then additive operations.0003_appointmentroom_roomparticipant_roommessage_and_more applied OK,
creating four room tables and their role/retry/sequence constraints. New Django metadata permissions
are unassigned. This is the launcher's pre-migration restore comparison, not a claim of a new
post-traffic row/object fingerprint. Existing data, credentials and previous artifacts were not
restored from a review clone or replaced. No original clinical/financial fixture was created.

Official release archive SHA256 was checked before extracting only the binary:
c25a3e45fb922e9a93c6443d10c0ed041ba64342097e38632331736630283165.
The binary, generated media key/secret and server configuration live privately under ignored
.medframe-runtime/media. Installation used official release assets, no shell-piped installer and
no Docker/frontend production build. uv dependency installation necessarily rebuilt local package
metadata; no application build or automated suite was run.

./medframe now owns media alongside API/worker/scheduler/web, includes it in backend start/stop,
and waits for its readiness lease. Current active API4017655, worker4017796, scheduler4017797,
media4017798, web4000113, .next-local-dev and original medframe_django. The final start returned
Ready after media health passed. Native call code is active locally; two-party acceptance is open.

## Reachability limit

This installation intentionally binds signaling/media to loopback, with loopback ICE candidates.
Room links are usable on this computer; they are not internet or same-Wi-Fi invitations. Different
devices/networks require an explicitly configured reachable HTTPS/WSS origin, advertised media
addresses/ports and TURN for restrictive networks. Current local launcher is not a public media
deployment. Do not imply that a localhost link works for a remote patient, or that protected rooms
have been validated for clinical/production use. The code's NEXT_PUBLIC_CALL_WS_ORIGIN selects the
browser-facing gateway origin; the media host/secure networking setup is still required externally.

## Actual verification and remaining limits

Prettier formatted supported UI/proxy files and Ruff format handled Python. Native makemigrations,
checkpoint/migrate and launcher readiness were operational activation steps. No production build,
TypeScript/lint suite, automated backend tests or scripted synthetic clinical fixtures were run.

One bounded CUA presentation round used temporary synthetic-only RoomEntry/CallConversation
components. Desktop entry screenshot shows the six PIN slots; entering a synthetic six-digit code
enabled Enter appointment and a local-only feedback message explicitly stated no PIN was submitted.
The first phone screenshot after the viewport switch was scaled/ambiguous; a later settled390x844
entry capture shows the stacked introduction, numeric slots and submit area. Phone conversation
and Files captures show sample text, pending scan wording and no pending-file download. No actual
upload or message was sent. The actual all-zero UUID room route completed loading into centered
unavailable-room recovery with Try again and Patient portal. The preview route was removed and
viewport reset. No hidden login bypass, real patient data or private account credentials used.

No authenticated room creation/PIN acceptance/doctor claim/start, full in-call layout, actual
camera/audio, two-party chat delivery, upload-to-scan/download flow, extension/conflict, expiry,
cached media replay, permission revocation, simultaneous claims, long history, reconnect, assistive
technology or remote-network acceptance was exercised. CALL-001 records these limits. A superficial
presentation pass must not be used as a security/time-enforcement or two-party call success claim.

npm install reported12high-severity advisories; dependency attribution was not investigated and no
audit fix/forced upgrade was run (CALL-002). Media log inspection after controlled backend restarts
showed coroutine/GeneratorExit/pending-task cleanup warnings from shutdown; final readiness passed
but graceful async cleanup remains deferred (CALL-003). No repair loop was undertaken for these
findings. Older unrelated findings remain deferred.

## Actual Graphify/Jev and source work

Graphify's existing1150-node root graph query Appointment/DocumentVersion/OperationsConsumer/
ClinicalSession returned88neighbors,18shown at600tokens; old paths/truncation limited it. Current
source inspection established native session, reservation triggers, document scanning, proxy and
ASGI relationships. The focused AST was refreshed from39files/351nodes/944edges to the final
44source files/367nodes/975edges under .medframe-runtime/online-room-graph. Four declarative files
(asgi.py, urls.py, routing.py, tasks.py) yielded no AST symbols and were read directly. Code-only,
no semantic extraction/record upload; not a full-repository graph or runtime authorization proof.

Jev used generic sanitized engineering state only. Current planning choice selected server-only
media credentials/live gateway authorization, confidence1.0, jev-1.13.0,411input/32output tokens.
Final acceptance choice selected locally active/presentation-only evidence with open two-party and
security acceptance, confidence1.0,430input/31output. Earlier design choice397input/31output is in
the spec. These are model judgments, not test results. No patient information, actual account
identifiers, keys, PINs, private attachments or real messages were sent to Jev.

Official references read: docs.livekit.io/frontends/reference/tokens-grants, transport/self-hosting,
reference/python/livekit/api, client SDK reference and livekit/livekit release/configuration at
v1.13.10. Token expiry alone does not end active calls; the implementation therefore adds native
admission/reconnect and server media termination. Impeccable uses the existing clinical Operate
world; its already-reported context-launcher issue was not retried or repaired. No agents used.

Final source compatibility refinement preserves the pre-room idempotency payload for in-person bookings; this path was not replay-tested. The final launcher restart above includes it.

The final focused Graphify query MediaGateway/allowed_rooms/participant_for/claim_reservation found214neighbors and showed11at400tokens, truncated. Direct source inspection, not the truncated graph, determined authority and reservation behavior.
