# Django Batch 3 — implementation and single-pass evidence

Date: October 19, 2026, Asia/Manila. Branch: `codex/django-clinic-batch-3`.

**State: implementation source saved; activation blocked. The native app on port 3000 remains Batch 2.** The user requested native implementation and one testing pass, with issues logged and fixes deferred. No product repair or test retry followed the results below.

## Implementation source

- New focused `medframe_apps.operations` module: weekly provider schedules and date overrides, finite rooms/chairs, booking and rescheduling, cancellation/no-show/acknowledgement, check-in and walk-ins, queue ordering/state/delay/extension, optional consultation linkage, setting-based wait ranges, and patient-only operational snapshots/actions.
- PostgreSQL reservations use half-open ranges and exclusion constraints on provider User identity, patient within clinic, and optional resource. Version checks, request receipts, attributed append-only events, scope triggers, unique ticket numbering and active-service ownership support transactional boundaries.
- Appointments and clinical encounters remain separate. Appointment/queue state does not create/finalize care or silently grant clinical access. The new queue handoff surfaces clinical role, provider/branch and patient-grant blockers.
- Separate staff and patient GraphQL operations and regenerated existing typed clients. Staff reads use operational clinic/branch/provider scope. Patient reads/actions use the existing live verified self/guardian PortalLink and patient session realm; no public queue endpoint was added.
- Django Channels/Redis invalidations contain only event kind/revision. Native sessions, MFA, clinical-session expiry/revocation, auth hash, current authority and periodic epoch comparison govern sockets. Committed branch revisions survive missed broadcasts. Browser hook provides visible disconnected state, focus refresh and 30-second polling fallback.
- Five new page destinations: `/clinic/appointments`, `/clinic/queue`, `/clinic/settings/schedules`, `/portal/appointments`, `/portal/queue`. Existing white clinical theme, canonical shadcn/Radix choices, Tailwind, grouped forms, confirmations and dirty-state helpers are reused. No clinical media or avatar behavior was replaced.

These are source-level deliverables, not a claim that the complete accepted workflow is verified or currently available in the running app. In particular, patient appointment actions and the production UI are blocked by recorded failures.

## Preservation

- Batch 2 Git checkpoint: `checkpoint/django-batch-2-2026-10-19` at `609c257`; older checkpoints remain.
- Private encrypted checkpoint: `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-003013-609c257`. The existing helper retains its historical `pre-batch2` prefix; it contains this pre-Batch-3 state.
- Restored into a new `medframe_django_batch3` rehearsal database. **All 62 table counts matched.** Source database was not written by the checkpoint helper; no plaintext dump was written.
- `operations.0001_initial` and `operations.0002_authority_integrity` applied successfully to that rehearsal clone only. Original `medframe_django` was not migrated, restored over, or reset.
- Tests used separate `medframe_django_batch3_test`, Redis DB 4 and a dedicated channel prefix, with broker DB 5 configuration. No worker was started against rehearsal jobs. Active workers/beat and broker DB 2 were left alone.
- Existing administrator/Dentist role, provider profile, explicit patient grant, native passwords/MFA/sessions, and patient invitations were retained. No account credentials were used/reset for verification.
- The original Next production artifact was not overwritten: the one attempted build used ignored `.next-batch3-rehearsal`. No API/web cutover, source-data mutation, push or deployment occurred.

## One verification pass

Checks ran once without repairs/retries. The build's mandatory TypeScript stage reported the same error as the earlier type check; it was not a second repair/build cycle.

| Check                                                                      | Actual result                                                                   |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Targeted PostgreSQL/Redis domain and Channels tests, one Django invocation | **27 run: 26 passed, one errored**, 12.805 seconds                              |
| TypeScript                                                                 | Failed: patient operations `unknown` value used as a React node                 |
| ESLint                                                                     | Exit 0, no errors, two React Hook Form/React Compiler warnings                  |
| Targeted Ruff                                                              | Failed: 23 embedded-SQL line-length findings                                    |
| Migration drift                                                            | Passed: no changes detected                                                     |
| Strict static frontend audit                                               | Passed: zero findings; not a runtime accessibility claim                        |
| One production build                                                       | JavaScript compiled; TypeScript stage failed; no successful production artifact |
| Connected browser journey                                                  | Not run because the production build was blocked                                |

Backend coverage includes scheduling bounds/DST/adjacency, preservation of reserved windows/resources, booking replay/conflict rollback, concurrent booking/check-in, explicit queue lifecycle, estimate rounding/resource limits, role/branch/realm isolation, private patient snapshots/revocation, native socket authority, actual opaque Redis messages and socket revocation. This targeted set is narrower than every assertion contemplated in the design; cross-profile concurrent races, all lifecycle permutations, pagination extremes, all guardian and active-overrun cases remain unverified.

Before the verification pass, changed Python source was formatted with Ruff and imports organized; supported frontend/contracts/documents were formatted with Prettier. Formatting tools did not repair the later failures. The failed SQL readability check remains deferred.

Evidence logs: `/tmp/medframe-batch3-{backend,types,lint,ruff,migration-drift,premium,build}.log`, `/tmp/medframe-batch3-once-results.json`, and `/tmp/medframe-batch3-migrate-rehearsal.log`. Detailed reproduction/impact is preserved in [error-log.md](error-log.md), B3-001 through B3-005.

## Native transport and future activation

Channels uses the configured `OPERATIONS_REDIS_URL` (defaults to the existing Redis URL) and `OPERATIONS_CHANNEL_PREFIX`; neither changes Celery's broker. Browser native transport is selected with `NEXT_PUBLIC_OPERATIONS_WS_URL`, for example `ws://localhost:8001/ws/operations` with the rehearsal web origin `http://localhost:3001`. Production same-origin `wss` routing requires its own deployment configuration; Next's HTTP backend proxy is not claimed to upgrade WebSockets.

After the user requests deferred repairs, a later activation must preserve this checkpoint, the original web artifact and current writes; take a fresh encrypted backup, resolve blockers, and apply only additive migrations to original Django data. Do not copy the rehearsal database over original data or silently roll back portal/clinical history. Container builds, hosted CI, full historical suites, public deployment and clinical validation were not performed.

Implementation references: [approved design](../superpowers/specs/2026-10-19-medframe-django-batch-3-design.md), [implementation plan](../superpowers/plans/2026-10-19-medframe-django-batch-3.md). Channels integration follows its official [native authentication](https://channels.readthedocs.io/en/stable/topics/authentication.html), [Origin validation](https://channels.readthedocs.io/en/stable/topics/security.html), and [Redis channel-layer](https://channels.readthedocs.io/en/stable/topics/channel_layers.html) documentation; that reference does not substitute for the actual checks above.
