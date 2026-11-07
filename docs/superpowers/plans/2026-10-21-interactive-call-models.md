# Interactive Call Models Implementation Plan

> **Execution method:** Native implementation in this chat, with no subagents, delegated reviewers or separate chats, as explicitly selected by the user. These instructions override the planning skill's agent/reviewer defaults. Review this plan before implementation. Internal tasks form one connected delivery, not separate user handoffs.

**Execution status:** Implemented natively in the current working tree and activated locally October21. Original task checkboxes below are planning requirements, not a claim that all acceptance cases passed. See `docs/operations/interactive-call-models-verification.md` for real two-session selection/view-state evidence, the repaired presentation-only Redis blocker and the unverified WebGL-camera/security/media cases. No further approval is pending for this completed implementation phase.

**Goal:** Let a doctor present synchronized dental/body/skeleton models in an online appointment, with optional patient selection, view-only participation and clear in-room notifications.

**Architecture:** A dedicated authorized Channels socket carries strictly validated model/camera/pointer commands. Redis holds ephemeral room/generation/epoch-scoped state; existing clinical and appointment state is not rewritten for camera traffic. Both participants reuse the native model renderers behind optional camera adapters while existing video/chat and clinical owners stay mounted.

**Tech Stack:** Django/Channels, existing Redis client and infrastructure, Next.js/TypeScript, React Three Fiber/Three.js, shadcn/ui, Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-21-interactive-call-models-design.md` (approved by the user October21).

## Global constraints

- No subagents, builds or automated tests. Prettier/Ruff formatting only, followed by one bounded real-browser review and at most a focused activation-blocker confirmation.
- Preserve the current source/runtime, original database, credentials, MFA, grants and private storage. No reset, public deployment, fixture import or live external message.
- Default patient mode is View only. Doctor alone controls camera/presentation; patient interaction is temporary selection only when enabled.
- Share generic models and temporary pointers only; no private findings, notes, clinical data fetchers or automatic clinical saves/releases on the patient device.
- Reuse native room policy and current media provider, existing model registries and supported permanent dentition. No recording, AI, screen capture or new dependency/service.
- Full-viewport room, essential call controls accessible, mounted conversation draft/upload owner, separate clinical finalization.
- Always activate locally through `./medframe` after implementation. No schema migration is expected for ephemeral presentation state.

## Review focus

1. Revocation/expiry races: a patient must lose selection immediately even if an old pointer command is in flight; room access revocation must stop outgoing deliveries too. Owned by tasks1/2/5.
2. Cross-device framing and stale cameras: different aspect ratios, late packets and programmatic camera changes must not create clipping, feedback loops or stale-epoch resurrection. Owned by tasks2/3/5.
3. Redis/socket failure: disable collaboration interaction and show reconnection state without disconnecting media or discarding chat drafts. Owned by tasks1/2/4/5.
4. Asset mismatch/WebGL loss: retain labeled selection and an accessible list/2D fallback rather than pretending the 3D view is synchronized. Owned by tasks1/3/4/5.
5. Multiple valid clients, duplicate commands and rapid mode changes: server-derived actor identity, atomic state, revision/permission epochs and limits must remain authoritative. Owned by tasks1/2/5.

The user's visual-only preference means these are explicit browser acceptance cases and source-review obligations, not promises of automated security coverage. Any unexercised boundary remains logged as unverified.

## Task 1 — Authorized ephemeral presentation state

**Create:**
- `services/api/medframe_apps/operations/call_presentation_protocol.py`: strict command/state validation and asset/location allowlists.
- `services/api/medframe_apps/operations/call_presentation_store.py`: Redis state, atomic transitions, rate limits and expiry.

**Consume:** `participant_for(socket_request(scope), identifier)` from existing call_policy with `lobby=False`; existing `anatomy_reference(1)` and public dental asset metadata. Do not weaken these owners or use `health=True`: generic model presentation need not depend on a healthy media lease.

**Produce:**
- `presentation_authority(scope, identifier) -> tuple[AppointmentRoom, RoomParticipant]`: reuses current participant policy, verifies admission and room generation, returns trusted actor identity. Presentation can start while the room is open/admitted before live media starts; it confers no media access.
- `parse_presentation_command(raw: str) -> PresentationCommand`: strict fields, bounded envelope and JSON validation.
- `presentation_snapshot(row, participant) -> PresentationState`: admitted authorized current-room view only.
- `apply_presentation_command(row, participant, command) -> PresentationEvent`: atomic actor/epoch/permission validation and transition.
- `clear_presentation(identifier, generation) -> None`: idempotent cleanup after committed end/reset/removal.

**State contract:** protocol_version1; room generation; server-generated presentation epoch UUID; increasing revision; presenter participant ID; active/model/asset_version; canonical camera; scene configuration; doctor_focus; nullable patient_pointer; allow_patient_selection; selection_epoch. No names, notes, diagnoses, URLs, raw record IDs, arbitrary metadata or saved findings in payloads. Pointer lifetime belongs to the room; no durable pointer log.

**Commands:** start_presentation (doctor, server-approved model/asset), set_camera (doctor), set_focus (doctor), set_selection_permission (doctor), stop_presentation (doctor), point_at_part/clear_pointer (patient, allowed selection_epoch). A new model presentation gets a new epoch; stop retains a higher-revision inactive tombstone so delayed packets cannot resurrect it. Patient payloads cannot set camera/asset/permission/actor.

- [ ] Save a private before-source manifest/copy of each touched existing file; preserve the serving artifact and original data without importing review records.
- [ ] Define immutable typed commands/state, reject unknown fields and malformed JSON, reject nonfinite camera numbers and unsupported locations/assets. Limit raw messages to4KiB; camera target/position/up must be finite bounded triples with nonzero up/view direction, valid perspective field of view, and asset-appropriate distance bounds.
- [ ] Derive permanent-tooth IDs/surfaces from the current public dental definitions; resolve anatomy structure/layer/asset identity from the backend manifest, never caller URLs. Share no primary or unsupported reference model accidentally.
- [ ] Implement Redis room/generation keys and atomically serialize commands, with TTL no later than the live room end. Revalidate current permissions and selection_epoch within transitions. Bound command frequency per participant (camera at most15/sec with bounded burst, patient pointers at most5/sec); return a recoverable error without logging the payload.
- [ ] On Redis failure, fail collaboration closed and preserve the ordinary room/media/chat. Extensions can refresh an existing state TTL only after native room authority verifies the new end; never extend beyond it.
- [ ] Source-review the five focus classes above; record unverified denial/race cases for the bounded browser review rather than running automated tests.

## Task 2 — Dedicated socket and lifecycle

**Create:** `services/api/medframe_apps/operations/call_presentation_consumer.py`.
**Modify:** `services/api/config/asgi.py`, `services/api/medframe_apps/operations/call_service.py` (committed lifecycle cleanup hooks only).

**Produce:** `ModelPresentationConsumer(AsyncWebsocketConsumer)` at `/ws/calls/<uuid:identifier>/presentation`, under the existing exact WEB_ORIGIN validator/AuthMiddlewareStack. Its snapshot/event payload is task1's PresentationState/Event, never the broader clinician snapshot.

- [ ] Authorize on connect, command receive and every group delivery; periodically recheck idle sockets using the existing two-second authorization pattern. Lobby sessions never join the group.
- [ ] Send authoritative snapshot on connect and after rejected stale control changes. Derive actor/room/generation on the server. Broadcast only accepted state transitions; serialize event order with server revisions.
- [ ] Close unauthorized sockets and clear their access immediately; recoverable schema/rate/Redis errors must not create a global refresh/render loop. Keep this path independent of RoomUpdates, appointment version and clinical versions.
- [ ] Clear ephemeral state after committed native end/reset/removal; retain live-room/participant reauthorization as the final boundary if cleanup delivery fails. Ordinary socket disconnect does not end the presentation, allowing rejoin until room expiry.
- [ ] Record visual cases: pending admission rejected, independent authorized participants synchronize, revoked selection/stale epoch rejected, end/reset prevents further delivery. Do not replace these cases with a synthetic local callback demo.

## Task 3 — Reusable camera bridge and model adapters

**Create:**
- `apps/web/lib/three/shared-camera.tsx`: reusable optional external pose/camera-change adapter.
- `apps/web/features/calls/presentation-types.ts`: frontend strict protocol types/decoding.
- `apps/web/features/calls/shared-dental-model.tsx` and `shared-anatomy-model.tsx`: call-only generic model adapters and labeled pointer overlays.

**Modify only through optional props:**
- `apps/web/features/dental/dental-3d.tsx` and its native scene/viewport collaborators only where needed for camera/framing hooks.
- `apps/web/features/anatomy/anatomy-scene.tsx` / `anatomy-viewport.tsx`.

**Produce:**
- `SharedCameraPose = { position: [number,number,number]; target: [number,number,number]; up: [number,number,number]; fov: number; aspect: number }`.
- `SharedCameraBridge({ pose, controlled, onPoseChange, revision })`: doctor-controlled orbit changes emit; remote pose application never re-emits.
- `SharedModelProps = { presentation; role; canSelect; onFocus; onPoint; onCamera; onUnavailable }` for both adapters. No clinical encounter/provider context required.

- [ ] Add optional camera/interaction/framing props with existing editor defaults unchanged. In presentation mode, patient OrbitControls are disabled even when tooth/structure selection is enabled.
- [ ] Use existing model coordinates and stable tooth/surface/structure IDs. Keep camera target centered; compensate for sender/receiver aspect ratios to fit the presented scene, interpolate incoming movement and always apply the final settled pose. Do not synchronize DOM coordinates.
- [ ] Pass empty clinical finding arrays and no private annotations to call adapters. Do not import DoctorClinicalPanel or mount its providers on patient paths.
- [ ] Draw distinct labeled doctor focus and patient pointer, with a doctor Focus on patient selection action; pointer alone cannot move the camera or create a finding.
- [ ] Keep shared scene configuration (layer/jaw/isolation/named view) authoritative; prevent ordinary focus effects from overwriting received camera poses after synchronization.
- [ ] Reuse accessible tooth/surface/structure lists and existing2D/maps for fallback. On unsupported asset version, show unavailable/resync rather than loading another model under the same coordinates.
- [ ] Include phone/tablet framing, keyboard list selection, asset failure, camera feedback and ordinary editor-default preservation in the bounded review checklist.

## Task 4 — Integrated room presentation and notices

**Create:**
- `apps/web/features/calls/use-model-presentation.ts`: socket lifecycle, protocol decode, coalescing and authoritative state.
- `model-presentation-stage.tsx`, `model-presentation-controls.tsx`, `model-presentation-notice.tsx`: focused layout/control/notification components.

**Modify:** `appointment-call.tsx`, `call-workspace.tsx`, `call-controls.tsx`, and `call-stage.tsx` only as required to retain native media mounting during presentation.

**Produce:** `useModelPresentation(state: CallState, enabled: boolean)` returns `{ presentation, connection, error, notice, localViewOnly, setLocalViewOnly, start, stop, setCamera, setFocus, setSelectionPermission, point, clearPointer }`. The enabled boundary excludes lobby/left/ended states. All mutating functions enforce local role/state as usability guards; server checks remain decisive.

- [ ] Connect only authorized admitted room roles, close on leave/end/generation change, reauthorize/resnapshot after reconnect, drop stale revisions and commands for another epoch, discard queued pre-disconnect camera/pointer commands. Never replay a patient's old selection across permission changes.
- [ ] Coalesce doctor camera state to at most15updates/sec plus a final settled pose. Avoid rerendering the complete call/clinical aggregate for each frame; keep the camera bridge update path local. Show frozen/reconnecting state and disable outgoing interaction when unsynchronized.
- [ ] Add Present model choice for Dental/Body/Skeleton, Stop presenting, patient-selection toggle, focus/isolate/reset/view actions. Start selection permission false for each new epoch.
- [ ] Let the shared stage occupy the video area while existing local/remote/audio DOM attachment nodes remain mounted in a collapsible call tile. Switching content never remounts useCallMedia, CallConversation or the clinical editor; Stop restores the call stage.
- [ ] Implement patient View only for me as room/presentation-local state. Effective selection requires server permission, synchronized connection, active room and no local opt-out. Doctor presentation/camera remains visible in either mode.
- [ ] Use the exact approved enable/revoke notice copy, persistent mode label, polite live region for transitions and explicit patient opt-out action. Announce start/stop/resync once per epoch/revision transition; never toast every camera packet or request browser notification permission.
- [ ] Preserve compact header/anchored controls and current single conversation dock. Shared shadcn controls handle secondary tools; narrow screens do not introduce page scrolling.

## Task 5 — Bounded native visual review and activation

**Update:** `docs/operations/interactive-call-models-verification.md`, `docs/operations/error-log.md`, `.impeccable/surfaces/online-appointments.md`, and relevant design/working context.

- [ ] Format touched TS/TSX with existing root Prettier and Python with existing Ruff formatter. Do not run builds, automated tests, typechecks, audit suites or broad lint.
- [ ] Review source against the approved spec and task interfaces. Refresh the scoped Graphify corpus after implementation and record query truncation/coverage limits; use Jev only for sanitized narrow decisions.
- [ ] Prepare isolated synthetic room/participant records if needed, using existing native creation/authorization owners. Preserve real roles/MFA/credentials. Use independent browser cookie contexts for doctor and patient, with the exact configured origin; never bypass WS origin validation or expose a development preview route publicly.
- [ ] One batched browser pass at1440×900,1024×768,390×844: start Dental then Anatomy; show actual cross-session rotation/zoom/focus; enable/disable patient pointer; opt out; inspect notices and accessible list fallback; reconnect/resnapshot; check chat draft/media-node continuity and no page overflow. Explicitly distinguish native synchronization from presentation fixtures.
- [ ] Include forbidden lobby session, stale epoch/permission after revocation, room end/reset/expiry, Redis/connection failure and asset mismatch in that pass where reproducible through native UI. Log each unavailable or failed case honestly; no automatic broad retry/fix loop. Hardware/internet media acceptance is separate from shared-model synchronization.
- [ ] Remove temporary preview routes/fixtures, preserve before/final source privately, restart owned services through `./medframe`, and perform one focused confirmation only for required activation blockers. No schema migration expected; if that assumption changes, stop to reconcile the approved ephemeral design before adding persistence.
- [ ] Report implemented behavior, actual visual evidence and open gaps. Do not claim security/internet/live-media acceptance from a local layout check.

## Plan self-review and tool evidence

All approved spec sections map to tasks1–5; generic-model privacy and exact-room admission are owned by1/2/3, synced camera and2D alternatives by3, notifications and view-only policy by4, continuity/activation and actual cross-session evidence by5. No saved clinical-data sharing, patient orbit takeover, recording or push notification feature was added.

Initial Graphify query used the existing100-node call graph and returned7of48nodes (41omitted,250-token budget), so planning source inspection did not assume anatomy/backend coverage. Refreshed a49-code-file corpus including current call UI, call backend policy/service/consumers, both renderers and anatomy reference loader:319nodes/800edges. Extractor reported `config/asgi.py` yielded no symbols; its routing was read directly. This is AST relationship evidence, not security verification or whole-repository coverage. Scope/graph artifacts are private under `.medframe-runtime/interactive-call-plan-*`.

Jev selected authority-first over UI-only controls, confidence1.0, jev-1.13.0,415input/34outputtokens; sanitized requirements only. No implementation, runtime, schema or credential changes were made while preparing this plan.
