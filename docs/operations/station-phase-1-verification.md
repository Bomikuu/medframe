# Medframe Station Phase 1 — October 19, 2026

## Active local scope

Branch `codex/medframe-station-phase-1`, implementation `64c1aa4`, build `.next-station`, build ID `7VJr_QsFDfCmxLpuJwVEz`. Native implementation and review only; no subagents, separate chats, push or public deployment.

- Clinic administration: `/clinic/settings/stations`. Requires existing `organization.manage` permission in the assigned branch; platform access or native superuser status alone does not grant it.
- Public device pairing: `/station`. Eight-character single-use, digest-only, five-minute codes, shared Redis attempt limits, physical verification phrase and explicit clinic approval. No patient data in pairing/configuration responses.
- Focused clinical home: `/station/clinician?organization=<id>`; consultation `/station/clinician/consultations/<id>?organization=<id>`. Native named staff MFA and existing clinic/branch/patient permissions remain mandatory. Desktop browsers can also open the focused workspace; receiving a handoff requires an approved clinician device.
- Existing EncounterEditor/RHF/EncounterDraft and aggregate version remain the single clinical owner. Existing dental/anatomy charts, point notes, SOAP/diagnoses, procedures, scoped documents, treatment plans, medical context, linked queue status and authorized financial controls are accessible in the same workspace. Doctors receive no billing permission merely by using Station.
- A fifteen-minute renewable editing lease guards the existing encounter write policy, including save, templates, transitions, finalization, amendments and encounter-linked documents. Lock saves first, locks the lease and signs out; reauthentication and explicit resume are needed. Lost ownership preserves memory-only input and immediately blocks server writes; the UI learns through fifteen-second polling.
- Save-and-handoff captures an acknowledged version and bounded tab/tooth/surface/anatomy selection. Five-minute offers preserve sender ownership until explicit recipient acceptance. Device transfer retains responsible provider. Separate responsibility handoff names an existing eligible clinician, captures summary/tasks, rechecks their patient access, changes only unfinished care and records sender/receiver/time through append-only Station events and audit. An active linked queue must be resolved before changing provider.
- Native device credential and staff session are separate. Device revocation/expiry/mode checks apply to record APIs and operational Admin; paired kiosk/display modes cannot inherit staff access. Credentials expire after thirty days and re-pairing invalidates old credentials.

Kiosk/display devices can be configured, paired, approved and revoked, but their operational content is explicitly labelled as later-phase work. This is **Phase 1**, not delivery of the entire Station brief.

## Preservation and activation

Source checkpoint: `73bd9d6` / `checkpoint/pre-station-2026-10-19`. Approved design/plan `f49abdb`; previous active `.next-clinic-onboarding` remains available. Prior Django/FastAPI checkpoints are untouched. The previously authorized platform role addition to `admin@medframe.example.com` is already part of the baseline being preserved; no account/password/MFA changes were made for Station.

Initial encrypted database checkpoint and verified restore: `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-174102-73bd9d6`, review DB `medframe_django_station_review_20261019`. Fifty private objects were encrypted and verified into `medframe-review-station-20261019`; originals were not written. Review API used separate Redis DBs 13/14 and that isolated storage bucket; no review worker or live SMS was enabled. Browser fixtures used synthetic identities and native MFA-complete test sessions, not a repeated UI login test. Private session/credential material remains outside Git.

After stopping original web/API/worker/beat, a fresh encrypted checkpoint/verified restore was created at `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-180441-64c1aa4`; restore DB `medframe_django_station_activation_20261019`. The helper retains its historical `pre-batch2` naming prefix. All fifty objects were separately restore-verified into `medframe-review-station-activation-20261019` before cutover.

Only `stations.0001_initial` and `0002_event_integrity` were applied to original `medframe_django`. **All 5,071 original rows across 115 tables matched preservation fingerprints before traffic resumed.** Additive tables and framework content-type/permission/migration metadata are separate. Fingerprints and encrypted backups are private, outside Git. No review clone or synthetic patient was imported into original data.

| Service       | PID    | Tool session | Configuration                            |
| ------------- | ------ | ------------ | ---------------------------------------- |
| Next web      | 617652 | 87943        | port 3000, `.next-station`, original API |
| Django API    | 617644 | 46201        | port 8000, original `medframe_django`    |
| Celery worker | 617643 | 39833        | original broker, concurrency 2           |
| Celery beat   | 617646 | 81248        | `/tmp/medframe-station-original-beat`    |

Runtime logs: `/tmp/medframe-station-{web,api,worker,beat}-runtime.log`. Station returned HTTP 200 and API readiness 200. Unauthenticated device management returned the expected 307 login redirect. The same-origin public CSRF/context smoke check also returned 200 with no patient-field keys. Local SMTP remains 127.0.0.1:51025; SMS live delivery remains disabled. Review web/API were stopped after evidence collection.

The final source boundary review also added `/admin/` to non-clinical device blocking. The existing Admin exposes only scoped read-only organization/branch data, but a paired kiosk/display should not gain that staff surface. An expanded focused middleware case confirms HTTP 403. This backend-only repair did not require another UI build or broad test pass.

## Actual bounded verification

- Initial production build/TypeScript passed. Initial accumulated backend run: **20/30 passed**; ten lease-dependent tests stopped at one PostgreSQL nullable-join lock error. Locking only the lease table with `of=("self",)` retained the encounter lock and resolved all ten in focused confirmation. **Thirty distinct cases have passing evidence across staged runs**, not a claimed repeated clean thirty-case suite.
- Existing encounter/patient policy cases and new Station cases cover staff MFA/realm, tenant/branch/clinical-grant isolation, role denial, pairing digest/reuse/expiry/approval, capability validation, old/contextless writer denial, lock/reclaim, offer cancellation/expiry/version invalidation, same-clinician acceptance, replay denial, selection persistence, responsibility attribution/provider version change/no implicit grant, finalized-care denial, append-only events and public response privacy. The later one-case Admin confirmation expands an already counted case; it is not a thirty-first distinct case.
- The necessary UI blocker repair mounts the existing editor after lease bootstrap and initializes restored selections once, rather than mirroring them with state-setting effects. The rebuilt production artifact/TypeScript passes. Scoped Ruff passes; migration drift reports no changes. Correctly scoped ESLint has **zero errors and one existing anatomy unused-`Bot` warning**, left deferred. The first lint command lacked the app working directory; its configuration failure is retained.
- Initial browser group passed device creation, eight-block code input, explicit physical approval and four responsive captures. It then stopped at a harness accessible-name mismatch: the existing dental patient title overrides the aria-label. Source/DOM diagnosis showed the real chart. The established `data-dental-editor` selector resolves the harness issue without changing the product.
- A remaining-only continuation reached save/offer but its unscoped patient heading matched both the draft list and acceptance preview. Scoping to the handoff region resolved that second harness ambiguity. Final remaining checks passed **three groups, zero page errors**: saved same-consultation acceptance on the approved tablet with restored notes/tab, old writer rejected with `OWNERSHIP`, same-workspace visit/financial permission boundary, and next-request revocation denial. Initial successful pairing was not broadly rerun. Because failed runs closed browser contexts, continuation setup created fresh synthetic consultations and refreshed only the already-approved review device's private credential; original data was never touched.
- Eight successful captures span 1440×1000 desktop, 1024×768 tablet and 390×844 phone, all without document horizontal overflow. The first phone/tablet pairing, desktop device management and tablet notes/visit composition were visually inspected natively. Temporary-code captures remain ignored evidence. This is not every clinical panel at every viewport, exhaustive accessibility acceptance, real hardware testing, real network/GPU failure testing, or concurrent-transfer stress testing. Tooth selection is backend-tested; the browser handoff establishes saved notes/tab restoration rather than every anatomical selection variant.

Raw ignored evidence: `.impeccable/review/station-phase-1/`, including initial/focused logs, historical browser results, successful captures, row/object preservation and tool outputs. Private fixture: `/home/micxsz/.local/share/medframe/ui-review/station.json`.

## Actual Graphify, Jev and Impeccable use

The existing backend graph was queried before source changes. Source inspection established that `require_encounter(write=True)` is the shared write boundary and that existing queues require a provider; existing billing records manual payments and has no configured digital payment initiation. Both facts shape the phased design.

Refreshed code-only corpora:

- `graphify-out/backend-station-phase-1`: 289 Python files, 1,681 nodes, 6,948 edges, 105 communities, covering `config`, `api_graphql` and `medframe_apps`, including migrations.
- `graphify-out/frontend-station-phase-1`: 278 TS/TSX files, 1,473 nodes, 6,480 edges, 42 communities, covering `app`, `features`, `components`, `lib`, excluding generated clients.

Tests/scripts/assets/builds/runtime records/private attachments are not in those corpora. AST-only extraction consumed zero external extraction tokens. Reports, numeric cohesion, manifests and costs are retained. The native final query expanded to graph vocabulary `authorize ownership handoff encounter lease membership`; its bounded traversal reached 376 nodes and showed 33 under a 1,000-token budget. It is an impact map, not exhaustive authorization proof.

**Graph health warnings remain:** raw backend extraction has 723 dangling endpoint edges, 20 self-loops and 324 directed same-endpoint collapsed edges; frontend has 271 dangling endpoints, two self-loops and 65 collapsed edges. Build resolution adds reference nodes, but the raw warnings remain limitations. The TSX parser partially models one Station JSX text line; ten backend initializer/configuration files and one frontend icon barrel yield no symbols. STATION-003 records these limits. The final backend refresh includes the Admin boundary repair. No Graphify internals were changed.

Jev 0.7.0 / model `jev-1.13.0` received sanitized architecture/results only. Design judgment chose `lease`, confidence 1.0 (395 input/31 output tokens); scoped review chose `handoff`, confidence 0.98 (432 input/34 output). Neither is permission, factual validation or a test result. No patient information, credentials or attachment text/image was sent.

Impeccable new-work/Operate/craft-floor and native documenter guidance were used. The existing context launcher had previously failed in this session and was not rerun; existing product/design context was read directly. Design documentation/review were performed inline because the user prohibited subagents. Station is an ordinary extension: existing palette, fonts, tokens, shared shadcn controls and component rules were checked against source and captures; `DESIGN.md` and its sidecar were preserved. No new image assets, design tokens or AI integration were introduced.

## Remaining phases, limits and rollback

- **Next phase:** verified patient kiosk booking/check-in/walk-in and visit-linked department queues. Existing provider-linked queue rules are not yet extended to cashier/laboratory stages. Kiosk timeout/session clearing belongs to that implemented patient flow, not the public pairing shell.
- **Following phase:** configured digital payment provider, authenticated confirmation/reconciliation, payment gates and read-only TV queue responses/announcements. No simulated charge, TV patient feed, live SMS or hardware cash acceptance is enabled.
- Physical tablets need an operator-configured reachable HTTPS clinic origin, proxy/TLS and network access. This local activation uses localhost; browser contexts model devices. OS kiosk lockdown, camera QR scanning, printers and cash/payment hardware remain separate configuration/integration work.
- Notes use the existing form layout: its context/header takes substantial tablet height. Other minor layout refinements, richer connection labels, complete empty/failure acceptance and automatic handoff-history UI remain follow-ups. Backend events record handoff history; no dedicated history browser was added. Active queue responsibility must be resolved first. No force-takeover override, permanent shared code or implicit access grant was added.
- UI rollback: stop only the Station web process and serve preserved `.next-clinic-onboarding` against the current compatible Django API/schema. Existing leased consultations still enforce ownership; an old UI may need the Station interface to resume/release a lease. Do not drop additive tables, reset credentials, or restore a review clone over original data. A full rollback/reconciliation requires explicit user direction and the private original checkpoint.
