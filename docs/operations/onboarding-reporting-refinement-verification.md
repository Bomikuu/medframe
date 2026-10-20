# Onboarding and reporting refinement — roadmap Phase5

The user selected the next written roadmap phase and explicitly approved custom
report dates during implementation. Native work in this chat, no agents/chats.
Plan: docs/superpowers/plans/2026-10-20-onboarding-reporting-refinement.md.
Implementation d752a57, branch codex/onboarding-reporting-refinement, artifact
.next-onboarding-reporting, BUILD_ID26Bm4lp7Ty5TnkRmIIBHy. Baseline8d69cf8 /
checkpoint/pre-onboarding-reporting-2026-10-20 and .next-station-operations retained.

## Implemented

- Setup review uses readable provider counts/types, operating days, appointment
  policy and clinic type. Names/emails retain entered casing. Administrator name
  comes from the invitation-bound account under native proof/MFA checks. Clean
  logo preview fetches the same private invitation endpoint with blob cleanup;
  logos retain proportions. Existing draft/account/scan/completion owners remain.
- Existing setup checklist exposes actual, permission-filtered specialty/template/
  schedule readiness. Schedule facts respect branch, active state and expiration;
  template readiness is absent without clinical authoring permission. One read
  feeds dashboard/checklist; a new clinic sees a practical next action before
  empty metrics. Dismissal remains native/versioned, restoring the usual dashboard.
- Template pages show standard/enabled/historical specialty labels, archived vs
  active state, server-paginated specialty filtering, generic guidance without
  starters and explicit save/dirty/discard feedback. Prompts stay separate from
  patient facts, existing templates/history remain accessible, provider credentials
  unchanged. No automatic patient findings or AI advice.
- Custom report policy:1–366 inclusive completed clinic calendar days, ending
  before today, compared with the immediately preceding equal calendar span.
  Shared report_period normalizes Analytics, Finance and CSV. Half-open local
  midnight query bounds handle DST; reject incomplete/reversed/oversized/current/
  future/malformed and calendar-underflow ranges. Existing7/30/90 presets remain.
- Custom dates apply explicitly; pending changes preserve the current report and
  disable Analytics CSV. Analytics passes its resolved dates to Finance; CSV uses
  identical resolved bounds. Dashboard retains quick presets. Charts have exact
  tables and bounded daily points. Native currencies remain partitioned, with no
  FX/revenue attribution or collection-rate denominator. The ledger remains PHP-only.
- Period flows and current balances are visibly separate. Historical ranges do
  not move the current due/overdue/future snapshot back in time. Current snapshot
  timestamps use the clinic's calendar date/time, including UTC-midnight crossings.
- Custom-host mismatch reproduced before repair: canonical/OpenGraph used the
  verified host while JSON-LD used the app URL. All three now use publicClinicUrl,
  trusting only the existing proxy's verified header. Incoming spoofed header is
  stripped; private paths remain denied; app-origin portal links retained. No
  real DNS/TLS or public publication changes.
- Dependency and isolated streaming/Redis inventories recorded separately in
  docs/operations/onboarding-reporting-advisories.md. No blanket upgrades,
  unsupported currency, live provider, messaging or AI integration.

## Bounded staged verification

Initial12 backend cases:11 pass; one fixture violates provider/branch scope.
A distinct explicitly enrolled org-wide fixture provider resolves it; one narrow
confirmation passes. After date-policy approval,14 targeted cases run:13 pass,
one fixture tries unsupported USD and is correctly rejected by the native PHP
constraint. Remove that unsupported setup; one narrow confirmation passes.
**All24 distinct backend cases have passing staged evidence; not one repeated
clean24-case suite.** The date run repeats2 prior analytics cases; it does not
retest the whole first suite.

Coverage:4 new onboarding/progress cases,7 existing permission/analytics cases,
1 native DNS-proof/publication case,5 new date/flow/CSV cases and7 existing finance
cases. Explicit dates, leap366-day span, partial/reverse/today/future/malformed/
underflow rejection, clinic-zone day differences,23-hour DST day, current balances
before the historical invoice window, exact CSV periods and branch/role boundaries.

TypeScript/build initially stop on required LoadState props, then unknown-valued
React error guard. Focused repairs and full type check pass. Pre-policy production
build, date-enabled build and final snapshot-formatter build pass. Scoped ESLint,
Ruff, authored Prettier, codegen, diff/drift and migration checks pass. Generated
GraphQL artifacts retain generator style. No schema migration. Two final frontend
snapshot midnight/fallback tests pass; Node emits the known module-typeless harness
warning without a package-type change. No speculative broad repair.

Browser uses the isolated review DB, API8001/web3001, no review worker. Initial
5 independent groups, one focused3-group confirmation; **no third browser round**.

| Journey             | Actual evidence                                                                                                                                                                                                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First-run dashboard | Initial pass: real next action,1440/1024/390 no overflow, patient registration navigation, native dismissal and usual financial panel return. No patient was registered by this group.                                                                                                                                                                |
| Preset reporting    | Initial pass:7-day selector, separate current balances, exact counts disclosure and actual CSV download.77 rows read and metadata/snapshot fields checked.                                                                                                                                                                                            |
| Custom host         | Initial pass: canonical/OpenGraph/JSON-LD agree; forged header ignored, private login/clinic/API paths404, unverified host fails closed, robots/sitemap agree. Synthetic verified-state fixture, not real DNS/TLS proof.                                                                                                                              |
| Specialty templates | Initial segment passes starter fill/native save/dirty/discard and responsive captures, then expects no starter after removing only Pediatrics while two others remain. Confirmation clears all three starter selections natively and passes generic fallback/historical-template labels. No selection-rule bypass or clean repeated full-group claim. |
| Setup review        | Initial metadata/storage filename collision correctly renders unavailable invitation. Existing valid native session/proof recovered without authority/expiry changes. Confirmation passes readable counts/days, exact name/email casing, clinic preview name,1440/1024/390 and Edit navigation.                                                       |
| Custom dates        | Confirmation passes5-day Oct10–14 window, previous Oct5–9, pending-export disable, current balances, actual CSV download and reversed-range validation at1440/1024/390.63 downloaded rows read; date headers and current snapshot verified.                                                                                                           |

Both rounds record zero page exceptions. Captures inspected for layout/copy.
Review fixture manually omitted defaults, so its capture shows undefined hours/
colors. Future preparer now validates complete step data like the native save;
not rerun. Full default-value review and new review-logo image loading remain
browser acceptance limits. Existing upload/scan/account/MFA evidence is retained,
not claimed as newly retested. Final timestamp-only formatting corrects UTC-date
prefix use after browser confirmation; unit/build proof, no final-artifact browser
sweep. Older Phase3 editor and Phase4 payment/print gaps remain deferred.

Raw /tmp/medframe-phase5-{tests,tests-confirmation,dates-tests,
dates-test-confirmation,build,build-confirmation,build-final,dates-build,
release-build,lint,dates-lint,release-lint,release-ruff,browser,
browser-confirmation,snapshot-tests}.log; ignored output/playwright/phase5/.
Repro helpers scripts/review/prepare_onboarding_reporting.py,
run_onboarding_reporting.py and onboarding-reporting.js. Session files/metadata
are0600 outside Git. Review native mail remains in its DB, never delivered/imported.

## Actual tools and design

Graphify existing frontend/backend-station4 graphs queried first. Initial broad
frontend queries auto-restrict to6 generic_arg nodes (backend9); refined backend
query reaches416 nodes. These limits are not full impact coverage. Direct source
verified owners/proxy/permissions. Refreshed deterministic AST after the approved
date extension and final timestamp helper:

| Corpus                        | Files | Nodes | Directed edges | Communities |
| ----------------------------- | ----: | ----: | -------------: | ----------: |
| frontend-onboarding-reporting |   387 |  1914 |           8950 |          65 |
| backend-onboarding-reporting  |   373 |  2132 |           9114 |         147 |

Verified vocabulary report/range/period/snapshot; final queries reach377 frontend/
341 backend nodes at750/800-token budgets, truncated. Explain publicClinicUrl has
4 connections, report_period7, including native query/finance imports. AST corpus:
frontend app/features/components/lib excluding generated.ts; backend config/
api_graphql/medframe_apps including migrations. Tests/scripts/docs/private/runtime/
assets and frontend proxy.ts excluded. Known partial station-entry and empty-symbol
modules remain; zero external extraction tokens. Graphs are relationships, not
behavioral proof. Logs /tmp/medframe-phase5-*-graph.log, release-graph-refresh.log,
release-{frontend,backend}-query.log and {host,period}-explain.log.

Jev1.13.0: preserve_owners confidence1,406input/40output; actual_today confidence.92,
406input/36output (probability.96); staged_scope confidence1,445input/38output.
Only sanitized generic engineering state, no patient data, credentials, cookies or
private attachments. Judgments guide boundaries/reporting, not authority/tests.
Logs phase5-{jev,dates-jev,review-jev}.json under /tmp/medframe-.

Impeccable used incumbent PRODUCT/DESIGN, onboarding/analytics surface briefs,
onboard/clarify/craft-floor and relevant installed Next client guidance. Operate
mode, existing white/navy/teal shadcn/Tailwind; no replacement visual world or new
assets. Prior unavailable launcher not retried. Native/no-subagent execution.

## Preservation and local activation

Fresh encrypted checkpoint/source bundle and isolated verified restore:
/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261020-140324-d752a57;
clone medframe_django_phase5_activation_20261020. All154 tables/6,394 rows reconcile.
Original four services stopped before capture/check. No migrations required;
migrate --check and drift show no pending/schema changes. **All6,394 original rows
across154 tables match fingerprints before traffic resumes.** Native accounts,
passwords/MFA/memberships/grants and record history preserved; no review import.
Private manifest checkpoints/phase5-original-fingerprints-20261020.json.

Fifty-one private objects encrypted/restored/checksummed in
medframe-review-phase5-preservation-20261020; private encrypted storage checkpoint
/home/micxsz/.local/share/medframe/checkpoints/phase5-storage-20261020. Originals
unmodified. User's uncommitted clinic-shell width remains byte-for-byte unchanged,
included in the artifact, excluded from commits and copied0600 into the checkpoint
as uncommitted-clinic-shell-width.patch.

Active locally using ./medframe start --production --dist-dir .next-onboarding-reporting. API8000/web3000/worker/scheduler all running; login/readiness HTTP200 with Django ready. Actual root runtime state points to the new production artifact. Evidence /tmp/medframe-phase5-{activation.log,status.log,ready.json,checkpoint.json,preservation-before.json,preservation-after.json,storage.json,migration-check.log}. Isolated review services/browser are shut down after verification.
Previous artifact/tag and private backups retained. Switching UI artifacts does
not reverse schema/data; never restore a review clone over original. No push,
public deployment, live money/messages, credentials reset or unrelated repairs.
