# Interactive dental and anatomy presentations in appointment rooms

## Intended outcome

Doctor and admitted patient view the same live dental or anatomy presentation during an online appointment. Doctor rotation, zoom, selected view and model focus are reflected on the patient device. When explicitly permitted, patients can select a tooth, tooth surface or anatomical structure and the doctor sees that selection. A view-only option and understandable mode-change notices are always available.

This is an architectural extension of an existing flow: it introduces an authorized collaboration protocol and synchronized camera state. No implementation code has been changed for this proposal.

## Interface and interaction contract

- Doctor toolbar adds **Present model**, offering Dental and Anatomy (body/skeleton). Presentation replaces the large remote-video stage; the ongoing call remains mounted in a small video tile. Stop presenting restores the normal stage without disconnecting media or conversation.
- Model presentation uses the existing assets, renderer interactions, selection labels and accessible structure/tooth navigation. Both devices load geometry locally; only validated presentation state is synchronized. This is interactive model sharing, not screen capture.
- Doctor controls the shared camera: rotation, zoom, pan, named views, focus, isolation and reset. No competing patient orbit gestures or camera ownership transfer in this phase.
- Default patient mode is **View only**. Doctor can enable **Allow patient selection**. It permits temporary pointers/selections only, never clinical edits, chart-state changes or camera control.
- Patient sees a persistent **View only** or **Selection enabled** label. A local **View only for me** option suppresses interaction even if the doctor permits selection; returning to interactive mode requires both the server permission and the patient's choice.
- When selection becomes available, show an in-room notification: “Your doctor enabled selection. Choose a tooth or body part to point it out.” Include a visible View only action. Revocation says “Selection is off. You can keep following your doctor’s view.” Presentation start/stop and reconnect/resync get short notices. Announce meaningful state changes through a polite live region; do not announce every camera update. Browser notification permission is neither requested nor required.
- Show separate labeled doctor focus and patient pointer. A patient pointer does not automatically move the shared camera, erase the doctor's focus or become a finding. A doctor can explicitly focus that part. Accessible tooth/structure buttons provide the same selection as a mesh click.
- Phone/tablet retain the viewport-constrained shell. The model fills the stage, video preview is collapsible, chat remains the existing single mounted dock and the essential call controls stay reachable. Secondary presentation settings use shared shadcn Popover/Sheet/Dialog controls.
- Loading, unavailable assets/WebGL, reconnecting, out-of-sync and expired-room states have explicit labels. Provide the existing labeled 2D/list alternative when 3D cannot render; never show a fake synchronized view.

## Privacy and clinical boundaries

- Only the currently authorized doctor and admitted patient for this exact live room can receive presentation state. A pending lobby session cannot receive it. Ending, removal, session revocation, PIN reset/generation change or expiry invalidates participation.
- Initial presentation shares generic dental/anatomy models, camera state and temporary selections. It must not mount the clinician-only editor or its data-fetching providers on the patient's side.
- Do not automatically share private notes, diagnoses, clinical annotations, documents, history, or the patient's existing chart findings. Existing patient record-release policy remains authoritative. Sharing saved clinical findings requires a separately specified explicit reviewed disclosure path; this phase does not bypass that policy.
- Patients cannot write clinical records. Saving an observed finding remains a separate authorized doctor action in the existing clinical workspace, using its version/save/review owners.
- No recording, AI, new conferencing provider, screen-capture permission or public deployment. Model sharing does not establish that cross-device internet media has been configured successfully.

## Server authority and transport

Use a dedicated same-origin Channels consumer for model presentation, reusing the existing call policy/session/cookie and origin checks. Do not put high-frequency camera movement through room-wide snapshot refreshes or increment the clinical/appointment record version for every movement.

Server state is ephemeral and room/generation scoped in the existing Redis infrastructure, with bounded TTL capped by live room access. Persist no clinical record or patient pointer history. Use a presentation epoch and monotonic server revision; snapshots carry the current epoch, approved mode, asset/version, selection permission, canonical camera/focus and most recent temporary pointer. Clear ephemeral state at stop/end/reset and expire it automatically. Reconnect reauthorizes and receives the authoritative current snapshot rather than replaying stale commands.

Authenticate and reauthorize on connect, incoming command and outgoing delivery, using admitted participant policy rather than the lobby-permitted updates policy. Retain periodic expiry/revocation checking so an idle client cannot keep access. Server serializes state updates atomically; validates presenter identity and permissions against current state, and applies bounded per-participant rate limits, message size limits and strict input schemas. Reject unknown keys, non-finite/out-of-range vectors, arbitrary URLs, unsupported asset versions, invalid tooth/surface/structure IDs, stale epochs and commands from revoked patient selection modes. A patient command contains selection data only; it cannot alter camera/mode/asset or impersonate the doctor.

Suggested events:

- Doctor: start_presentation, set_camera, set_focus, set_selection_permission, stop_presentation.
- Patient: point_at_part, clear_pointer (only while selection is permitted).
- Server: snapshot, presentation_updated, patient_pointed, permission_changed, stopped, access_closed, recoverable_error.

Every accepted event includes server-derived actor role, epoch and revision. Clients drop stale revisions, ignore another presentation epoch and avoid echoing applied remote camera updates. Coalesce/throttle camera traffic (initial target at most 15 updates/second with a final settled update) and interpolate received camera state; exact tuning is an implementation choice. Pointer events use a separate bounded rate. A disconnected client freezes the last view with a clear reconnect indicator and disables outgoing interaction until reauthorized/resynchronized.

## Model synchronization

Reuse the existing anatomical and dental renderers behind focused presentation adapters. Add optional external camera-state/on-camera-change interfaces without changing ordinary editor defaults. Canonical pose includes camera position, orbit target, up vector and the compatible projection parameters, plus model version and scene/view configuration. Use stable model identifiers/coordinates, not DOM pixel coordinates; differing viewport aspect ratios must keep the selected structure visible and centered.

Doctor events update camera/focus once; patient application must suppress feedback events. Temporary patient pointer includes validated structure/tooth/surface identity and, where supported, a bounded mesh-local anchor. Model/version mismatches show an unavailable/resync state rather than interpreting coordinates against another mesh.

## Ownership and proposed files

- Existing call authorization: `services/api/medframe_apps/operations/call_policy.py`.
- New isolated protocol/store/consumer modules beside `call_consumers.py`; add the dedicated route through existing ASGI routing.
- New presentation hook/protocol types and stage/toolbar components under `apps/web/features/calls/`.
- `appointment-call.tsx` coordinates room lifecycle; `call-workspace.tsx` switches stage presentation while keeping media and conversation mounted.
- Optional camera adapter interfaces in dental `dental-3d.tsx` and anatomy `anatomy-scene.tsx`/viewport. Existing editor behavior remains default.
- Shared existing shadcn controls, notification/live-region patterns, model asset registries and 2D alternatives remain canonical.

## Implementation grouping and verification

Deliver one connected native phase: server authority/protocol, both model adapters, doctor presentation controls, patient view/selection modes, notifications and reconnect/lifecycle cleanup. No subagents. Use Prettier/Ruff formatting, readable focused files and Tailwind. Preserve the active source/runtime/data; no build or automated tests under the user's current instruction. Activate locally through `./medframe`.

One bounded two-session browser review must demonstrate actual server-mediated camera updates and patient selection across independent doctor/patient sessions, permission revocation, view-only enforcement, reconnect snapshot, room stop/expiry cleanup, model fallback, chat/media continuity and desktop/phone viewport bounds. Use synthetic records only. If actual two-session access or another prerequisite is unavailable, log the concrete gap and do not claim real-time integration is verified. No broad repeat/repair loop. Security/expiry boundaries that cannot be established through the allowed review remain explicitly unverified.

## Source exploration and decision evidence

Graphify first queried existing focused-call graph (100 nodes): `CallWorkspace useCallRoom DoctorClinicalPanel --budget 450`, showing13of57related nodes, explicitly truncated44nodes; no anatomy/backend coverage claim. Direct source inspection found RoomUpdates refuses incoming messages and emits refresh notifications, while existing dental/anatomy OrbitControls have no shared-camera protocol. Existing clinician panel remains clinician-only. A subsequent implementation plan must refresh the relevant call/backend/model graph corpus.

Jev selected doctor-controlled camera plus explicit patient selection/view-only policy over unrestricted shared clinical edits: jev-1.13.0, confidence1.0,400input/34outputtokens. Sanitized requirements only; this is a prioritization judgment, not a verified security result.

## Spec review

The scope is one collaboration subsystem reusing existing video, not a media-provider replacement. Default permission, patient opt-out, record privacy, event authority, replay/reconnect, model fallback, lifecycle expiry and verification limits are explicit. Freeform annotations, patient clinical editing, patient camera takeover, saved clinical-data sharing and browser push notifications are outside this phase. No implementation or schema changes have been made by this design document.
