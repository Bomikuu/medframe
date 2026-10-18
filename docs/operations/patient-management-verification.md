# Patient-management verification

Scope: second slice of the approved clinical milestone, implemented natively on `codex/clinical-foundation`. Development uses synthetic patient records. This is not the complete clinical platform or a production deployment.

## Implemented behavior

- Registration with tenant-owned reference and replay-safe request ID, authorized name/reference search, bounded cursor pagination, profiles, grouped demographic editing, and refresh persistence.
- Organization/branch-scoped policies enforced before queries/counts, current permissions, explicit patient grants, eligible clinician selection, grant/revoke attribution, and no administrative clinical bypass.
- Patient-level medical history, relevant conditions, past procedures, structured allergy/medication entries, distinct review states, expected-version conflicts, append-only attributed clinical revisions, and filtered timeline.
- Transaction-owned audit/event writes, independent recent-directory read audit, safe GraphQL errors, no raw Strawberry resolver-error logging, and one bounded root mutation per operation.
- Shared clinic organization context, real patient counts/recent records, responsive directory, native calendar-date input, shared Radix selects, and explicit save/retry/conflict flows. No inactive upload, encounter, chart, billing, or document actions.

## Verification record

- Backend suite: 47 tests passed against real PostgreSQL/Redis, including the existing foundation and mail-outbox suites. Patient tests cover retry races, stale-version concurrency, deterministic grant-revocation/write ordering, tenant/branch scope, membership/role changes, safe ID denial, literal wildcard search, cursor bounds, read audits, transactional rollback, clinical review states, append-only triggers, and protected HTTP GraphQL mutations.
- Complete browser suite: 5/5 passed against the production Next.js server in 30.9 seconds. It covers the existing authentication/recovery journeys, registration with a committed-but-lost response followed by retry, refresh/history/conflicts, Unicode payload limits through the real proxy, administrator demographics/grants without clinical bypass, offline clinical/demographic drafts, branch-only edits, Back/Forward keep/discard behavior, and delayed responses after clinic switching and route reactivation.
- Twelve patient surface/theme/viewport accessibility checks initially passed with zero axe violations, and no horizontal page overflow at 390px. Reviewed synthetic screenshots: `test-results/patients-review/` (ignored), covering registration, record, and directory in desktop/mobile and light/dark modes. Capture is opt-in so behavioral test retries do not become repeated visual polishing.
- Disposable database migration verification: downgrade to base, fresh upgrade through both patient revisions, and `alembic check` passed with no schema drift. The additive development upgrades preserve the user's existing staff identity/MFA.
- Prettier, frontend lint/type checks, API Ruff checks/format, deterministic schema generation, and the production Next.js build passed. The independent review approved the documented local synthetic-data scope after the material findings were fixed; the subsequent production build and complete browser run also passed. No additional subagent review is required to preserve this checkpoint.

## Review and implementation adaptations

The independent whole-branch reviewer identified transient-refresh draft loss, obsolete mutation navigation, browser-history draft loss, and the missing standalone recent-read audit. Fixes distinguish transient errors from authorization denial, preserve mounted draft state with reconnect feedback, guard mutation completions by request activation, retain draft registration until explicit save/discard, protect history traversal, and audit the recent-patient resolver transaction. Runtime regressions exercise these paths.

The patient schema is implemented in two additive migrations: core patient persistence, then additional review-state database checks, a reference trigram index, and explicit grant-target attribution. Alembic does not discover new check constraints automatically, so the second migration declares those checks explicitly. The two migrations were retained after the first had already been applied locally, avoiding an edited migration history over existing synthetic records.

Tests are grouped into schema, workflow, authorization, and GraphQL files rather than a separate test file for every plan substep. No claim is made that every planned checkbox was executed in precisely its original order. Generated schema types and operation types use separate outputs because the installed codegen operations plugin otherwise duplicates input declarations.

Next's installed template/layout/router guidance was inspected. Same-document history state retains Next's own metadata; private form drafts remain in memory only. Navigation API documentation was consulted for traversal notification semantics: [Chrome platform documentation](https://developer.chrome.com/docs/web-platform/navigation-api), [Navigation API specification proposal](https://github.com/WICG/navigation-api). Real-browser checks, rather than assumed event ordering, determine the delivered behavior.

## Remaining boundary

Clinical history is patient-level and has no encounter finalization/amendment semantics yet. Consultations, structured encounter diagnoses, dental charting, procedures/treatments, and private scanned documents remain required for the complete milestone. Profile-image upload remains deferred to the real private-storage slice; the circular-avatar requirement is preserved.

Production still needs the controls described in `production-readiness.md`, including deployment-specific trusted-edge throttling and patient privacy/clinical review. Browser evidence currently targets the installed Chromium runtime; it is not a cross-browser or field-performance certification. No production deployment, remote CI run, push, or clinical validation is claimed.

## Preservation boundary

On October 18, 2026 the user supplied the Django Edition specification and requested preservation before amendments. This report describes the completed FastAPI/SQLAlchemy baseline. Its source, migrations, tests, and operating behavior remain recoverable at the pre-Django checkpoint; they do not constitute Django implementation evidence.
