# Interactive appointment models - October 21, 2026

## Implemented scope

Native signed-in appointment rooms now offer **Present model** in the call toolbar: permanent Dental, Body anatomy, or Skeleton. A shared stage replaces the main video area while the same media attachment nodes remain mounted in a collapsible tile; conversation and clinical owners stay mounted. Doctor rotation/zoom/pan use a reusable imperative shared-camera bridge with throttled updates, remote interpolation, aspect-aware framing and feedback suppression. Optional adapter props preserve ordinary dental/anatomy editor defaults. Generic models receive empty clinical finding arrays; no patient-side clinician editor/provider or private record fetch is introduced.

Doctor focus and patient pointer are separate temporary model locations. Doctor alone owns the camera and can focus the patient's pointer; patients choose a part/surface only when enabled. Named Parts lists/search and existing maps provide accessible fallback; source tooth meshes do not identify clinically reliable surfaces, so surfaces are chosen explicitly. Patient **View only for me**, persistent mode labels, enable/revoke/start/stop/reconnect notices and polite live regions make interaction state visible. No browser notification permission, recording, AI or screen-capture permission is requested. Saved clinical findings/notes/history are not shared; native clinical save/release remains separate.

## Authority and transport

Dedicated `/ws/calls/<uuid>/presentation` uses the existing exact-origin ASGI validator and native participant_for policy with lobby access disabled. Server reauthorizes connect/receive/delivery and periodically checks idle access. Strict4KiB commands, finite/bounded camera values, current asset/structure/tooth IDs, server-derived actor identity and separate selection epochs constrain input. Atomic Redis WATCH transitions serialize state; room/generation/epoch/revision and scene revision prevent stale commands. No clinical or appointment version is incremented for model movement. State expires no later than the authorized room deadline; native end/reset/removal schedules cleanup. Browser reconnect requests an authoritative snapshot and discards queued pre-disconnect movement.

Existing shared channel configuration caused Redis read timeouts during the initial native pass. Activation repair adds a **presentation-only** Channels alias with a10-second receive timeout, distinct prefix, and30-second group renewal under a60-second lease. It removes short timeout query options only from this new alias, retaining origin/auth checks. The existing default operations/room-updates layer and its unrelated timeout behavior remain unchanged. The source store uses short nonblocking Redis timeouts and fails collaboration closed if unavailable. Bounded camera send interval80ms (~12.5/sec), server camera ceiling20/sec allows the planned small burst; patient pointer limit5/sec/action. No dependency, schema or migration was added.

## Preservation and local runtime

Before-source copies are private in `.medframe-runtime/interactive-call-before`; final touched-corpus copies in `.medframe-runtime/interactive-call-final-source`. Unrelated changes and the existing serving artifact remain preserved. Fresh encrypted checkpoint `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261021-184031-a89bd41` restored independently to `medframe_django_interactive_call_20261021_104030_2765bc`, verifying167tables, source_written=false. No clone was imported over the original database.

Manual review used a newly created, clearly synthetic clinic/doctor/patient/appointment. Existing native role definitions were reused without reseeding/changing original permissions; no original credential/MFA/grant was changed. Synthetic MFA-complete session fixtures exercised existing room authorization but do not constitute real MFA challenge verification. Native create/join/admission services issued room proofs. Cleanup ended the synthetic room and deactivated its review sessions/account/membership/clinic; retained synthetic audit/history rows were not hard-deleted.

Only local launcher-owned services were restarted. Temporary port-bind refusals after stop were respected; no unmanaged process was killed or port guard bypassed. `.next-local-dev` remains the frontend artifact, original `medframe_django` remains the backend database. No public deployment, internet calling or live external messages/money movement.

## Actual bounded browser evidence

Used CUA to operate the real AppointmentCall/CallWorkspace and native server channel in two independent credentialless iframe storage partitions under separate temporary top-level review pages. This kept the user's browser session untouched. [Chrome's credentialless documentation](https://developer.chrome.com/blog/iframe-credentialless?hl=en) supports the temporary per-document storage isolation mechanism. Development-only, expiring synthetic bootstrap routes supplied the fixture proofs; **native participant/origin authorization remained active**. A temporary SAMEORIGIN frame header applied only to these review routes; the ordinary app retained DENY. Review routes and that header exception were removed, with the original Next configuration restored before final frontend activation. Private helper sources/metadata are retained under `.medframe-runtime`; no fixture endpoint ships.

One batched native pass encountered the Redis idle receive blocker and browser GPU unavailability; one focused activation confirmation followed the channel repair. Actual observed behavior:

- Doctor started Dental; patient received the same presentation with View only initially.
- Doctor enabled patient selection; patient received the exact notice and enabled Parts controls.
- Patient selected tooth11, then Facial; doctor saw `Patient pointer: Tooth11, facial`.
- Doctor chose Focus here; doctor focus and patient pointer both showed tooth11/facial, without creating a clinical record.
- Patient chose View only; tooth/surface buttons became disabled while the presentation remained available.
- Doctor switched to Body anatomy, then Back; patient received Body and the Back reference-map state.
- Patient searched `posterior region of arm`, selected the right-side structure; the doctor received the separately labeled pointer. This occurred after several minutes of idle time, exercising the renewed presentation group membership.
- Doctor revoked selection; pointer cleared. Patient reloaded its isolated review page and received the current Body/Back/View-only snapshot with no stale pointer.
- Stop presenting returned both participants to the call stage with a stop notice. Doctor draft `Retain this consultation draft` remained in the existing composer across presentation/model changes and stop.
- Native End for everyone confirmation opened with Cancel initially focused. The confirm request was sent; browser tabs were closed before visual completion, so end-browser acceptance is **not** claimed. Scoped fixture cleanup subsequently confirmed/finished room ending through native ownership.
- Measured native patient document bounds:390×844 (scroll375×844),1024×768 (scroll1009×768),1440×900 (scroll1425×900), no page overflow. Doctor captures used its1280×720 native default; viewport overrides affected the patient tab. Do not infer a full doctor breakpoint matrix.

**Important limitation:** the review browser reports `GL_VENDOR=Disabled`, `GL_RENDERER=Disabled` and WebGL context creation failure. Existing model boundaries correctly showed the dental Parts fallback and anatomy reference map. **Free3D rotation/zoom, actual mesh highlighting, interpolation/aspect fit and default clinical-editor GPU behavior remain unverified.** Named view/selection events are real server-mediated evidence, not proof that a3D camera was rendered successfully. No GPU/security setting was bypassed and no fake stream/model image substituted.

Patient-side original room UI also reported intermittent “Connection lost” feedback while presentation commands continued to synchronize. API logs retain the pre-existing default RoomUpdates Redis timeout; this phase isolates the new presentation channel only. Camera/microphone, LiveKit media, native file transfer, pending-lobby denial, forged-command/race/rate boundaries, forced Redis failure, Skeleton-specific interaction, room reset/natural expiry, screen-reader/keyboard matrix and actual internet/device calls remain unverified. Log these limits rather than run broad retries.

Prettier formatted touched frontend files and Ruff formatted touched Python. No builds, automated tests, typechecks, lint/audit suites or new test files were run.

## Graphify and Jev

Queried the existing319-node planning graph before edits for participant_for/Dental3D/AnatomyScene, with bounded/truncated output; direct source remained authoritative. Final local AST refresh covers65selected code files,415nodes/1090edges; `config/asgi.py` again yielded no symbols and was read directly. These are scoped code relationships, not whole-repository/security verification. Artifacts/manifests reside in `.medframe-runtime/interactive-call-final-*`; no patient records, credentials or private assets were submitted.

Jev selected preserve_camera over pointer-triggered refit, confidence0.96 (probabilities0.98/0.02), jev-1.13.0,384input/36outputtokens. Sanitized rendering/interaction state only; this is a risk/design judgment, not a verified result. Prior approved design/plan evidence records the authority-first and controlled-mode judgments.

## Deferred findings

INTERACTIVE-CALL-001: GPU/camera/native security/media acceptance gaps above.
INTERACTIVE-CALL-002: Initial Redis blocking-receive activation blocker repaired only for this presentation alias; default updates-channel timeout remains deferred.
INTERACTIVE-CALL-003: Nonblocking fallback/call presentation refinements: patient header retains old “Waiting for patient” copy, blank selected-tooth text before any selection, narrow fallback map/helper text can be clipped by the compact video tile, and existing waiting-room image/Three.Clock warnings. No unrelated polish/repair cycle was attempted.

Final activation snapshot: API1715134, worker1715275, scheduler1715276, media1715277 and web1748682 running; launcher reports localhost:3000 ready. Restored Next configuration compared byte-for-byte with its pre-review copy (no remaining frame exception). Final Graphify query `SharedCameraBridge ModelPresentationConsumer --budget 250` showed7of45related nodes, explicitly truncated38nodes; final refreshed graph is415nodes/1090edges. No additional browser round was performed after scaffold removal. Superseded socket callbacks are guarded so a closed older socket cannot change the current connection's readiness.

Final sanitized Jev coverage judgment chose bounded reporting over full verification, confidence1.0, jev-1.13.0,421input/31outputtokens. It supports report prioritization only; actual evidence/limitations above remain authoritative.

### Waiting-room copy follow-up — October 21, 2026

Shortened the native `ROOM_EARLY` message to “This room opens on {opening date and time} ({timezone}).” The schedule card and existing reschedule link retain their context; room timing and authorization are unchanged. Removed the now-unused scheduled-date local. Source backup: private `.medframe-runtime/waiting-copy-before/call_policy.py`. Root Graphify query `appointment-room-schedule call_policy --budget 180` returned a stale, bounded root graph (6/274 nodes shown); direct policy and schedule-component inspection established the duplication. Sanitized Jev choice selected concise copy (confidence .98; 363 input/33 output tokens, jev-1.13.0). Ruff format left the file unchanged. No builds, automated tests, or browser acceptance claim for this copy-only follow-up. Launcher restart initially encountered its recently closed port guard; no unmanaged process was terminated.
