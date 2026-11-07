# Online appointment rooms — design for review

Status: design approved by user “proceed”; implemented and locally active. Two-party/security acceptance remains open; see docs/operations/online-appointment-rooms-verification.md.

## Agreed outcome

An online appointment has one live doctor–patient room with camera/microphone, two-way realtime
chat and private file uploads during the call. Patients enter using a room link and PIN. Access
ends at the appointment end time. The user explicitly selected allowing the doctor to extend it.
The original request permits assigned or any eligible doctor. Both are explicit room settings,
with assigned doctor as the default. Eligible-doctor claiming still requires native clinic/branch/
patient authority and an available reservation; it never grants new clinical access.

## Patient and doctor experience

1. Staff selects Online when booking. The booking summary identifies the online room, assigned
   doctor or eligible-doctor policy, date/time in the clinic timezone and patient access window.
2. The appointment detail opens room management: copy patient link, reveal/copy or regenerate PIN,
   view waiting/present states, and Join appointment. Regenerating access invalidates older patient
   proofs; it does not sign the doctor out of Medframe.
3. The patient opens `/appointments/room/[opaque-link]`, enters a six-digit PIN in separate boxes,
   then sees a pre-call camera/microphone check. Use the same room-scoped proof on reconnect; do
   not repeatedly ask for the PIN during a healthy session. Never infer verified real-world
   identity from possession of the link/PIN: the doctor confirms the expected patient before care.
4. Proposed opening window: ten minutes before appointment start. The patient waits for the doctor
   to admit/start the call. Before that window show the appointment time and opening instructions,
   without requesting camera access. This is a proposed default, not an existing rule.
5. The call uses a large remote participant video, local self preview, clear camera/microphone/
   speaker controls, connection state and time remaining. A side panel switches between Chat and
   Files; on a phone it becomes an accessible drawer. The doctor's clinical-record link uses the
   existing permitted patient/encounter workflow. The room does not confer access to other records.
6. Camera-denied and camera-unavailable states offer retry and audio-only participation. Network
   interruptions preserve the authorized session and acknowledged messages, with visible reconnect
   state. Leaving locally does not mark the appointment completed or finalize a consultation.
7. Before expiry show a warning. The doctor can choose an explicit extension, with the new end time
   shown to both participants. Extension must check operational/provider conflicts and be audited;
   silently consuming the next patient's booked slot is prohibited. Conflicts require rescheduling
   through the existing appointment owner before extension is accepted. Room access and booking
   reservation updates must have one documented atomic authority, not independent client timers.
8. At expiry, cancellation, revocation or explicit End for everyone, stop both participants' media,
   close room chat/file actions and show a centered ended-room page. Old links/PINs/session proofs
   cannot reopen the room. A new authorized appointment/access generation is needed. Existing
   downloaded files cannot be recalled from the recipient's device.

## Ownership and boundaries

Django remains authoritative for organization/branch, appointment, patient, provider, MFA,
permissions, room membership, PIN verification, time window, chat, file authorization and audit.
Staff doctors use native signed-in MFA sessions and must satisfy provider/clinical scope. A patient
PIN never grants a doctor role. Room guest cookies/proofs are separate from native staff/portal
sessions, preserving the Station login-coexistence fix. Do not logout or replace an existing user
session when entering a patient room on that browser.

Use one doctor slot and one patient slot. Claim/rejoin/replace operations are serialized; a third
participant cannot join. All-doctor eligibility, if selected, means eligible authorized providers
from this clinic and permitted branch/patient scope, not arbitrary doctors and not an automatic
patient-grant bypass. A claimed doctor cannot be silently replaced mid-call; explicit handoff and
fresh authority must be defined if required. Recording, AI, transcription, group calls, external
messaging and automatic clinical-record release are out of scope.

## Realtime transport proposal

Use self-hosted LiveKit for camera/audio, retaining Medframe's UI and Django policy. No external
media account or API key is required for a local self-hosted development instance. Generate private
local media credentials, keep them ignored, and use opaque room/participant IDs without names,
emails, phone numbers or clinical metadata in media tokens/logs.

Existing Channels/Redis can deliver authenticated room presence, persisted chat and upload status.
The current operations socket is invalidation-only: add a separate room consumer, not arbitrary
messaging to the operations branch channel. Every socket joins exactly one authorized room and
checks current authority on messages and reconnect. Reauthorize changes to staff access, patient
proof, assignment, cancellation, room version and expiry. Persist acknowledged chat once with a
client request ID; page history and resume by server sequence. Render plain text without HTML.

Do not use LiveKit data streams for bypassing Medframe's scanned file pipeline. Uploads go to the
private backend/quarantine, notify the room in realtime, and become downloadable only after a
successful security scan. Reuse the native byte validation/scanner/private storage mechanics, with
new room-specific authorization for PIN guests. Native document write APIs currently require an
authenticated user; they must not be exposed to an anonymous PIN caller or impersonated as the
doctor. Initially support PDF/JPEG/PNG/WebP up to the existing20MiB limit, label file state, reject
active/unsupported content, and recheck room/time on upload, completion and download. Retain records
according to existing policy; guest room access ends with the room. Any later attachment into a
clinical consultation must be an explicit authorized doctor action with provenance.

### End-time enforcement is a release blocker

Official LiveKit documentation states that JWT expiry affects initial connection, not ongoing
sessions/reconnects; self-hosted RemoveParticipant does not itself invalidate cached tokens.
Therefore a frontend countdown and short-lived tokens alone do not satisfy this user's rule.

The implementation must provide server-side time/authority checks on every media admission and
reconnect (including previously issued/refreshed tokens), plus active media-room termination at
the deadline. Keep the raw media signaling endpoint private behind the admission boundary so it
cannot bypass Django policy. A supervised deadline enforcer must apply the current room version,
handle extensions atomically, and close expired/cancelled/revoked rooms. Define and verify its
failure mode: stale/unhealthy enforcement must block new admission, with media terminated on lost
authorization/enforcer health. A periodic Celery cleanup by itself is insufficient for claiming a
strict time limit. Document the enforcement latency rather than promising mathematically exact
disconnect timing. If the selected media deployment cannot provide these controls, stop and
report the blocker instead of claiming secure expiry.

## Persistence and integration

Add a separate native room domain with versioned OnlineAppointmentRoom, room-scoped guest access,
participant claims, ChatMessage and RoomAttachment metadata. Pin digests use a password hash,
rate-limited verification and uniform error responses; any recoverable display copy is encrypted
and available only to authorized room managers. Do not put PINs/tokens in query strings or logs.
Use request IDs and row locks for room creation, claiming, extending and ending. Audit metadata
includes actor/time/action/room/version, not chat bodies or file bytes. Keep patient and encounter
links exact; joining a call alone never changes the booked identity, finalizes an encounter or
marks a financial obligation settled.

Integrate with the new appointment detail/calendar, booking form, native provider selection and
patient portal appointment list. Rescheduling/cancelling must invalidate the old access generation
and terminate any old room; final implementation must define this across patient portal, kiosk
and staff mutation entry points. Existing appointments default to in-person; no existing records
are automatically converted or assigned. Additive original migrations only after the launcher's
encrypted checkpoint/verified restore. Preserve all credentials/MFA/grants and existing runtime.

## Local and internet reachability

Activate locally through the root launcher after implementation; no public deployment is implied.
Video needs media signaling and WebRTC network reachability. A doctor and patient on different
networks need a reachable HTTPS/WSS origin, media ports and a TURN relay for restrictive networks;
plain `localhost` is not a public patient invitation. Camera/microphone access on a second device
also needs a browser-trusted secure origin. Document local desktop validation separately from
same-Wi-Fi phone validation and real external-network acceptance; do not claim the latter without
the corresponding infrastructure and evidence.

## Delivery and verification preference

Implement natively without agents, keep focused readable modules, Tailwind/shadcn, Prettier/Ruff.
One connected phase covers booking/room/PIN/time authority, video/audio, chat, scanned files and
doctor/patient entry. No production builds or automated tests per the current user preference.
Use bounded visual checking and log unrelated issues without repair. Actual two-party media and
expiry behavior require a controlled two-client confirmation; if no authenticated/camera-capable
clients are available, explicitly leave that acceptance open. No live emails/SMS or real patient
data during development. Do not label the feature clinically validated or production-ready.

## Source and tool discovery

Current anchors: operations/{appointments,policy,queue,calendar,consumers,realtime,routing}.py,
config/asgi.py, documents/{models,storage,services,tasks,views}.py, infrastructure/compose.yaml,
frontend operations appointment detail/booking and portal patient-operations. Existing media/chat
code was not found in the targeted search. Reuse native owners without importing queue/clinical
privilege into the guest room.

Root Graphify query against1150nodes returned88neighbors/28shown at900tokens and old frontend
paths, so source inspection determined the above boundaries; it is not a current media graph.
Jev0.7.0 auth status succeeded. A sanitized planning choice selected combined server admission/
reconnect checks plus media termination over browser timer/token expiry alone: jev-1.13.0,
confidence1.0,397input/31output tokens. This is a model judgment, not evidence of an implemented
control. No patient/account/credential/attachment state was submitted.

Official references checked October21,2026:

- https://docs.livekit.io/frontends/reference/tokens-grants/
- https://docs.livekit.io/intro/basics/rooms-participants-tracks/rooms/
- https://docs.livekit.io/transport/self-hosting/
- https://docs.livekit.io/intro/basics/connect/

Impeccable will follow the existing clinical Operate system. Brainstorming classifies this as a new
subsystem requiring design review before implementation; that review was approved before native work.
