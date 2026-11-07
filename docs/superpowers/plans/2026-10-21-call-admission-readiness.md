# Call admission, device checks and connectivity — implementation plan

User approval: “proceed” to the recommended connected next phase. Execute natively; no agents.
Use the existing online-room design and native policies. No build or automated tests; one visual
pass, log findings, preserve original data and activate via ./medframe. Do not publish a service.

1. Add room-participant admission, self-reported device checks and last-check-in metadata.
   Preserve existing participants as already admitted in the additive migration; new patients
   default to waiting. Lobby snapshot/update socket/readiness remain available, while media,
   chat, history, upload/download and the native media enforcer require admission. Doctor actions
   bind exact participant/current generation plus room version, preserve audit and atomically
   admit/revoke. Removing a lobby session does not change a PIN or ban a future new request.
2. Extend the existing media owner with local microphone signal metering and an explicit speaker
   tone/confirmation. Stop analysis/tone resources on leave, context/access change or unmount.
   No media bytes are uploaded by preflight. Persist only three self-report booleans, not samples
   or device identifiers. Waiting UI contains its own camera/device check and real doctor-admission
   status, not room conversation/files. Doctor sees exact waiting session and arrival/check-in.
3. Prepare cross-device secure connection configuration for the user's selected target. Keep
   default loopback behavior and trusted origin/cookie/credential boundaries. Do not broaden
   listeners, public networking or trust stores without the required connection-target details.
   If those details are pending, implement read-only readiness and a concrete configuration guide.
4. Prettier/Ruff format supported sources, refresh focused AST relationships, use sanitized Jev
   judgments, checkpoint/restore with the launcher before additive migration. Activate locally and
   perform one synthetic desktop/phone visual pass plus native entry/recovery. Live hardware,
   two-party/admission/security acceptance remains explicitly unverified unless actually observed.
