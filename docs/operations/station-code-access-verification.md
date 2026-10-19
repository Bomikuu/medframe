# Station code access — October 19, 2026

## Active locally

Branch `codex/station-code-access`, implementation `d489b47`, build `.next-station-code`, build ID `S0qbRLdNKj_prhA3O7XrK`. The user explicitly selected: an authenticated clinician generates a one-use code which opens a short scoped session under their own identity. This replaces the prior receiving-tablet sign-in requirement; it does not turn a device setup code into unrestricted clinical access.

Use:

1. Create/pair/approve a clinician tablet in `/clinic/settings/stations`; the receiving device uses public `/station`, with no login for pairing. An already signed-in browser can redeem a setup code; it ends that browser's existing login after successful pairing rather than asking the user to sign out and try again.
2. In the authenticated clinician's consultation, choose **Continue elsewhere → Same clinician, another device → Save & generate handoff code**.
3. On the approved tablet, open `/station`, enter the code under **Open a consultation**, and open it. No password or MFA prompt appears on the receiving tablet. The same saved consultation/tab opens and the previous device loses editing ownership.
4. The tablet shows clinician identity, expiry and **End session**. Its native Django session is limited to the assigned clinic/branch/patient/consultation, up to thirty minutes absolute and ten minutes of API inactivity. Source logout/revocation/expiry, account auth-epoch change, patient-grant revocation or device revocation ends access on the next request. Polling is activity for the inactivity policy; the absolute thirty-minute bound is never extended.

Codes are five-minute, digest-only and single-use, with Redis attempt limits. Source native MFA session and user epoch are recorded in a separate `HandoffAccessProof`; `StationAccessSession` attributes the receiving native ClinicalSession to that proof, handoff and credential. No password, MFA secret, recovery code, role or source account flag is changed. The session records `auth_method=station_handoff`: MFA was authorized at the source, not re-performed on the tablet.

Responsibility handoff to another clinician still uses the named receiver's own identity and acceptance; anonymous redemption cannot impersonate that recipient. Delegated sessions cannot issue more codes, manage devices/users/settings, browse the patient directory or other consultations, perform financial actions, change authentication or create treatment plans. The assigned patient's existing plans are view-only; notes, chart findings, procedure documentation, scoped documents and original consultation finalization/amendments continue through the existing clinical services/version/lease checks. Full staff sessions remain unchanged.

Enforcement includes live device/session/grant middleware, an explicit GraphQL root-field allowlist with alias/fragment handling, argument scope, membership permission intersection, patient query filtering and exact encounter access. The UI removes broad navigation/delegation controls and preserves the established Medframe design. Full navigation after identity change deliberately clears prior application memory. Session/connection failure pauses the visible clinical workspace; no offline save or payment success is fabricated.

This milestone addresses the user's code-only access amendment. Patient kiosk self-service/department queues and configured payment/live-TV integrations remain outstanding Station phases. No external messaging, live money movement, subagents or public deployment occurred.

## Actual verification

- Initial accumulated backend run: **44/44 pass**, spanning new code access, existing Station ownership, native authentication and realm boundaries. Source-review hardening added immediate patient-grant loss and auth-epoch/absolute-expiry cases; both plus the existing entry-success case pass in a focused three-case confirmation.
- Initial production build/TypeScript passes. Scoped Ruff is now clean after correcting only the new fixture construction/imports and long literals. Migration drift: no changes. Scoped ESLint: zero errors and two warnings — existing anatomy unused `Bot`, and intentional hard navigation after identity change. No rules were suppressed; unrelated issues remain deferred.
- First browser run proves source save/code issue, approved-tablet access form with no staff cookie, successful redemption and desktop/tablet/phone geometry captures. It then stops on a new GraphQL bootstrap bug: argumentless fields have `FieldNode.arguments=None`. Native diagnosis identifies that precise TypeError. `(field.arguments or ())` repairs it; an added bootstrap test passes in one focused case.
- **47 distinct backend cases have passing staged evidence**: 44 initial plus two added live-boundary cases and one bootstrap case. This is not one repeated clean 47-case suite. Tests cover code entry without password change, one-use/replay, old writer denial, stale draft atomic failure without login, unapproved/kiosk/unpaired denial, responsibility-code denial, exact patient/encounter restriction, aliases/fragments/Admin/identity/delegation denial, source/device/session binding, absolute/inactivity expiry and native logout retaining pairing.
- One browser confirmation proves actual code-only entry on an approved tablet with **no receiving staff login cookie**, same saved note/tab restoration, clinician/expiry/End session display, no broad clinic navigation and no further-delegation control. A tablet save reaches the backend successfully. The harness then stops at an ambiguous `Draft saved` text locator (visible notes and force-mounted anatomy status). That finding is logged; no third browser/polish cycle was run. Browser assertions for subsequent scope/end/replay did not execute in that confirmation; backend cases establish those boundaries. Do not claim full browser acceptance.
- Four successful 1440×1000 desktop, 1024×768 tablet and 390×844 phone captures have no document horizontal overflow. Phone access content requires ordinary vertical scrolling. The phone access composition and tablet scoped-notes view were visually inspected natively. Existing tall tablet notes/context headers and other older dental/anatomy findings remain deferred.

Raw ignored evidence: `.impeccable/review/station-code-access/` contains initial/focused checks, browser historical/final JSON, diagnosis, screenshots and preservation summaries. Private synthetic fixture `/home/micxsz/.local/share/medframe/ui-review/station-code.json` is not printed or committed. Review sessions were native MFA-complete fixtures; this was not another UI password/MFA regression journey. STATION-CODE-001 retains exact failures and confirmation limits.

## Preservation and runtime

Source baseline/tag: `eb8ec73` / `checkpoint/pre-station-code-access-2026-10-19`; `.next-station` remains intact. Initial encrypted checkpoint/verified restore: `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-184251-eb8ec73`, isolated DB `medframe_django_station_code_review_20261019`. Existing storage was not modified during review; the code feature uploads no assets.

After stopping original web/API/worker/beat, fresh encrypted checkpoint and verified restore: `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-185415-d489b47`, restored DB `medframe_django_station_code_activation_20261019`. Fresh encrypted object checkpoint `/home/micxsz/.local/share/medframe/checkpoints/station-code-storage-activation-20261019` verifies all fifty private objects into separate bucket `medframe-review-station-code-activation-20261019`.

Only `stations.0003_handoffaccessproof_stationaccesssession` was applied to original `medframe_django`. It creates separate tables and does not alter existing handoff rows. **All 5,139 original rows across 121 tables matched their preservation fingerprints before traffic resumed.** Added framework migration/content-type/permission metadata is separate. Fingerprints, configuration and encrypted backups remain private and outside Git. Review records were never imported into original data.

| Service       | PID    | Tool session | Configuration                                 |
| ------------- | ------ | ------------ | --------------------------------------------- |
| Web           | 710489 | 13356        | port 3000, `.next-station-code`, original API |
| Django API    | 710483 | 2449         | port 8000, original `medframe_django`         |
| Celery worker | 710482 | 68548        | original broker, concurrency 2                |
| Celery beat   | 710480 | 80815        | `/tmp/medframe-station-code-original-beat`    |

Logs `/tmp/medframe-station-code-{web,api,worker,beat}-runtime.log`. Station HTTP 200; API readiness HTTP 200. Local SMTP remains 127.0.0.1:51025 and SMS live delivery is disabled. Review web/API are stopped after evidence collection. No credentials/MFA were reset and no production deployment occurred.

For physical tablets, a reachable clinic HTTPS origin, TLS/proxy and local-network setup are still operator configuration; localhost browser contexts demonstrate the application flow. OS kiosk lockdown remains separate. UI rollback can serve preserved `.next-station` against the compatible current API/schema, but its old prompt does not reflect the new code flow. Existing code sessions remain scoped by the current backend. Never drop new tables or restore a review clone over originals; full rollback requires explicit direction and reconciliation of any newer writes.

## Graphify / Jev / Impeccable

Existing Station graph and source were inspected first. Refreshed application-code corpora: backend `graphify-out/backend-station-code-access`, **292 files, 1,703 nodes, 7,047 edges, 112 communities**; frontend `graphify-out/frontend-station-code-access`, **280 files, 1,483 nodes, 6,542 edges, 52 communities**. Scope is backend `config/api_graphql/medframe_apps` including migrations, frontend `app/features/components/lib` excluding generated clients. Tests/scripts/assets/runtime/private data are excluded. AST-only extraction uses zero external extraction tokens; numeric cohesion/reports/manifests/costs remain available.

Final bounded query reaches 778 nodes and shows 23 under a 700-token budget; generic matches include unrelated GraphQL methods, so direct source/test evidence identifies the real entrypoint. Raw graph health warnings remain: backend 735 dangling endpoints, 21 self-loops and 329 directed same-endpoint collapsed edges; frontend 271 dangling endpoints, two self-loops and 66 collapsed edges. One TSX JSX-text line is partially parsed, ten backend configuration/initializer files and one frontend icon barrel yield no symbols. These limitations are reported, not repaired as product work or treated as authorization proof.

Jev 0.7.0/model `jev-1.13.0` receives sanitized architecture/results only. Design judgment `named`, confidence 1.0, 434 input/31 output tokens; activation judgment `local`, confidence 1.0, 449 input/32 output. These are structured model judgments, not verified facts or authorization. No credentials, private attachment text/images or patient information were sent.

Impeccable existing-context/new-work/craft-floor guidance was used; the earlier failed launcher was not rerun. Native inline source/visual review substitutes for delegated review by user instruction. Existing palette/fonts/shadcn/Tailwind and design tokens were preserved. The internal measured session-offset property prevents the identity strip from covering full-screen editor controls; it is local layout state, not a new global visual token. No raster assets or AI integration were added. `DESIGN.md` and its sidecar remain unchanged.
