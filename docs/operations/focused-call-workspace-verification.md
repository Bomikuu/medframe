# Focused online appointment workspace — October 21, 2026

## Scope and preservation

Implemented the user's supplied full-viewport room brief as one native UI batch. The signed-in room now uses a constrained `100dvh` shell, compact appointment identity/status/time header, expanding dark video stage and anchored controls. Removed vertically stacked device/appointment sections from the room. Settings opens the existing device checks in a Dialog; a mirrored local camera preview reuses the current stream without requesting capture or stopping tracks. Output selection remains the browser default, honestly described rather than adding an unsupported selector.

Chat/files use shared shadcn Tabs in a single mounted nonmodal Sheet dock: inline desktop, overlay on narrow screens. Hiding preserves its draft and upload owner; messages/files scroll internally and the composer remains anchored. The nonmodal dock intentionally leaves call controls usable. Appointment/admission details use a Sheet, +5/+15 time choices use a Popover with prospective written end dates, and help/privacy uses a Dialog. Local preview can expand/minimize without unmounting the original media attachment ref. Remote video uses contain framing.

Original AppointmentCall, useCallRoom, useCallMedia and CallConversation mutation owners remain unchanged. Admission, starting the appointment, joining media, leaving, ending for everyone, clinical editing/finalization and explicit releases remain separate operations. Existing end/leave confirmation remains in AppointmentCall. No backend/schema/migration/auth/provider/recording/AI change. Pre-PIN entry and patient preflight remain their separate existing surfaces. Existing original database/accounts/private storage were not written by the presentation fixture; no review data imported.

Before-source copies: `.medframe-runtime/focused-call-before`. Final source copy: `.medframe-runtime/focused-call-source`. Temporary development presentation route was removed while the frontend was stopped; its synthetic source is retained privately at `.medframe-runtime/focused-call-presentation.tsx`. No fixture route ships. Prior source/checkpoints and unrelated changes remain preserved.

## Visual evidence and limits

Used CUA on the native Next.js development renderer with a synthetic presentation fixture composing real CallWorkspace, ConversationPanel and useCallMedia (capture/connection disabled). Names/messages were synthetic, actions changed fixture state only; no native PIN, room admission, payment, upload, or record mutation was performed.

One batched pass and a focused confirmation covered 1440×900, 1366×768, 1024×768 and 390×844. Read-only DOM measurements reported document heights equal to viewport heights (900/768/768/844), widths within the viewport. Screenshots showed large video, fixed controls and desktop dock; phone chat overlays the stage and retains composer access. The first pass found global heading sizing and unwrapped prospective time labels; these were corrected in one batch, along with camera placeholder spacing, then visually confirmed.

Observed settings Dialog with camera/mic choices, real microphone meter/speaker controls, connection state and honest default output; appointment-information Sheet with exact written dates/timezone and admission controls; Add Time Popover with contained +5/+15 choices; Chat/Files tab and empty file state; retained `Keep this draft` text across hide/reopen and tab changes; synthetic admission/start replacing Start appointment with Join call. Synthetic end confirmation opened with Cancel. Browser warning/error log query returned no entries. One chained locator attempt after dismissing the time popover did not open chat and timed out at the subsequent Close lookup; a fresh tree and direct visible toggle opened it with the draft retained. No claim of an unexplained native room defect or backend acceptance follows from that locator failure.

Actual hardware permissions, two-person live media/reconnect/expiry, native admission/start/extension/end, secure upload/download, server errors and clinical navigation remain **FOCUSED-CALL-001**. No automated tests, builds, typechecks, lint/audit suites or new test code were run under the user's visual-only instruction. Prettier formatted changed files only. Browser synthetic presentation does not establish full native integration acceptance.

## Graphify and Jev

Queried the existing 49-node reference graph first for CallWorkspace/CallStage/conversation/settings; it lacked full workspace coverage. Refreshed a local code-only AST corpus under `.medframe-runtime/focused-call-graph-corpus`, producing 100 nodes / 316 edges; no semantic/private-data submission. Initial extractor attempt failed because its output parent was missing, then completed after creating that directory. Post-change query `CallWorkspace ConversationDock CallControls AppointmentTools --budget 500` showed 15 of 49 related nodes, explicitly truncated (34 omitted). Source inspection remained authoritative; no whole-repository coverage claim.

Jev chose `focused` (viewport shell, mounted conversation, original callbacks/refs) over rebuilding backend/provider, confidence 1.0, model jev-1.13.0, 390 input / 32 output tokens. Only sanitized UI requirements were submitted. This is a prioritization judgment, not verification.

## Local activation

The original development runtime uses `.next-local-dev`. The frontend was stopped through `./medframe`, fixture route removed, then restarted through the same launcher. API/worker/scheduler remain original. Launcher status revealed the local media supervisor had stopped with an existing TimeoutError; a bounded launcher backend start was used to restore it without changing supervisor code. See error log for the deferred timeout cause. No public deployment or internet reachability claim.

Activation confirmation: launcher reports ready at localhost:3000; final status shows API1419981, worker1420196, scheduler1420197, media1507820 and web1511042 running. Final refreshed AST graph remains100nodes/316edges. The existing local media restart is confirmed running at this snapshot; timeout root-cause repair remains deferred.
