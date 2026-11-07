# Online appointment continuity — October 21, 2026

## Scope and current activation

The user requested the next three items from the previous recommendation:4connection recovery,
5clinical notes inside the room and6end-of-appointment experience. Implemented natively, without
agents, build/typecheck/automated tests or external deployment. Current .next-local-dev and original
medframe_django remain launcher-owned. Existing public-domain preparation is unchanged and is not
active; hosting/DNS/HTTPS details for pixelsbymiku.dev remain pending.

## Implemented owners and boundaries

ConnectionRecovery consumes actual SDK local/remote connection-quality, signaling/media reconnect,
disconnect and reconnected events, plus browser offline status. It shows elapsed recovery and a
brief restored state, unknown quality does not imply measured health, and no percentage/ETA is
invented. Audio only explicitly disables outgoing camera in place or connects without video after
disconnect; it does not promise a bandwidth/network fix or disable incoming video. SDK handles
reconnect; the native cookie gateway still reauthorizes. Conversation remains mounted during media
phase changes, preserving unsent input. Full page reload/explicit leave are separate workflows.

DoctorClinicalPanel uses a nonmodal full-height overlay, lazy-loaded only for a doctor participant.
It stays mounted when collapsed and after room end, retaining unfinished clinical work. Its clinic
is pinned to the room organization, still checked against native memberships. Reuses SafetyProvider,
WorkspaceProvider, ConsultationPage/EncounterEditor, PatientContext and StaffReleases. Existing
SOAP save/version/editing lease/finalization/amendment and portal release owners remain authoritative;
there is no separate SOAP writer or guest clinical API. The room opens the editor's Notes section,
without changing existing editor defaults elsewhere. Consultation selection uses unsaved-change
guarding. Existing navigation remains native; continuing notes requires the clinician's current
clinical account authority even after room access ends.

call_clinical.context requires current doctor proof/native permission and exact patient's clinical
read scope. It returns12recent consultation summaries, not an unbounded history. Earlier history
remains in the full patient record link. connect_encounter locks/version-checks the room and binds
its nullable encounter reference to the exact patient/branch/provider; new creation delegates to
native create_encounter using stable room request identity. Existing records are not reassigned,
queue tickets are not completed/linked automatically, and no booking is marked completed by a call.
Editor requests independently enforce current native authorization. Native authenticated editor/
selection/creation and concurrent/save acceptance remain unverified.

AftercareComposer previews exact plain-text next steps and optional follow-up before an explicit
Share reviewed next steps action. The backend requires current doctor/native clinical scope, room
version and reviewed=true; validates bounded text and appends an authored RoomAftercare snapshot
for this access generation, with audit/invalidation. No update/delete API or automatic clinical
note/document release is added. Snapshots are append-only through this service, not a claim of
DB-level immutable clinical revisions. No AI-generated advice or clinical validation.

Live snapshot exposes the latest reviewed aftercare only to doctor/admitted participants, never
waiting guests. CallEndScreen retains the last already-delivered version in component memory at
room end; no new expired-guest endpoint or extended guest cookie is added. Reload after expiry
cannot fetch the instructions through the room. Sharing immediately before ending may not deliver
to every client; an empty state tells patients to check the portal/contact the clinic. Durable
portal access still needs an explicit native release by the clinician. Follow-up opens the existing
portal appointment workflow; released documents open the authenticated portal. No automatic booking,
release, payment, consultation completion or finalization occurs. Leaving remains a separate screen.

## Preservation and local activation

Source snapshot: .medframe-runtime/call-continuity-before-20261021-015047. Existing unrelated edits,
including the exact clinic-shell width snippet, remain preserved. ./medframe stop completed.
./medframe migrate made an encrypted checkpoint and verified an isolated restore of164original
tables before applying additive operations.0005_room_clinical_continuity:

- /home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261021-095614-a89bd41
- clone medframe_django_launcher_20261021_015613_99b843; source_writtenfalse.
- One nullable AppointmentRoom encounter FK and one RoomAftercare table. No original account,
  password/MFA, role/grant reset, clinical fixture import or restore over original.

This is pre-migration checkpoint/restore evidence, not a post-traffic row/storage fingerprint.
./medframe start --dist-dir .next-local-dev reported Ready. Final status: API722698, worker722886,
scheduler722887, media722888 and web723357 running; infrastructure healthy/available. Loopback media
profile retained. Prettier and Ruff formatting only; no build, automated test, typecheck/lint suite,
drift suite, physical capture or live patient transmission.

## Actual tool/source use

Graph-first query on prior213node admission corpus:
`graphify query 'CallWorkspace useCallMedia ConversationPanel participant_for' --budget400`.
164neighbors/12shown, explicitly truncated. Verified source owners and refreshed37source files from
calls, provider/editor integration, native clinical services and migration. Focused AST extraction:
283nodes/740edges, no semantic LLM extraction/private records. Private graph/corpus are under
.medframe-runtime/call-continuity-graph and call-continuity-graph-corpus. Final bounded query:
`graphify query 'ConnectionRecovery DoctorClinicalPanel connect_encounter publish_aftercare CallEndScreen' --budget450`.
145neighbors/15shown, explicitly truncated. No full repository, runtime privacy or authorization
verification inferred from graph edges.

Jev planning selected reuse1.0/confidence1.0 over parallel clinical writer/expired guest release:
modeljev-1.13.0,443input/33outputtokens. Review selected bounded1.0/confidence1.0 over complete
clinical/public validation:421input/31outputtokens. Only sanitized generic engineering state and
verification limits; no patient/identity/IDs/credentials/private attachments/logs. Judgments are not proof.

Impeccable existing room surface, craft floor and refinement guidance, PRODUCT.md/DESIGN.md and
installed Next use-client guidance followed. Context launcher had failed permission earlier in
this conversation and was not rerun. Official LiveKit RoomEvent/reference and installed2.23.0
SDK declarations informed event signatures; no dependency/vendor replacement:
https://docs.livekit.io/reference/client-sdk-js/enums/RoomEvent.html
https://docs.livekit.io/reference/client-sdk-js/

## Bounded visual evidence and findings

One CUA desktop/390×844 phone presentation pass reused actual CallWorkspace, ConnectionRecovery,
ClinicalPanelFrame, AftercareComposer and CallEndScreen with synthetic state/callbacks only. Native
clinical editor/auth/history/leases were explicitly not mocked; the preview frame said they require
an authenticated clinician. No camera/microphone access, real messages/files/instructions, account
or permission changes. Temporary route removed; source preserved privately as
.medframe-runtime/call-continuity-presentation.tsx. Browser tab closed and viewport reset.

Observed: weak connection text/audio-only action, camera-off transition, reconnect seconds and
rejoin-audio-only presentation; unsent conversation text survived phase changes. Clinical overlay
opened with focus on its heading, collapsed/reopened with both instruction fields retained.
Exact-text review included optional follow-up; synthetic sharing then showed authored/date-labelled
next steps on the phone end screen. Doctor end presentation included Continue clinical notes;
patient portal links and no-automatic-booking wording were visible. Doctor synthetic link IDs were
undefined because fixture identity routing was omitted; links were not followed and this is not
native route validation. Native missing-room route rendered startup then centered unavailable
recovery. No broad accessibility/overflow or authenticated clinical-save claim.

Activation blocker: new drawerz120 covered shared review Dialogz50. Repaired narrowly by lowering
the room-only drawer toz40, allowing existing shared confirmation/editor modals above it. One
focused phone confirmation then visibly showed exact review text and share/keep-editing controls.
No broad retest or general dialog redesign. Phone review title/close-icon spacing is tight and is
logged for later; no additional polish cycle.

CALL-CONTINUITY-001: existing CallStage camera-off fallback says Join when you're ready during
reconnecting, while recovery/status correctly says reconnecting. Wording can mislead; logged without
repair under user preference. CALL-CONTINUITY-002: actual authenticated clinical context/create/link,
lease/version save/finalization/release and aftercare authorization/races/generation/expiry remain
unverified; real device, offline/quality events and two-party audio-only/reconnect also unverified.
CALL-CONTINUITY-003: narrow-phone review heading sits close to the shared close icon; logged without
repair. Existing CALL-001/002/003, CALL-REFINE-001/002 and CALL-ADMISSION-001 remain deferred.
