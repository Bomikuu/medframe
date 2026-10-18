# Django Batch 3 — implementation and single-pass evidence

Date: October 19, 2026, Asia/Manila. Branch: `codex/django-clinic-batch-3`.

**State: Batch 3 activated locally on October 19, 2026, following the user’s explicit activation request.** Django is on port 8000 and the new production frontend is on port 3000. The original failed implementation pass is retained below as history; the later authorized repairs and activation evidence are in the final section. New issues remain logged and deferred.

## Implementation source

- New focused `medframe_apps.operations` module: weekly provider schedules and date overrides, finite rooms/chairs, booking and rescheduling, cancellation/no-show/acknowledgement, check-in and walk-ins, queue ordering/state/delay/extension, optional consultation linkage, setting-based wait ranges, and patient-only operational snapshots/actions.
- PostgreSQL reservations use half-open ranges and exclusion constraints on provider User identity, patient within clinic, and optional resource. Version checks, request receipts, attributed append-only events, scope triggers, unique ticket numbering and active-service ownership support transactional boundaries.
- Appointments and clinical encounters remain separate. Appointment/queue state does not create/finalize care or silently grant clinical access. The new queue handoff surfaces clinical role, provider/branch and patient-grant blockers.
- Separate staff and patient GraphQL operations and regenerated existing typed clients. Staff reads use operational clinic/branch/provider scope. Patient reads/actions use the existing live verified self/guardian PortalLink and patient session realm; no public queue endpoint was added.
- Django Channels/Redis invalidations contain only event kind/revision. Native sessions, MFA, clinical-session expiry/revocation, auth hash, current authority and periodic epoch comparison govern sockets. Committed branch revisions survive missed broadcasts. Browser hook provides visible disconnected state, focus refresh and 30-second polling fallback.
- Five new page destinations: `/clinic/appointments`, `/clinic/queue`, `/clinic/settings/schedules`, `/portal/appointments`, `/portal/queue`. Existing white clinical theme, canonical shadcn/Radix choices, Tailwind, grouped forms, confirmations and dirty-state helpers are reused. No clinical media or avatar behavior was replaced.

The implementation is now available locally. The complete staff/patient browser journey remains unverified: its sole activation attempt was interrupted at a mismatched MFA test selector. See the activation section for precise limits; source completeness is not a claim of exhaustive acceptance.

## Initial implementation preservation

- Batch 2 Git checkpoint: `checkpoint/django-batch-2-2026-10-19` at `609c257`; older checkpoints remain.
- Private encrypted checkpoint: `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-003013-609c257`. The existing helper retains its historical `pre-batch2` prefix; it contains this pre-Batch-3 state.
- Restored into a new `medframe_django_batch3` rehearsal database. **All 62 table counts matched.** Source database was not written by the checkpoint helper; no plaintext dump was written.
- `operations.0001_initial` and `operations.0002_authority_integrity` applied successfully to that rehearsal clone only. Original `medframe_django` was not migrated, restored over, or reset during that initial pass. The subsequent activation applied the same additive migrations in place.
- Tests used separate `medframe_django_batch3_test`, Redis DB 4 and a dedicated channel prefix, with broker DB 5 configuration. No worker was started against rehearsal jobs. Active workers/beat and broker DB 2 were left alone.
- Existing administrator/Dentist role, provider profile, explicit patient grant, native passwords/MFA/sessions, and patient invitations were retained. No account credentials were used/reset for verification.
- The original Next production artifact was not overwritten: the one attempted build used ignored `.next-batch3-rehearsal`. No API/web cutover, source-data mutation, push or deployment occurred during the initial pass. The native cutover is recorded below; no push/public deployment occurred.

## Initial one-pass verification history

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

The user subsequently requested activation, authorizing the necessary recorded blocker repairs. This preserved the checkpoint, original web artifact and current writes, took a fresh encrypted backup, and applied only additive migrations to original Django data. Do not copy the rehearsal database over original data or silently roll back portal/clinical history. Container builds, hosted CI, full historical suites, public deployment and clinical validation were not performed.

Implementation references: [approved design](../superpowers/specs/2026-10-19-medframe-django-batch-3-design.md), [implementation plan](../superpowers/plans/2026-10-19-medframe-django-batch-3.md). Channels integration follows its official [native authentication](https://channels.readthedocs.io/en/stable/topics/authentication.html), [Origin validation](https://channels.readthedocs.io/en/stable/topics/security.html), and [Redis channel-layer](https://channels.readthedocs.io/en/stable/topics/channel_layers.html) documentation; that reference does not substitute for the actual checks above.

## Authorized activation — October 19, 2026

The user explicitly requested “activate batch 3.” Necessary blocker repairs are committed as `980a1c4`, retained by `checkpoint/pre-batch3-activation-2026-10-19`.

- B3-001: patient actions lock only the appointment row via `select_for_update(of=("self",))`, preserving joins and the existing live-link/patient transaction boundary.
- B3-002: patient error rendering uses an explicit boolean guard; no TypeScript/build safety check was disabled.
- B3-003: embedded SQL was wrapped at whitespace outside quoted literals without changing its logic. No lint rule was suppressed.
- A single focused activation pass ran the portal action test module: **3 tests passed in 1.279 seconds**. Targeted Ruff passed. One production build, including its TypeScript stage, passed. The full historical backend suite was not rerun, and the remaining React Compiler warnings were not repaired.

### Fresh preservation and cutover

API, web, worker and beat were paused before migration. Fresh encrypted checkpoint `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-005942-980a1c4` restored into new `medframe_django_batch3_activation_restore`; all **62 table counts matched**. The helper’s historical filename prefix remains unchanged.

A private row-fingerprint capture then covered **3,623 rows across 62 original tables**. `operations.0001_initial` and `operations.0002_authority_integrity` applied directly to original `medframe_django`. Before accepting writes, comparison confirmed **all 3,623 original rows unchanged**, including native identity/password/MFA/session, membership/grant and clinical/portal rows. New tables and additive permission rows are allowed; no original row was rewritten. Fingerprints remain private as `batch3-preservation.json` beside the encrypted checkpoint. No rehearsal data was restored over original data.

The production build remains in ignored `apps/web/.next-batch3-rehearsal`, selected by native `NEXT_DIST_DIR`; the name describes its build location, not the active database. Original `apps/web/.next` remains untouched as the Batch 2 artifact. Native web points to original Django on port 8000, and the built WebSocket URL is `ws://localhost:8000/ws/operations`. API uses `WEB_ORIGIN=http://localhost:3000`. Worker/beat resumed original broker DB 2 without consuming rehearsal jobs.

`/health/ready` returned ready. Unauthenticated operations page requests returned the expected 307 sign-in redirects. Native API/web startup succeeded. Read-only authorization/setup inspection confirmed `admin@medframe.example.com` retains its roles/profile/patient grant and now has `operations.read`, `appointments.manage`, `queues.manage`, and `schedules.manage`, with one eligible provider and one clinic patient. Its password and MFA were not used/reset.

### Browser check limitation

One synthetic connected browser attempt ran against the activated app with retries disabled. The fixture’s new explicit `MEDFRAME_OPERATIONS_SEED_ACTIVE=1` opt-in permits synthetic local-original-DB fixtures; production remains forbidden and the default remains rehearsal-only. It added a separate synthetic clinic/staff/patient/invitation through the existing native provisioning services. No original account was modified.

The attempt was interrupted promptly at `operations.spec.ts:60`: the test waits for **Authenticator code**, while existing MFA verification labels the field **Authenticator or recovery code**. No product authorization failure was established, and no selector fix or retry was made. This is B3-006 in the issue log. No completed browser journey, runtime accessibility pass or screenshot approval is claimed. Batch 3 remains active based on the passing focused backend/build checks and completed preservation/cutover checks; further workflow issues should be logged for later user-requested fixes.

Evidence: `/tmp/medframe-batch3-activation-{patient-actions,format-python,build}.log`, `/tmp/medframe-batch3-activation-pass.json`, `/tmp/medframe-batch3-activation-checkpoint.json`, `/tmp/medframe-batch3-activation-migrate.log`, `/tmp/medframe-batch3-preservation-{capture,check}.json`, `/tmp/medframe-batch3-active-browser.log`. Native logs: `/tmp/medframe-{django,web,celery,beat}-batch3-runtime.log`.
