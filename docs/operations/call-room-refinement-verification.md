# Online appointment room refinement — October 21, 2026

## Scope and changed behavior

The user requested further improvement of the existing online appointment room. This is a native
frontend refinement of the existing room, media SDK and backend owners. No new vendor, room access
policy, AI, recording, deployment or backend/schema change. The existing clinical white/navy/teal
system remains. No subagents, production build, typecheck, lint suite or automated tests.

- CallWorkspace separates participant identity, written appointment/timezone context, authoritative
  closing countdown, video stage, call controls, doctor room actions and conversation. The large
  dark video surface preserves remote framing and gives the local camera a mirrored preview.
  Actual media connection/presence drives the placeholder and connection labels. Configured camera
  preference, local preview and a connected call have distinct guidance. Camera/mic/speaker controls
  expose on/off states; inactive devices have explicit amber text/icons, not color alone.
- Chat can collapse without unmounting its owner or losing the current draft. On a phone, explicitly
  reopening scrolls to the panel. The stage supports native browser fullscreen with an unavailable
  message. Doctor patient-record navigation opens a separate tab so the call is retained. Doctor
  Start/Extend/End reuse existing room actions. Patient UI hides those actions and explains that
  only the doctor can extend. Room exit/end confirmations remain separate; leaving warns about an
  unsent message and post-call navigation follows the participant realm.
- Camera/microphone settings reuse the shared Dialog and authored FormSelect. Devices are listed
  through native enumerateDevices; names may require permission. Device checks are explicit user
  actions. Live selection uses the installed SDK switchActiveDevice, preview selection recaptures
  native media, and no preference is persisted. The default option resolves to the browser's first
  enumerated device for that kind when switching an established connection. The SDK input device
  API/type/source was inspected locally; no new package was installed.
- useCallMedia now uses explicit connection phases, one pending operation and a generation guard.
  Late capture results stop tracks after leave/access expiry/unmount. A room is not connected
  automatically; the native gateway still controls admission. Existing muted/publication/participant
  events update displayed video/presence, and cleanup remains attached to leaving or unmounting.
  Actual hardware, reconnect and permission behavior remain unverified in this phase.
- ConversationPanel is presentation; CallConversation keeps the native request/receipt owner.
  Enter sends, Shift+Enter adds a line, composition input is excluded, and the 2000-character limit
  remains. Drafts survive Chat/Files switching and collapsing. Messages have named authors and
  written day/clinic-time labels. A near-bottom policy follows new messages while preserving older
  reading position; a New messages control offers return to latest. Earlier history uses the same
  authorized endpoint and retains a scroll anchor. These longer-history behaviors are implemented
  but were not fully exercised in the bounded pass.
- Files show human-readable sizes, origin and explicit ready/pending/blocked/unavailable state.
  Only clean files render the existing authorized download link. Upload remains the same CSRF-
  protected native endpoint and deduplicated request ID; client type/size hints do not replace server
  validation. A 90-second client timeout retains the same file/request for retry. Upload acknowledgement
  says received/scan required, not delivered or clinically released. Sending/upload/history have
  separate progress text and one synchronous pending guard. No real file or chat message was sent
  during the visual review.
- Public PIN entry retains six blocks/native join actions and adds contextual joining help,
  associated error metadata, noValidate and written appointment dates. It does not expose patient
  identity from the public inspection state. No credential/MFA/realm policy changes.

Focused owners: apps/web/features/calls/{appointment-call,call-workspace,call-stage,
call-device-settings,use-call-media,call-conversation,conversation-panel,call-format,room-entry}.
The existing use-call-room/client/room-management backend contracts remain unchanged.

## Preservation and local activation

Private before-edit sources: .medframe-runtime/call-room-refinement-before-20261021-004838.
The timestamp is an execution-host source-backup identifier, not an appointment time. Private
synthetic presentation source: .medframe-runtime/call-room-refinement-presentation.tsx. Its temporary
app route was removed after the pass. Existing unrelated changes and the clinic-shell width snippet
were retained; no Git reset, commit/push, migration, database fixture, credentials/MFA/grants,
clinical/financial mutations, real uploads/messages or public exposure.

`./medframe start --only frontend --dist-dir .next-local-dev` found the serving dev process already
running and returned Ready. Updated frontend source is served by web4000113; API4070783,
worker4071016, scheduler4071017 and media4071018 remain launcher-owned against original
medframe_django. No backend restart or schema migration was needed. No current build was removed;
no production artifact was created. These are source/runtime observations, not fresh row/object
fingerprints or a new database restore claim. Source rollback uses the private before-edit copies
with unrelated changes reconciled, without restoring a database.

## Actual Graphify, Jev and design use

Root graph query `AppointmentRoom RoomScreen Preflight RoomConversation` with budget450 returned no
matching nodes. The existing online-room graph (367nodes) was then queried for
`AppointmentCall CallConversation useCallMedia RoomEntry`:32neighbors,14displayed under budget450.
Source inspection confirmed current owners and actual APIs. A focused AST-only corpus was refreshed
from the calls frontend and native call_policy/call_service/call_files source:119nodes,284edges.
Query `CallWorkspace ConversationPanel CallStage useCallMedia` found49neighbors,14displayed, explicitly
truncated under budget450. This is bounded source relationship evidence, not full repository,
runtime, privacy or authorization verification. No LLM graph extraction or private records.

Jev planning chose room_ux1.0, confidence1.0 over replacing infrastructure; modeljev-1.13.0,
412input/38output tokens. Review chose bounded1.0, confidence1.0 over claiming two-party validation;
437input/31output tokens. Only sanitized generic engineering state and evidence limits were sent;
no names, patient records, credentials, IDs, private attachments or logs. Judgments are not proof.

Impeccable's refinement/craft guidance, PRODUCT.md, DESIGN.md, the existing room surface and the
installed Next use-client guide were followed. The existing context launcher had already failed
permission in this conversation and was not rerun or repaired. Prettier formatted changed TS/TSX;
unchanged source modules remain unchanged. No automated suite/build/typecheck/audit was run under
the user's visual-only preference.

## One bounded visual pass and findings

A temporary, clearly labelled, synthetic-only CUA page reused the actual CallWorkspace,
ConversationPanel and RoomEntry with presentation callbacks, not the native authentication/media
hooks. Sample identity/device/file objects existed only in component memory. No auth bypass,
permission mock in native routes, original fixture, actual device capture or native upload/message.

Observed on desktop and390×844 phone:
- Large stage, participant name/camera-off fallback, explicit connection state and closing warning;
  call controls and doctor controls are visible with wrapping/scrolling.
- Enter sent a synthetic message and cleared the field. An unsent draft remained after Chat/Files
  switching and after collapsing/reopening. The explicit phone reopen brought the conversation
  into view; phone composer/send controls and separate content scrolling were visible.
- Ready, pending and blocked file states had different text/icons; only the ready synthetic file
  had a download action. No download or upload was attempted.
- Camera/microphone dialog opened, its authored camera popup showed default/example choices and
  choosing Example camera updated the displayed selection. Actual hardware was not changed.
- Patient presentation hid doctor controls and changed participant/time-extension context.
- Phone PIN entry showed the written date/six blocks and help disclosure expanded with actual steps.
- Native /appointments/room/00000000-0000-4000-8000-000000000000 rendered the shared startup indicator
  followed by the centered unavailable-room recovery, with no fabricated room access.

An immediate screenshot following viewport resize had transient scaling; a settled capture after
fresh state was used. Viewport was reset and the temporary route removed. No second visual round.

CALL-REFINE-001: Files can retain the Chat pane's prior scroll offset; first filename may initially
sit above the scrollport. The file is accessible by scrolling. Observed and logged without repair
under the user's log-first preference. No data loss or access bypass was observed.

CALL-REFINE-002/CALL-001: Native doctor/PIN entry, actual two-party media, physical device selection,
permission denial, fullscreen, reconnect, interrupted capture cleanup, native message/upload retry,
long-history/new-message behavior, expiry and concurrent access remain unverified. Presentation
success and launcher readiness do not validate them. Existing loopback-only media cannot serve a
patient on another device/internet without an explicitly configured secure networking/media setup.
No platform-wide accessibility, overflow measurement or complete multi-browser claim.

Existing CALL-002 dependency advisories, CALL-003 shutdown warning and unrelated findings were not
repaired or retested. No clinical/telemedicine or regulatory validation claim.
