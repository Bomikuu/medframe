# Online appointment rooms

Mode: Operate. Continue Medframe's navy/teal clinical desk system.

The patient entry has a six-slot numeric PIN, a clear clinic-time appointment label, validation
feedback, and a separate native-doctor entry. Logged-in ineligible staff see assignment guidance,
not another sign-in loop. On phones the introduction and form stack; controls remain touch sized.

The room prioritizes remote video, a small local preview, explicit microphone/camera/speaker
controls, connection state and server-relative time remaining. Chat and scan-gated files share one
side panel; the layout stacks on smaller screens. Doctor-only controls start, extend and end the
room. Leave and End for everyone require clear confirmation. Ending a call never finalizes notes.

Use native access, private storage and the room's server authority. No AI, recording, invented
advice or automatically released clinical documents. The one bounded visual pass covers entry,
conversation/files presentation and native missing-room recovery; authenticated call UI, media,
deadline/reconnect and permission boundaries remain open in CALL-001.


## Room refinement — October 21

Use a large remote stage with named participant/camera-off fallback, mirrored local preview,
explicit media phase and native fullscreen. Keep appointment identity, written date/timezone and
time-until-close in a restrained header. Media buttons show their state; a device settings dialog
uses shared authored choices and requests capture only on user action. The conversation can hide
without unmounting its draft; a phone reopen scrolls to it. Keep natural page scrolling and bound
the conversation's own message/file region.

Chat uses Enter/Shift+Enter, composition-safe sending, named authors, clinic-time/day labels,
draft retention and latest-message navigation. Files name their sender, size and actual scan state;
only clean files offer download. Native request/version/access/scan owners stay authoritative.
Doctor controls and patient-record navigation remain separate from care finalization. The record
opens in another tab so the call stays mounted. Exit/end remain explicit confirmations.

One synthetic desktop/phone visual pass covers presentation and a native unavailable-room state;
CALL-REFINE-001 logs retained file-tab scroll without repair. Live media/device/native acceptance
remains CALL-REFINE-002/CALL-001. See call-room-refinement-verification.md.


## Waiting room and local readiness — October 21

Separate patient preflight from the active conversation. PIN acceptance opens a waiting view with
local preview, device preferences, microphone signal meter and explicit speaker tone/confirmation.
Doctor sees actual session arrival/last check-in and optional self-reported readiness. Admission and
start are separate actions; pending patients cannot use native conversation/files/media. Removal
confirms access loss and explains unchanged PIN behavior. Existing authorized sessions are preserved.

Maintain the current clinical tokens, shared dialogs and phone stacking/scrolling. Only flags are
reported; no microphone samples, camera preview or device IDs are uploaded by preflight. Do not
claim hardware quality, identity proof or internet reachability. pixelsbymiku.dev profile is prepared
only; localhost remains active. See call-admission-readiness-verification.md for actual visual limits.


## Room continuity — October 21

Use measured SDK quality/reconnect events for recovery context; preserve conversation drafts while
media reconnects. Explicit audio-only stops outgoing camera, not a guaranteed connectivity fix.
Doctor clinical workspace floats without resizing/unmounting the call. Keep its content mounted
when collapsed and at call end, reuse native clinical editor/leases/version/save and explicit portal
release owners, and pin the clinic/patient context. Notes opens first only in this room context.
Room-only overlay usesz40 so shared confirmation/editor dialogs can appear above it.

Review exact patient-facing next steps before sharing; keep private notes and released documents
separate. End screen shows last already-delivered reviewed instructions and portal follow-up/records
links. No new expired room access, automatic booking, note finalization or automatic release. See
call-continuity-verification.md and CALL-CONTINUITY-001/002/003 for actual evidence and limits.

## Reference-guided PIN entry — October 21

Pre-admission RoomEntry follows the supplied split reference: generated navy clinic interior and
readable HTML benefits on desktop; one schedule/PIN/reschedule card with distinct doctor entry and
help. Phone hides decorative hero and keeps compact brand/form. Use native static import for the
public generated asset so the host-routing proxy need not change. Keep full scheduled/opening dates,
timezone, actual errors/eligibility/local-media warnings and native security/window/admission owners.
Never claim an early room is ready or copy unverified healthcare-grade-security claims. Post-PIN
camera/mic preflight remains its existing surface. See waiting-room-reference-verification.md for
staged activation repairs and focused synthetic visual evidence; WAITING-REF-002 remains open.

## Focused signed-in room — October 21

The user's full-viewport brief supersedes earlier natural page scrolling for the signed-in call workspace. Use a 100dvh flex shell, compact identity/status/time header, large dark contain-fit video, retained local preview and anchored media/start/join/end controls. Secondary tools use shared Dialog/Sheet/Popover/DropdownMenu. Conversation uses native Tabs in one mounted nonmodal dock, inline desktop / stage overlay narrow; only its history scrolls and its composer stays anchored. Preserve callback/ref ownership and server authority; start, admission, media join, leave/end and note finalization remain separate. Pre-PIN entry and patient preflight stay distinct. See focused-call-workspace-verification.md for synthetic visual evidence and FOCUSED-CALL-001 native acceptance limits.

## Interactive generic model presentation - October21

Present model opens native Dental/Body/Skeleton in the full-viewport call stage; preserve the mounted video/audio nodes in a collapsible tile and the same chat/clinical owners. Doctor owns camera and focus; patient pointers are temporary and separate. Selection defaults off; doctor can enable it, patient can choose View only, and notices/mode labels explain changes. Labeled Parts/search/surface choices and existing reference maps remain available without WebGL. No private finding/history/notes fetch or automatic clinical save/release is permitted on the patient path. Dedicated admitted-room protocol, ephemeral Redis state and optional renderer camera adapters own synchronization; use shared controls and existing theme tokens. See interactive-call-models-verification.md for real two-session selection/view-state evidence, scoped activation repair and unverified GPU-camera/security/media cases. Native/no-subagent, visual-only and standing activation preferences continue.

## Instant-room timing — October21

Room management offers explicit Scheduled/Instant timing; existing rooms default Scheduled. Instant is an eligible authenticated clinician action tied to the same patient/appointment. Resetting scheduled access as Instant confirms revocation and generates a new PIN. Primary PIN entry and patient preflight describe immediate access plus doctor admission; signed-in header replaces countdown with Instant room and hides Add time. Doctor ends manually; cancellation/completion and changed identity/authorization still close access. No new appointment-free booking or calendar reservation behavior. Bounded native PIN review passed; INSTANT-ROOM-001 logs inherited footer/default channel warning and unverified doctor/conversion/media/responsive boundaries. See instant-room-verification.md.

## Date-free new booking and lookup — October21

Appointments removes duplicate branch/search panels: current branch lives in the header modal; Find patient opens the reusable PatientSearchDialog with portraits, automatic suggestions and native record navigation. Booking and alternate-patient consultation selection reuse the same modal. Summary values use icon cards with restrained hover; disclose loaded-page totals. New booking exposes Instant consultation under Appointment location and hides all scheduling/resource/duration fields in that mode. Return patient link/PIN/open action immediately. Existing scheduled form, field/schema owners, record permissions and clinical start/admission/end separation remain. See appointment-flow-verification.md; desktop native creation/selection/branch/navigation observed, broader checks intentionally unrun.

### Temporary clinic automatic-update pause

Appointments calendar/day dialog and Clinic queue currently use manual Refresh plus explicit filter/navigation and successful-action reloads. Do not show Live/Reconnecting on these surfaces. Their WebSocket/poll/focus data refreshes are paused by user request; other portal/Station/call channels remain as implemented. See appointment-flow-verification.md follow-up; source/activation reviewed without a new browser round or builds/tests.
