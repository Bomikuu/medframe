# Django Batch 5 — saved implementation and bounded verification

October 19, 2026 (Asia/Manila). Branch: `codex/django-diagnostics-batch-5`.

**State: source implementation saved; incomplete acceptance and blocked from activation.** The new trigger prevents request creation; the patient diagnostics page fails production prerender. Batch 5 migrations were applied to a private review clone only. Original data/accounts/MFA and the old `.next-batch4` artifact remain preserved. No failed rule/constraint was suppressed, no post-check product repair/retry occurred, and no claim of a usable diagnostic workflow is made.

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

## Next authorized work

B5-001/B5-002 block activation. B5-003/B5-004 and B5-005 remain logged. A later user repair request must use additive corrective migrations for the already-migrated clone, preserve original source/data before any cutover and keep the confirmation bounded. Never restore the clone over original or replace exact earlier result/release evidence. Until then this is saved source with failed acceptance, not a completed/activated Batch 5.
