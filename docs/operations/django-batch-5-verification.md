# Django Batch 5 — saved implementation and bounded verification

October 19, 2026 (Asia/Manila). Branch: `codex/django-diagnostics-batch-5`.

**Current state: Batch 5 is active locally.** The user’s “activate always after” authorizes necessary activation-blocker repairs and establishes local activation as the default for subsequent batches. Original-data cutover is complete with all 4,560 pre-existing rows across 85 tables preserved. The web uses `.next-batch5`; API/worker/beat are running and SMS stays preview-only. The initial failed pass below remains historical; the authorized activation section supersedes its runtime/blocker status. B5-005 remains a set of deferred feature/coverage gaps, not a claim of full plan completion.

## Implemented source

- New diagnostics Django app with centers, explicit clinic partnerships/events, referral drafts/issued packages, selected clean file versions, center assignments, examination metadata, result drafts/submitted versions, corrections, exact-version clinician reviews and attributed events. Request actions use live realm/organization/patient/provider policy, expected versions, receipts and a clinic advisory lock.
- Additive schema/integrity/permission migrations, center provisioning command with hidden validated password prompts and unchanged existing credentials, read-only center/partnership Admin registration. Center operators have workspace/diagnostics access without clinic clinical/billing permissions.
- Explicit diagnostic file purpose and authorized transfer views, live ticket redemption, private storage/hash/quarantine/ClamAV helpers, separate diagnostic scan notifications and generic result notifications. Existing clinical/logo/avatar byte reception remains integrated through the extracted helper.
- Staff and patient GraphQL adapters, schema/client generation, paginated request/history queries, patient center selection/progress, clinician sharing preview, correction/review controls, partnership authorization settings, center inbox/report/upload entry, navigation and patient Diagnostics tab.
- Explicit reviewed-result source selection in existing patient release forms, immutable diagnostic report/review payload snapshots and exact clean release attachments. Existing release download/link/withdrawal checks remain the delivery authority.

This list describes code written, not verified end-to-end capability. B5-001 blocks the new domain tests before most intended assertions. B5-005 records plan gaps that remain unfinished even apart from the two activation blockers.

## Preservation and environment

- Baseline `33f0950`, tag `checkpoint/pre-batch5-2026-10-19`; approved spec `441419d` and plan `6d8ac60` precede product work.
- First checkpoint connection failed because the existing Medframe PostgreSQL/Redis/storage/scanner/mail containers were stopped. Existing containers were started without recreation or volume changes; other projects' containers were not changed. This was environment recovery, not a failed product test repaired/retried.
- Fresh encrypted checkpoint: `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-123814-6d8ac60`. Historical directory prefix comes from the existing helper. Restore to new `medframe_django_batch5_20261019` verified all **85 original table counts**; helper reports `source_written=false`. No plaintext dump or credentials were written to Git. Evidence: ignored `.impeccable/review/batch5/checkpoint.json`.
- Clone migrations succeeded: `diagnostics.0001_initial`, `diagnostics.0002_integrity_permissions`, `documents.0004_diagnostic_purpose`. Migration success does not establish trigger behavior. Original `medframe_django` has not received them; no restore replaced original data.
- Dedicated tests used `medframe_django_batch5_test`, settings `config.settings.test`, Redis DB4/broker DB5 environment and a dedicated operations channel prefix; test settings force live SMS off. No review worker was started. Tests enqueue callback behavior only in isolated test paths; real scan coverage is distinguished below.
- At final process inspection no API/web listened on 3000/8000 or review 3001/8001: earlier host services were stopped before this work. The prior Batch 4 artifact/data remain available; it is **not claimed that the Batch 4 web/API are currently running**. Do not restart this branch’s changed API against original data as if it were the Batch 4 baseline; use the preserved source/config/build or complete authorized activation first.
- No original financial/diagnostic fixtures, credential/MFA resets, external messages, money transfer, push or public deployment. No Batch 5 local cutover attempted.

## One accumulated verification pass

| Check                            | Actual result                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Review clone additive migrations | Passed, three migrations                                                                                |
| Schema/client export             | Passed                                                                                                  |
| Migration drift                  | Passed: no changes detected                                                                             |
| Prettier / Ruff formatting       | Applied before checks                                                                                   |
| Scoped Ruff                      | Failed: 29 findings (SQL/string line lengths, import ordering/placement, assigned lambda)               |
| Scoped frontend ESLint           | Failed: one unescaped apostrophe; one RHF/compiler warning                                              |
| Production build                 | Compile and TypeScript passed; **prerender failed** on `/portal/diagnostics`: `PortalProvider required` |
| Targeted backend                 | **32 run: 18 passed, 14 errors**, 12.833 seconds                                                        |
| Browser/screenshots              | Not run: production artifact blocked and new domain workflow unusable                                   |
| Original migration / activation  | Not attempted                                                                                           |

Backend command covered `tests_django.test_diagnostics_scope`, `test_diagnostics_workflow`, `test_diagnostics_files`, `test_diagnostics_results`, `test_diagnostics_portal`, `test_diagnostics_api`, `test_documents`, `test_branding`, `test_portal_files` and `test_portal_releases` with the package prefix on each label. All 14 errors point to `diagnostic_scope_guard()`: PL/pgSQL variable `a` conflicts with SQL alias `a` in the request trigger query (`column reference "a.id" is ambiguous`). Other alias collisions may surface after that first blocker; none were repaired/retested. Assertions following failed setup/transitions are not passing evidence.

The passing cases comprise the existing documents/branding/portal regression modules and the new live patient-access revocation/invalid-context test. Existing real S3/ClamAV document acceptance remains exercised by the existing modules. The **new diagnostic real-upload/scanning test was blocked before upload**, so no successful diagnostic scan/submission/revocation or paid diagnostic browser flow is claimed. The new two-connection cancellation/submission test was also blocked before its concurrent operations; concurrency is not verified.

No browser pass, visual screenshot inspection, keyboard/a11y acceptance, DICOM/PACS/FHIR integration, clinical validation, full historical clinical regression or production readiness is claimed. Impeccable's craft/context/source guidance informed the authored UI, but its launcher remained unavailable by permission and no rendered visual verdict exists. Source intent is not visual acceptance. User instructions prohibit automatically fixing findings or running a polish/rebuild loop.

## Graphify and Jev — actual use

Graphify queried the existing frontend graph for document/version/upload/download/patient/membership/portal/release; its bounded response found 617 nodes but returned 33 before truncation. Earlier focused backend/portal traces and direct source inspection supplied integration evidence; the truncated result was not treated as exhaustive. Raw discovery output is retained.

Relevant code scopes were refreshed into **separate** `graphify-out/backend-batch5/` and `graphify-out/frontend-batch5/`, retaining old Batch 4 graphs. Backend corpus: 236 Python files in `medframe_apps`, `api_graphql`, `config`; 1,390 nodes, 5,667 edges, 62 communities. Frontend: 213 TS/TSX files in app/components/features/lib, excluding generated contracts; 1,051 nodes, 5,076 edges, 34 communities. Both use deterministic AST extraction, **zero external extraction tokens**. Numeric cohesion, extraction confidence and source locations remain in report/graph. Tests, non-code docs/assets/build output and generated clients are excluded; differing Batch 4 scope counts are not a full graph replacement.

Initial graph helper hit multiprocessing bootstrap errors with sequential fallback and then an unsupported manifest keyword. Its orchestration helper was corrected (no product code changed) and the refresh completed sequentially. Logs retain both attempts. Ten backend files and one frontend file yielded no symbols. Graph JSON/report/cost/manifests and integrity evidence were saved; all edge endpoints resolve. Interactive HTML was not regenerated. Graphs are navigation maps, not SQL or security verification, and did not detect the failing SQL semantics.

Jev 0.7.0 / `jev-1.13.0` used sanitized architecture/results only:

| Stage                      | Choice       | Confidence | Input / output tokens |
| -------------------------- | ------------ | ---------- | --------------------- |
| Implementation             | `revocation` | 0.54       | 455 / 45              |
| Post-check review priority | `trigger`    | 0.80       | 493 / 39              |

Current execution total: **948 input / 84 output tokens**. Earlier design/plan calls remain separately recorded in the spec/plan. Priorities did not authorize repairs or establish correctness; no patient information, credentials or private files were sent. No subagents were spawned.

Ignored `.impeccable/review/batch5/` holds checkpoint, codegen/migration/drift/backend/build/Ruff/ESLint/format logs, graph scope reports/manifests/cost/integrity and raw Jev outputs. `/tmp/medframe-batch5-refresh-graphs.py` was a local orchestration helper. No browser harness/report/screenshots exist for Batch 5 because its prerequisite build failed.

## Initial remaining work (before activation)

B5-001/B5-002 block activation. B5-003/B5-004 and B5-005 remain logged. A later user repair request must use additive corrective migrations for the already-migrated clone, preserve original source/data before any cutover and keep the confirmation bounded. Never restore the clone over original or replace exact earlier result/release evidence. Until then this is saved source with failed acceptance, not a completed/activated Batch 5.

## Authorized local activation — October 19, 2026

Standing instruction saved in AGENTS.md: activate each implemented batch locally after bounded verification, without a separate permission question. Necessary activation-blocker repairs are included; unrelated findings stay logged. Preservation, MFA/permissions, preview messaging and no public deployment remain unchanged constraints.

Repairs:

- `683bbe0`: additive `diagnostics.0003_unambiguous_scope_guard` replaces the function with distinct `request_row` / `assignment_row` record variables while preserving checks. Already-applied 0002/0004 SQL was whitespace-wrapped only; the semantic trigger repair is a new migration. Patient diagnostics list/detail now use the existing PortalProvider/Suspense composition. B5-003/004 lint findings are resolved, including import placement, SQL literal wrapping, named serializer and RHF useWatch.
- `2b9e2c3`: the browser exposed a diagnostic patient-release rendering blocker, `Invalid time value`, caused by passing a full timestamp to dateLabel. It now uses the existing clinic-time formatter. No unrelated deferred feature expansion was undertaken.
- Preservation helper explicitly permits the single new `diagnostic_operator` role row while still requiring every existing role/data row fingerprint to match. It does not broadly allow arbitrary role changes.

| Focused confirmation                               | Actual result                                                                                        |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Six diagnostic backend modules                     | **15 passed**, 11.524 seconds                                                                        |
| Scoped Ruff                                        | Passed, including preservation helper                                                                |
| Scoped diagnostic frontend ESLint                  | Passed, zero findings; release renderer lint also passes                                             |
| Clone corrective migration and drift               | Passed                                                                                               |
| Production build / TypeScript                      | Passed after portal repair; final timestamp repair build also passed                                 |
| Browser main confirmation                          | Three groups passed; clinician review completed, patient release rendering found timestamp error     |
| Targeted remaining-step confirmation               | Patient exact-version release rendering and live old-ticket revocation both passed; zero page errors |
| Original API / login / staff route / patient route | Ready HTTP 200 / HTTP 200 / expected unauthenticated HTTP 307 / HTTP 200 shell                       |
| Celery worker and beat                             | One node responds pong; beat process running                                                         |

The original backend regressions were not broadly repeated. The focused invocation now exercises the previously blocked diagnostics policy, transitions/replay/immutability, real private-file/ClamAV path, review/correction/history, explicit portal release and two-connection cancellation/submission race. Fifteen passing tests are not exhaustive coverage of B5-005.

Browser evidence uses real password/MFA for synthetic clinician, center operator and verified patient accounts on `medframe_django_batch5_20261019`. Draft setup and precise examination time were supplied through authorized GraphQL; issuance/sharing confirmation, patient center selection, center acceptance/report/upload/submit and clinician review use the actual controls. Explicit release preview/publication and old-ticket checks use authorized GraphQL/HTTP. A one-shot task against the clone performed real ClamAV scanning; the original worker did not consume review jobs. No real external message or money transfer occurred.

The first browser attempt stopped because a copied synthetic PNG fixture failed byte validation; the row remained uploading. Its evidence is retained as `browser-first-report.json`. Replacing the test fixture with a valid locally generated PNG allowed the main confirmation to pass issuance, patient selection and real upload/submission, then find the timestamp error. After that single product correction, only patient release rendering and revocation were confirmed; no full journey or backend suite was repeated. Main report retains its historical page error/failure; tail report has two passing groups/zero errors. Do not misreport one flawless browser run. Across the main and remaining-step confirmations there are **five passing groups, ten desktop/mobile captures**, no recorded page-overflow findings, and the initial errors remain visible in evidence.

Manually inspected clinician reviewed-result desktop, center report/upload mobile and patient released-report mobile screenshots. They show attributed state/history, separate center/clinician content and full file access controls. The old mobile portal tab-strip limitation remains; no polish loop or exhaustive accessibility/1024/768 coverage was performed. Center correction was covered in backend tests rather than a second complete browser journey.

### Original-data cutover and runtime

- Repair baseline `683bbe0`, tag `checkpoint/pre-batch5-activation-2026-10-19`; timestamp fix `2b9e2c3`. Old `.next-batch4` and baseline source remain preserved.
- Fresh encrypted checkpoint `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-135445-683bbe0`; restored new `medframe_django_batch5_activation_20261019` with all **85 table counts matching**, source_written=false. Historical checkpoint prefix is from the existing helper. No plaintext dump or credentials were committed.
- No original web/API/worker/beat was running before cutover. Private row fingerprints captured **4,560 original rows across 85 public tables**, then all matched after migration. Additions are limited to normal migration/content-type/permission/role-permission metadata and the exact new operator role. Original accounts, passwords, MFA, records and role rows are unchanged. Fingerprints remain private in the checkpoint folder.
- Original `medframe_django` applied four additive migrations: diagnostics 0001/0002, documents 0004 and diagnostics 0003. No clone replaced original data. Synthetic partnerships/center accounts/results/releases stayed on the review clone; the original starts with real configured data, not imported review records. Center registration/clinic authorization is required before real patient selection has choices.
- Review API/web 8001/3001 were stopped. Current local API PID `152484`, exec session `10931`, port 8000; web PID `152719`, session `36630`, port 3000, `.next-batch5`. Worker PID `152745`, session `8900`, concurrency 2; beat PID `152870`, session `53486`, schedule `/tmp/medframe-batch5-celerybeat`. These are activation-time local process identifiers, not a durable service installation.
- Logs `/tmp/medframe-batch5-{api,web,worker,beat}-runtime.log`. API/worker/beat explicitly use SMS_LIVE_ENABLED=false. Worker ping confirms one node online. Runtime smoke is read-only; original credentials were not used/reset by the harness.
- Rollback must preserve subsequent writes and retain additive migrations; merely switching a UI build does not undo schema. Never restore the review clone over original data. No push/public deployment or live external delivery occurred.

### Actual activation Graphify / Jev use

Graphify queried existing document/portal/release/request/version relationships, retaining truncated discovery output as navigation evidence. Final backend refresh: **237 files, 1,393 nodes, 5,670 edges, 70 communities**; frontend: **213 files, 1,051 nodes, 5,084 edges, 39 communities**. Code-only extraction, zero external tokens, numeric cohesion and source/confidence labels retained. Ten backend and one frontend files yielded no symbols. All saved edges resolve to existing nodes. SQL semantics remain outside graph proof. No subagents. Final maps/manifests/cost and raw refresh logs are saved separately from original failure evidence.

Jev 0.7.0 / jev-1.13.0 received sanitized activation architecture and selected `domain_workflow`, confidence 0.97, **442 input / 48 output tokens**. This prioritized the previously blocked real workflow and revocation confirmation; it is not authorization or verification. No patient data/credentials/private attachments were submitted.

Evidence: ignored `.impeccable/review/batch5-activation/` contains original/final build, focused backend, Ruff/ESLint/helper-lint, migrate/drift/checkpoint/preservation/runtime logs; raw Jev response; graph reports/manifests/cost/integrity; browser harnesses, initial/main/tail reports and desktop/mobile captures. B5-005 and older unrelated findings remain deferred. Local activation is complete; not all originally planned diagnostic features or exhaustive acceptance are complete.
