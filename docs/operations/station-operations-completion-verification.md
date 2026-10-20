# Station operations completion — roadmap Phase 4

The user proceeded after the written display/payment contract was presented.
Native implementation in this chat; no agents or separate chats. Approved contract:
`docs/superpowers/specs/2026-10-20-station-operations-completion-design.md`.

Implementation `0a882d1` on `codex/station-operations-completion`, production artifact
`.next-station-operations`, BUILD_ID `cA45qwICmVEz5aL7clroI`. Baseline `13fb7d6` /
`checkpoint/pre-station-operations-2026-10-20` and `.next-tablet-editor` retained.
The user's shell-width edit is unchanged, included in the artifact and excluded
from commits; private patch `/tmp/medframe-station4-preserved-width.patch`.

## Implemented scope

- Approved-device-only POST snapshot and `/station/display`, with fresh approval,
  expiry/function/branch checks and private/no-store allowlisted DTO. No patient
  names, patient/visit/encounter IDs, reasons, images or financial values. Native
  queue/stage ordering, linked consultation deduplication, local-day filtering,
  maximum12 current calls/20 upcoming entries/3 authored notices. No second queue
  engine, offline queue cache or invented wait estimates.
- Five-second nonoverlapping polls,20-second timeout, live clinic clock/contact,
  stale feedback and hiding after30seconds; permission denial clears immediately.
  Current snapshot after reconnect, no historical call replay. Locally opted-in
  chime and number/counter-only speech require a gesture. Sound preferences use
  an external-store snapshot with server-safe defaults.
- Branch administrators author plain-text notices with exact versions/audit.
  Department room/counter and before/after-service settings use existing native
  administration. Empty room/after-service defaults preserve original behavior.
- Explicit same-patient/branch issued-invoice link; before-service guards reuse
  native **due through today**, ignoring future installment principal. Invoice
  locking serializes payment/refund changes. Native department and linked native
  consultation start paths share the guard. Cashier transfer remains in the same
  visit; no second active stage or repeated normal-mode identity code.
- Explicit10–240-character billing.adjust + queues.manage exception is audited
  for that transition, never a payment or reusable clearance. No kiosk can mark
  paid; queue completion cannot finalize notes. Native consultation recall adds
  attributed, versioned/idempotent call evidence without changing order.
- Scoped issued-invoice selector, operational clearance feedback and optional
  exception controls in the existing ticket dialog. Shared isolated print iframe
  contains public ticket fields, using textContent instead of parent-page print.
- Two additive migrations: stations0011 fields/settings and0012 invoice-scope/
  notice-bounds SQL guards. No financial ledger or identity schema replacement.

Live digital payment providers, cash-acceptor hardware, live messages, AI and
physical printer/speaker/TV-network validation remain outside this phase.

## Bounded verification and limitations

Production build/TypeScript pass initially and after one necessary activation
repair. Scoped ESLint initially finds setState-in-effect in preference loading;
useSyncExternalStore repair passes a display-only confirmation. Existing
kiosk-screen useCallback missing-kiosk warning remains deferred. Scoped Ruff
initially finds one long reverse-SQL line; wrapped line/test-fixture confirmation
passes. Drift: no changes detected. Prettier and diff checks pass. No broad retest.

One accumulated19-case backend run:17 pass,2 hit native unavailable-provider
checks because the new fixture omitted today's schedule. Only the synthetic test
fixture gains an all-day local schedule. One two-case confirmation passes.
**All19 distinct cases have staged passing evidence; not one clean repeated suite.**
Sixteen new cases plus3 existing transfer/consultation/native-call cases cover:
public allowlist/live denial/caps/branch selection, native order/day/dedup/recall,
settings bounds/version/permission, missing/foreign/draft/stale invoice denial,
deposit/current-due/future principal/refund, same-visit cashier and exception,
provider scope, direct-queue bypass denial and SQL integrity.

One independent-group browser pass and one confirmation, against the isolated
review DB on8001/3001 with synthetic fixtures and no review worker. No Phase3
editor retest. Initial failures are harness-only: direct requests lacked Origin,
native-select commands targeted shadcn and initial code generation awaited an
unconfirmed dialog. Native permissions/confirmation were retained.

| Final confirmation group | Actual result                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Display public/live      | Pass: public text, authored notice,1920/1024/390 no document overflow, initial sound baseline, new recall spoken number/counter only, call/skip automatic updates. Speech is observed through a local browser spy, not acoustic verification.                                                                                                                            |
| Pairing current code     | Pass:8 character boxes, actual clipboard equality, same code after reopen/reload, confirmed regeneration, native redemption and consumed code hidden/pending approval. No plaintext code committed.                                                                                                                                                                      |
| Display stale/revocation | Pass: network interruption feedback, numbers hidden after30seconds, fresh reconnect and immediate denial/clearing after native revocation.                                                                                                                                                                                                                               |
| Payment/transfer/print   | Stops before opening the ticket: harness searched visible `View queue` while the actual accessible name is `View <department> queue`. Corrected for a future run only; **no third browser run**. Invoice selection, UI service-start/exception, cashier continuation, print document/PDF and notice save remain unproven in browser. Backend evidence above is separate. |

Both rounds record zero page exceptions; intentionally aborted network requests
produce expected console errors. Display desktop/phone and failure captures
inspected. Long clinic names produce a tall phone header; no phone polish loop.
Existing device-card copy still says display content is later; nonblocking stale
copy recorded without unrelated repair. No physical print/PDF acceptance claim.
Older editor/navigation/drawer/financial gaps remain deferred.

Reproducible isolated-only helpers: scripts/review/prepare_station_operations.py,
run_station_operations.py and station-operations.js. Fresh session/metadata files
are0600 outside Git. Raw evidence `/tmp/medframe-station4-{build,build-confirmation,
tests,tests-confirmation,lint,lint-confirmation,ruff,ruff-confirmation,drift,
browser,browser-confirmation}.log`; ignored output/playwright/station4/ captures.
The browser script's future selector correction has not been rerun.

## Actual Graphify, Jev and styling use

Existing frontend/backend-improvements34 graphs queried first using verified
station/queue/device/invoice/ticket vocabulary (backend also display/stage), at
700/750-token budgets. Direct source verified all mutation/permission owners.
Refreshed deterministic AST scopes:

| Corpus            | Files | Nodes | Directed edges | Communities |
| ----------------- | ----: | ----: | -------------: | ----------: |
| frontend-station4 |   381 |  1889 |           8851 |          59 |
| backend-station4  |   373 |  2129 |           9097 |         130 |

Refreshed vocabulary: display,queue,payment,invoice,ticket,stage,device. Queries
reach618 frontend/541 backend nodes at700/750-token budgets; output truncated.
Frontend app/features/components/lib excludes generated.ts; backend config/
api_graphql/medframe_apps includes migrations. Tests/scripts/docs/private/runtime/
assets and frontend proxy.ts excluded. Partial station-entry extraction and
empty-symbol modules remain limitations; zero external extraction tokens.
Graphs trace relationships, not verified behavior. Logs:
/tmp/medframe-station4-{frontend,backend}-graph.txt,
/tmp/medframe-station4-graph-refresh.log and corresponding refresh-query.log.

Jev1.13.0 chooses current_due, confidence1,404input/36output; release-reporting
choice scoped_evidence, confidence1,406input/42output. Sanitized generic
engineering state only; no patient data, credentials, cookies or attachments.
Judgments inform boundaries/reporting, never authorization or test results.
Logs /tmp/medframe-station4-jev.json and station4-review-jev.json.

Impeccable/PRODUCT/DESIGN/craft-floor guidance used directly: existing white/navy/
teal clinical system, minimal icons, large queue type, responsive panels and real
shadcn/Tailwind controls. Prior failed skill launcher not retried. Installed Next
client guide used. No new dependencies/assets/AI integration.

## Preservation and activation

Active locally via root `./medframe start --production --dist-dir .next-station-operations`.
API8000/web3000/worker/scheduler all running. Login and API readiness HTTP200,
Django status ready. Prior artifact retained; no public deployment/push.

Fresh encrypted checkpoint, verified source bundle and isolated DB restore:
/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261020-132604-0a882d1;
clone medframe_django_station4_activation_20261020. All153 tables/6,387 rows reconcile.
Original four services stopped before capture/migration/check. No review clone
restore/import over original. Private configuration/archives remain outside Git.

Both additive stations0011/0012 apply successfully to original medframe_django.
**All6,387 original rows across153 original tables match their pre-migration
fingerprints before traffic resumes.** The preservation helper now records the
original column list and projects exactly those columns after additive changes,
rejecting any missing original column/value/row. It does not exempt original
column changes. New-column defaults checked separately: all4 original departments
remain after-service/empty-counter, no stages/invoice links, no seeded display
settings. Original accounts/passwords/MFA/memberships/grants preserved.
Private fingerprint manifest: checkpoints/station4-original-fingerprints-20261020.json.

Fifty-one private objects encrypted/restored/checksummed separately in
medframe-review-station4-preservation-20261020, encrypted checkpoint
/home/micxsz/.local/share/medframe/checkpoints/station4-storage-20261020.
Original storage unmodified; no fixture/session import. Activation logs:
/tmp/medframe-station4-{checkpoint.json,original-migrations.log,preservation-before.json,
preservation-after.json,storage.json,activation.log,status.log,ready.json}.

Source/UI rollback baseline and old artifact remain available. Switching an old
UI artifact does not reverse schema/new operational data. Any data restore or
schema reversal requires its own explicit decision; never restore a clone over
original. Necessary future activation repairs remain authorized, unrelated
findings remain logged. Phase5 has not been implemented.
