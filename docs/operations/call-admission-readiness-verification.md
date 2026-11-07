# Call admission, device readiness and internet preparation — October 21, 2026

## Scope and activation

The user approved the next online-appointment improvements and selected internet access with a
provided domain: pixelsbymiku.dev. Hosting/server/DNS/HTTPS status remains unanswered. Domain-specific
configuration is prepared; no public deployment, DNS/certificate/firewall change or development
server exposure was performed. Current media still uses the loopback profile. See
[call-internet-setup.md](call-internet-setup.md) for exact prerequisites and prepared owners.

Implementation is native in the current working tree, without agents, external messages or clinical
fixtures. Existing unrelated edits, accounts, MFA, grants, records and serving artifact remain.
No build, automated tests, typecheck or lint suite was run under the user's visual-only preference.
Prettier formatted supported changed files; Ruff formatted Python. Neither establishes acceptance.

## Behavior and authority

- A new patient PIN claim creates a waiting participant. Snapshot exposes bound appointment context
  and empty conversation/file arrays until admitted; history/message/file/media requests retain the
  native participant_for gate, now requiring admission. Room-update sockets allow waiting sessions
  to receive invalidation notifications, not conversation content. Media supervisor excludes waiting
  identities. Existing native doctor/session/time/generation and file scanning policy is retained.
- Doctor admission/removal uses exact participant ID, current generation, room version and native
  doctor authority under the room transaction. Removal applies only to waiting sessions; the PIN
  is unchanged and may request entry again. Admitted sessions cannot be removed using that action;
  End remains the explicit active-room closure. Room changes retain audit and invalidation owners.
- Patient waiting UI has local camera preview/preferences and device settings, with no conversation
  or live Join control. Admission opens conversation; the doctor must still start the appointment
  before live media. Appointment end/extension policy remains unchanged.
- A local Web Audio analyser shows microphone signal without playback/upload. Speaker check uses
  an explicit quiet tone followed by the user's I heard it confirmation. Contexts/timer cleanup is
  implemented; actual hardware and interrupted capture cleanup remain unverified.
- Only camera/microphone/speaker booleans are sent through a patient-only readiness action. They are
  self-reported and optional, not evidence of identity, audio quality or verified physical readiness.
  Doctor lobby shows actual arrival and last snapshot time, without claiming live presence.
- Shared browser Permissions-Policy previously denied camera/microphone on every route. A later
  exact appointment-room header now allows same-origin device permission requests; other routes
  retain their restriction. Installed Next header documentation confirms last-match override.
  No browser permission prompt was accepted during review.
- HTTPS call sockets use same-origin WSS. Prepared public launcher profile enforces explicit HTTPS
  origin, secure cookies/production backend, existing production UI artifact and explicit public
  media IPv4; defaults remain loopback. Caddy configuration keeps raw media API loopback-only and
  proxies native cookie-authorized call sockets. Optional TURN/TLS requires separately provided
  hostname/certificates; port5349 is not a guarantee for443-only networks. This profile was not run.
  Profile/secure-origin metadata is configuration context, not a successful connectivity measure.

## Preservation and local runtime

Private source snapshot: .medframe-runtime/call-admission-before-20261021-012829.
Launcher stop completed. First migrate attempt refused port3000 while no listener remained, matching
prior TIME_WAIT behavior; no process was killed. A later launcher retry succeeded after independent
work. Its encrypted checkpoint and isolated restore verified all164 original tables before migration:

- Checkpoint: /home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261021-093641-a89bd41
- Isolated clone: medframe_django_launcher_20261021_013640_f0cda2
- Source-written flag: false in restore verification.
- Applied additive operations.0004_roomparticipant_admission. Four participant columns, no new table.
  Existing authorized rows receive admitted=true; future patient rows defaultfalse. This deliberately
  preserves existing authorized sessions instead of retroactively locking them out.

No restore over original, credential/grant reset or synthetic clinical import. This is pre-migration
restore evidence, not a post-traffic row/storage fingerprint claim. The original medframe_django
remains active. ./medframe start --dist-dir .next-local-dev reported Ready. Final status:
API688734, worker688908, scheduler688909, media688910, web689386 allrunning; Docker infrastructure
reported healthy/available. Current origin localhost3000; no internet-ready claim.

## Actual Graphify, Jev and source use

Graph-first query against the prior call-room-refinement graph:
`graphify query 'join participant_for media_authority snapshot gateway' --budget450`.
119nodes;98neighbors;14shown, explicitly truncated. Verified actual source owners and refreshed a
focused AST-only corpus of29 calls/frontend/backend/media/launcher/header/migration files with no
secrets/records. Extraction produced213nodes/554edges. Refreshed query:
`graphify query 'participant_for update_readiness room_action useDeviceChecks PatientWaitingRoom' --budget500`.
164neighbors;15shown, explicitly truncated. Stored privately under
.medframe-runtime/call-admission-graph and call-admission-graph-corpus. No semantic LLM extraction,
full-repository graph coverage or runtime authorization inference claimed.

Jev planning chose server_gate1.0/confidence1.0 over UI-only gating; modeljev-1.13.0,
422input/34outputtokens. Review chose bounded1.0/confidence1.0 over complete internet/native
validation;409input/31outputtokens. Only generic sanitized engineering state/evidence limits were
sent; no domain/identity/PHI/IDs/credentials/attachments/private logs. Judgments are not proof.

Followed Impeccable craft/refinement guidance and existing online room surface. Its context launcher
had already failed permission earlier in this conversation and was not rerun or repaired. Official
LiveKit deployment, ports/firewall and pinned1.13.10 config sample informed the prepared profile;
one speculative primary-source path returned404 and was not relied on. Sources are linked in the
internet setup document. No hosting vendor chosen or remote installation performed.

## One bounded visual pass

Temporary clearly labelled synthetic presentation reused actual CallWorkspace, PatientWaitingRoom,
DoctorAdmission and device controls with in-memory callbacks. It did not invoke native auth/media,
real capture, tone, upload or admission mutations. Source retained privately as
.medframe-runtime/call-admission-presentation.tsx; temporary app route removed after review.

Desktop and390×844 phone observations:
- Doctor waiting card showed patient context, arrival/last check-in, reported device flags and
  Admit/Remove actions. Removal confirmation explained access/PIN behavior; Cancel preserved view.
- Patient waiting view showed PIN accepted and local preflight, with no conversation/chat/file/Join
  controls. Synthetic microphone signal changed the meter to52 and speaker confirmation enabled
  only after its synthetic Play callback, then displayed Confirmed by you.
- Phone waiting content stacked and settings dialog stayed within the viewport with internal
  scrolling. No measured all-route overflow/accessibility claim.
- Synthetic admission updated the doctor card to Patient admitted/Access granted; patient role then
  showed the ordinary conversation workspace and continued to hide doctor controls.
- Native missing-room route rendered centered We couldn’t open this room and actual unavailable
  message. Initial CUA navigation timed out while dev navigation completed; subsequent observation
  confirmed the requested route/recovery. No browser retry or repair cycle was performed.

Viewport reset, temporary browser tab closed. No second visual round. Presentation confirms layout
and authored state transitions, not backend security or hardware behavior. Existing CALL-REFINE-001
retained conversation/file scroll issue remains deferred without repair.

CALL-ADMISSION-001: Native authenticated doctor/PIN admission/removal, stale/racing sessions, direct
waiting history/upload/media rejection, device permissions/hardware/cleanup and actual two-party
media remain unverified. Public profile/server/TLS/ICE/TURN/mobile-network/expiry/reconnect acceptance
also remains open. No clinical, telemedicine, regulatory or full end-to-end validation claim.
Existing CALL-001/002/003 and CALL-REFINE-001/002 remain deferred and were not broadly retested.
