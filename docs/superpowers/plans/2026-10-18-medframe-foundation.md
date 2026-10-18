# Medframe Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A staff member can enroll MFA, securely sign into an authorized clinic workspace, switch organizations, recover access, and sign out through a real PostgreSQL-backed application.

**Architecture:** One Next.js frontend talks through a same-origin boundary to a FastAPI/Strawberry modular monolith. PostgreSQL owns identity, sessions, tenant membership, and audit; Redis supplies shared rate limits. Foundation does not create patient or clinical tables; those follow in their own approved slices.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui, React Hook Form, Zod, graphql-request, GraphQL Code Generator, FastAPI, Strawberry, SQLAlchemy, Alembic, PostgreSQL, Redis, pwdlib/Argon2, PyOTP, cryptography, pytest, Playwright, Prettier, Ruff.

**Spec:** `docs/superpowers/specs/2026-10-18-medframe-clinical-foundation-design.md`. Read it and `PRODUCT.md` before execution. The master brief is `docs/requirements/medframe-master-v3.txt`.

## Global Constraints

- "The clinical workflow has no dependency on appointments."
- "GraphQL is the primary clinical API. REST handles health, session lifecycle where appropriate, and document transfer."
- "Use UUID identifiers and timezone-aware server timestamps."
- "Require staff MFA before issuing a clinical session."
- "No automated diagnosis or AI-generated clinical judgment is part of this release."
- "Do not compress components, services, or tests into single lines."
- Use Prettier and `prettier-plugin-tailwindcss` for supported files; Ruff for Python. Set print width to 100, two-space frontend indentation, trailing commas, and normal expanded JSX. Use `cn()`/`cva()` for readable variants instead of long concatenations.
- Tailwind handles layout, spacing, responsive states, colors, and dimensions. Global CSS contains Tailwind imports, semantic light/dark theme tokens, base rules, and only justified custom behavior.
- Inputs have visible labels, appropriate types/autocomplete/input modes, and widths reflecting their values. Use logical sections and responsive grids; long notes span the available width.
- Circular upload affordances and preview crops apply to avatars/profile images. Implement actual upload only with the appropriate backend slice; medical images/documents keep their full content.
- Preserve the approved brand and clinical routes. No new logo, marketing hero, fake patient metrics, appointment UI, or public website work.
- Do not put patient data, credentials, reset tokens, session tokens, or MFA secrets into application logs, fixtures committed to Git, screenshots, or error reports. Controlled test-only MFA assertions stay in memory.

## Review Focus

1. A tab retains a session after its membership is revoked: the next request must deny access, with no cached organization payload. Tests belong to Tasks 2, 3, and 6.
2. Two simultaneous requests submit the same TOTP/recovery credential: exactly one succeeds. Tests belong to Task 3.
3. An attacker spoofs forwarding headers or Redis is unavailable: login throttling must not be bypassed and no new clinical session is issued. Tests belong to Task 4.
4. A browser has an expired MFA challenge or loses its network mid-form: it retains safe input, offers a clear restart/retry, and does not claim success. Tests belong to Task 6.
5. A user pastes Unicode passwords, leading-zero OTPs, or a long email address: no password normalization/truncation, OTP numeric coercion, or layout breakage. Tests belong to Tasks 3 and 6.

## Decisions carried by this plan

Execution choices below fill architectural details left open by the approved spec. They are proposed values for plan review, not silently changed product requirements.

- Use npm workspaces and commit `package-lock.json`; use uv for the API and commit `uv.lock`. Resolve compatible supported dependency versions during implementation and record exact versions in lockfiles. Do not install the 3D stack until the dental slice.
- Local Compose starts PostgreSQL, Redis, and a private development mailbox on loopback. Add API/web containers and health checks for integrated tests. Object storage and scanning are introduced in the document slice.
- Use database-backed opaque clinical sessions: eight-hour absolute expiry and thirty-minute inactivity expiry, both enforced by the backend. A separate five-minute challenge permits MFA setup/verification only. Rotate tokens between challenge and full session; store SHA-256 token digests, never raw tokens.
- Use Argon2 password hashing through pwdlib. Accept 15-128 Unicode characters, preserve exact password bytes after UTF-8 encoding, and reject oversized values rather than truncating. Do not trim passwords. Normalize login email consistently in backend and provisioning.
- TOTP uses six ASCII digits, thirty-second periods, and a one-step clock window. Persist the greatest consumed time step atomically to prevent replay. Encrypt secrets with a supplied Fernet key. First enrollment must succeed with a TOTP from the pending secret; recovery codes cannot complete first enrollment. Only after that verification, activate the credential and generate ten one-time recovery codes; store only digests, show them once, and require confirmation of storage.
- `medframe_session` and `medframe_challenge` are HttpOnly, SameSite=Lax, Path=/ cookies; Secure is required in production. Restrict insecure cookies to explicit loopback development. No wildcard cookie domain. Auth and private GraphQL responses use `Cache-Control: no-store`.
- The web proxy forwards only known backend paths, never a client-selected target. Preserve Set-Cookie correctly. Reject unapproved Origin before proxying unsafe requests and validate again at the API; require a session/challenge-bound CSRF token on unsafe requests. No cookie-authenticated mutation over GET or simple cross-origin form requests.
- Fixed-window shared limits: five login failures per fifteen minutes per normalized identity and trusted client address; five MFA attempts per challenge; three recovery requests per hour per normalized identity and trusted client address. Only explicitly configured trusted proxies may supply the client address. Redis failure returns a generic retryable unavailable response for sensitive operations.
- Password reset tokens expire after fifteen minutes. Outbound email delivery does not alter the enumeration-safe request response. Do not expose reset links in JSON, logs, or frontend notifications. A completed reset revokes all sessions and challenges; MFA remains required.
- GraphQL initially exposes `currentUser`, `myOrganizations`, and `clinicWorkspace(organizationId: UUID!)`. A depth cap of 8, operation cost cap of 100, document size cap of 16 KiB, and request throttling apply. Cost accounting expands fragments and counts repeated aliases; HTTP batching is disabled. Disable introspection and GraphiQL in production while allowing offline schema export.

## File ownership and interfaces

Each feature owns its schemas, services, routes, and tests. Keep HTTP transport, GraphQL presentation, domain policy, and storage distinct without building a generic framework.

| Area                    | Files and responsibilities                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository              | `package.json`, `prettier.config.mjs`, `.prettierignore`, `.editorconfig`, `.gitignore`, `.env.example`, `README.md`                                                                                                |
| Runtime                 | `infrastructure/compose.yaml`, service Dockerfiles, `services/api/pyproject.toml`, `uv.lock`, web package/lock/config                                                                                               |
| API core                | `services/api/app/main.py`, `core/config.py`, `core/database.py`, `core/errors.py`, `core/security.py`, `core/request_context.py`                                                                                   |
| Organizations           | `modules/organizations/models.py`, `permissions.py`, `schemas.py`, `service.py`                                                                                                                                     |
| Identity                | `modules/identity/models.py`, `schemas.py`, `passwords.py`, `sessions.py`, `mfa.py`, `recovery.py`, `routes.py`, `provision.py`                                                                                     |
| Audit                   | `modules/audit/models.py`, `service.py`, `logging.py`                                                                                                                                                               |
| Infrastructure adapters | `services/api/app/adapters/rate_limit.py`, `mail.py`; HTTP guard in `core/http_security.py`                                                                                                                         |
| Migrations              | `services/api/alembic.ini`, `migrations/env.py`, `migrations/versions/0001_foundation.py`                                                                                                                           |
| GraphQL                 | `services/api/app/graphql/context.py`, `types.py`, `query.py`, `schema.py`, `limits.py`, `export_schema.py`                                                                                                         |
| Web contracts           | `apps/web/schema.graphql`, `codegen.ts`, `lib/graphql/client.ts`, `lib/graphql/generated.ts`, `lib/graphql/workspace.graphql`, `lib/auth/client.ts`, `lib/auth/schemas.ts`                                          |
| Web surfaces            | `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/login/page.tsx`, `app/clinic/layout.tsx`, `app/clinic/page.tsx`, `app/auth/recover/page.tsx`, `app/auth/reset/page.tsx`                                   |
| Web behavior            | `features/auth/` for individual login/MFA/recovery forms and controller; `features/workspace/` for clinic shell, organization switcher, access/empty/error states; `components/ui/` for installed shadcn primitives |
| Tests                   | `services/api/tests/` for backend/integration tests; `apps/web/tests/` for browser journeys; `.github/workflows/ci.yml` for reproducible checks                                                                     |

Shared Python contracts: `Principal(user_id: UUID, session_id: UUID, mfa_verified: bool)`, `RequestContext(request_id: str, client_address: str, origin: str | None)`, `SessionResult(token: str, csrf_token: str, expires_at: datetime)`, `ChallengeResult(token: str, csrf_token: str, expires_at: datetime, next_step: Literal['enroll', 'verify'])`, and `MfaCompletionResult(session: SessionResult, recovery_codes: list[str] | None)` live in `modules/identity/schemas.py` except `RequestContext`, which lives in `core/request_context.py`. Transport serializers never expose raw session/challenge tokens in JSON. CSRF request tokens are deliberately available to the same-origin client; recovery codes are returned once after verified enrollment.

Errors have a safe `code`, user-facing `message`, and request ID. Authorization uses the same safe `FORBIDDEN` response for nonexistent and unrelated organizations. SQLAlchemy sessions use `expire_on_commit=False`; request and transaction boundaries are explicit. Services flush; route-level units of work commit or roll back. Separate audit-denial transactions survive rejected operations.

## Task 1: Reproducible runtime, database, and formatting foundation

**Files:** Create repository/runtime/core configuration files above, `apps/web/package.json`, `services/api/tests/conftest.py`, `tests/test_runtime.py`, and the initial health application. Create `.env.example` with names and instructions, no working passwords or encryption keys.

**Interfaces:** Produce `create_app() -> FastAPI` in `main.py`, `get_settings() -> Settings` in `core/config.py`, and `get_db() -> AsyncIterator[AsyncSession]` in `core/database.py`. Produce `/health/live` (process status) and `/health/ready` (PostgreSQL/Redis availability), returning no connection details.

- [ ] Write `test_readiness_requires_database_and_redis`, asserting 503 when either required service is absent and 200 when both are reachable; assert responses contain no DSN/password. Test invalid production config rejects missing keys and insecure cookie settings before serving requests.
- [ ] Start isolated test PostgreSQL/Redis via Compose and run `uv run --project services/api pytest services/api/tests/test_runtime.py -q`; confirm failure because the application/configuration does not exist yet.
- [ ] Implement the runtime, environment validation, async sessions, health routes, loopback Compose services, npm workspace, and TypeScript skeleton. Keep UI scaffolding minimal until Task 6. Add Prettier with the official Tailwind plugin, `tailwindStylesheet: './apps/web/app/globals.css'`, and `tailwindFunctions: ['cn', 'cva']`; exclude generated/build/lock artifacts and the exact master-source copy from reformatting.
- [ ] Define root scripts `format`, `format:check`, `lint`, `typecheck`, `codegen`, `test:e2e`, and `build`. Python checks use `ruff check` and `ruff format --check`. Confirm `npm run format:check` and the targeted runtime tests pass.
- [ ] Commit only the runtime and tooling deliverable with a descriptive message after checking staged files for secrets.

## Task 2: Persistent organizations, permissions, provisioning, and audit

**Files:** Create organization and audit modules, identity persistence models, foundation migration, and `tests/test_organizations.py`, `tests/test_provisioning.py`, `tests/test_audit.py`.

**Interfaces:** Produce `require_permission(db: AsyncSession, principal: Principal, organization_id: UUID, permission: str) -> Membership` in `organizations/permissions.py`; `list_my_organizations(db, principal) -> list[OrganizationSummary]` and `get_workspace(db, principal, organization_id) -> WorkspaceSummary` in `organizations/service.py`. Define summary DTOs in `organizations/schemas.py`. Produce `append_event(db, principal: Principal | None, context: RequestContext, action: str, organization_id: UUID | None, resource_id: UUID | None, outcome: str) -> None` in `audit/service.py`.

- [ ] Write PostgreSQL tests: two organizations sharing a provider remain isolated; inactive membership fails immediately; unassigned organization IDs and nonexistent IDs return equivalent safe errors; clinic/platform administrators have no implicit clinical-record permission. Verify organization deletion cannot cascade away audit evidence.
- [ ] Write `test_provisioning_creates_one_explicit_membership`, `test_provisioning_rejects_duplicate_normalized_email`, and `test_audit_failure_rolls_back_sensitive_write`. Define reusable `org_a`, `org_b`, `dentist`, `administrator`, `receptionist`, and `revoked_membership` fixtures in `conftest.py` without committed credentials.
- [ ] Run the three targeted test files to establish expected failures, then implement tables, foreign keys, organization/branch membership constraints, role-permission assignments, and the audit interface. Seed only versioned role/permission definitions in migrations, never demo clinics or passwords.
- [ ] Implement `uv run --project services/api python -m app.modules.identity.provision` as a prompting CLI for an explicit organization/branch and staff identity. Grant only the selected roles; support an existing user's additional organization membership without changing their password. Keep it idempotent for repeated organization/branch names scoped by stable IDs.
- [ ] Apply `alembic upgrade head` against an empty PostgreSQL database, run tests, and verify organization summaries contain only authorized organizations. Commit the independently tested data/policy foundation.

## Task 3: Password, challenge, mandatory MFA, and clinical session lifecycle

**Files:** Create identity schemas, passwords, sessions, MFA, routes, core security helpers, and `tests/test_authentication.py`, `tests/test_mfa.py`, `tests/test_sessions.py`.

**Interfaces:** Produce `verify_password(password: str, password_hash: str) -> bool`; `begin_login(db, email: str, password: str, context: RequestContext) -> ChallengeResult`; `begin_mfa_enrollment(db, challenge_token: str) -> EnrollmentResult`; `complete_mfa(db, challenge_token: str, code: str, context: RequestContext) -> MfaCompletionResult`; `authenticate_session(db, token: str, now: datetime) -> Principal`; and `revoke_session(db, principal, context) -> None`. Define `EnrollmentResult(otpauth_uri: str)` in the identity schemas. First enrollment returns the pending secret through that URI only to the password-authenticated challenge; recovery codes are issued only after successful TOTP verification, never in logs.

- [ ] Write `test_password_preserves_unicode_and_whitespace`, asserting a valid 15-128-character password survives unchanged and a trimmed/normalized variation does not authenticate. Assert oversized passwords fail without truncation and unknown-user login performs a dummy password verification before the same safe denial.
- [ ] Write `test_challenge_cannot_authenticate_graphql`, `test_enrollment_requires_totp_before_recovery_codes_exist`, `test_leading_zero_totp_is_a_string`, `test_totp_replay_race_allows_one_success`, and `test_recovery_code_is_single_use_under_concurrency`. Use row locking/atomic updates against PostgreSQL in concurrency tests, not mocked in-memory stores.
- [ ] Write session expiry, revoked-user, membership-revocation, logout, and rotation tests; assert stored values are digests and a clinical cookie is issued only after successful MFA. Establish failures using the three targeted pytest files.
- [ ] Implement Argon2 hashing, password login, five-minute challenges, encrypted TOTP enrollment, replay-safe verification, ten hashed recovery codes, session rotation, expiry, and logout. Expose `POST /auth/login`, `/auth/mfa/enroll`, `/auth/mfa/verify`, `/auth/logout`; use the appropriate bound CSRF protection from Task 4 before exposing browser flows. Enrollment requires password-authenticated challenge and returns secrets with no-store headers.
- [ ] Verify tests, including two concurrent requests, and inspect exception/log redaction. Commit the identity lifecycle without connecting an unguarded browser flow.

## Task 4: HTTP protection, shared throttling, and recovery delivery

**Files:** Create adapters, `core/http_security.py`, identity recovery service/routes, safe audit logging, and `tests/test_http_security.py`, `tests/test_rate_limits.py`, `tests/test_recovery.py`.

**Interfaces:** Produce `enforce_rate_limit(bucket: str, identity: str, client_address: str, limit: int, window_seconds: int) -> None`; `validate_unsafe_request(request: Request, csrf_secret: str) -> None`; `request_password_reset(db, email: str, context: RequestContext) -> None`; `reset_password(db, token: str, password: str, context: RequestContext) -> None`; and `send_password_reset(email: str, reset_url: str) -> None` behind a mail adapter.

- [ ] Write tests rejecting missing/mismatched Origin and CSRF values, foreign-origin form POSTs, GraphQL GET mutations, and spoofed X-Forwarded-For from untrusted peers. Verify same-origin read requests remain usable and denied requests have safe audit outcomes.
- [ ] Write `test_rate_limit_is_shared_across_workers`, `test_redis_outage_denies_new_sensitive_operation`, and `test_mfa_throttle_does_not_reset_with_new_worker`. Confirm exact limits defined above and `Retry-After` behavior. Count identity and client limits independently to prevent identity rotation from bypassing address limits.
- [ ] Write reset-token expiry/reuse and concurrent-consumption tests, session/challenge revocation after reset, generic unknown-account responses, and mail-failure behavior. Assert response/log bodies contain neither reset token nor internal mail details. Run the targeted files for expected failures.
- [ ] Implement atomic Redis counters with expiry, trusted-proxy handling, bound CSRF tokens, no-store/private response headers, secure cookie policy, request body-size caps, and generic error serialization. Expose `GET /auth/csrf` for a restricted bootstrap context and recovery endpoints `POST /auth/recovery/request` and `POST /auth/recovery/reset`; both unsafe flows require appropriate bootstrap/session CSRF. Use a separate short-lived HttpOnly bootstrap cookie for pre-login CSRF; it grants no identity, MFA challenge, or clinical access. Require an approved Origin to create this context and never log its secret.
- [ ] Deliver mail to the private local mailbox and provide a production SMTP adapter configured by environment. Keep delivery off the account-enumeration response path with durable PostgreSQL outbox records, a bounded retry worker, and idempotent claims; never persist plaintext reset secrets unencrypted. Add outbox records in this task's migration. Run the targeted tests and commit.

## Task 5: Protected GraphQL and generated frontend contracts

**Files:** Create GraphQL files, `tests/test_graphql.py`, `tests/test_graphql_limits.py`, web GraphQL client/documents/codegen files, and `app/api/backend/[...path]/route.ts` with `lib/server/backend-proxy.ts`.

**Interfaces:** `currentUser -> UserType { id, displayName }`, `myOrganizations -> [OrganizationType { id, name, roleLabels }]`, `clinicWorkspace(organizationId: UUID!) -> WorkspaceType { organization, branches, permissions }`. Organization summaries contain no unrelated staff or patient data. Produce `getGraphqlClient(): GraphQLClient` using the same-origin proxy, generated operation types, and `requestWithCsrf<T>(path, body): Promise<T>` in `lib/auth/client.ts` for auth transport.

- [ ] Write tests for unauthenticated requests, challenge-only cookies, revoked membership, scoped branch data, and safe GraphQL errors with request IDs. Assert invalid IDs cannot cause cross-tenant joins. Verify persisted role changes appear on the next request.
- [ ] Write tests for aliases, fragments, cyclic fragments, excessive depth/cost/size, JSON batch arrays, and invalid content type. Assert rejection before resolver side effects; parameterized requests over GET cannot execute mutations. Establish failures.
- [ ] Implement the Strawberry context and DTO mappings using Tasks 2-4 contracts. Implement the depth/document/cost guards and disable browser IDE/introspection in production. Offline schema export bypasses network/auth but does not bypass schema validation.
- [ ] Implement the fixed-target same-origin proxy. Allow only auth and GraphQL paths, forward the cookies/CSRF headers needed for these operations, preserve every Set-Cookie header, enforce body-size/origin restrictions, and reject arbitrary upstream hosts/paths. Test redirect and cookie forwarding without exposing tokens to frontend JavaScript.
- [ ] Export the schema, run code generation, and verify `npm run codegen` produces no unexpected diff on a second run. Run GraphQL and proxy tests, then commit the typed API boundary.

## Task 6: Readable clinical login, MFA, recovery, and clinic shell

**Files:** Create the web surface/feature files in the ownership table, individual shadcn primitives, `tests/auth.spec.ts`, `tests/workspace.spec.ts`, `tests/accessibility.spec.ts`, and approved surface/design context files following Impeccable's workflow.

**Interfaces:** Produce separate `LoginForm`, `MfaEnrollmentForm`, `MfaVerificationForm`, `RecoveryRequestForm`, `PasswordResetForm`, `OrganizationSwitcher`, and `ClinicShell` components. Keep the auth-step controller in `features/auth/auth-flow.tsx`; no single component owns transport, validation, MFA setup, recovery, layout, and organization data. Auth response states are `enroll`, `verify`, `authenticated`, `expired`, and safe `error` outcomes.

- [ ] Before UI edits, load Impeccable's craft floor and applicable frontend design/production guidance. Use the approved clinical brand and Operate mode; preserve the supplied constraints. Complete any required surface/build-path decision with the user rather than inventing a saved preference. No decorative photography or clinical-image generation is needed for login or the clinic shell.
- [ ] Write browser journeys against the real API/PostgreSQL: password -> MFA enrollment/verification -> organization choice -> clinic workspace -> logout. Assert refresh preserves the valid session, unauthenticated navigation redirects to login, and revoked membership removes access even in an already open tab.
- [ ] Write form tests: a long email fits without horizontal overflow; email uses `type=email`/autocomplete; passwords use the correct current/new autocomplete and visibility control; OTP uses a string, numeric keyboard hint, `one-time-code`, and preserves leading zeros; recovery codes remain pasteable. Offline and expired-challenge errors retain safe input and offer a restart/retry without a false success notification. Confirm tests fail before implementation.
- [ ] Install shadcn/ui components using the official CLI and verify dependencies before imports. Implement one semantic token system with the approved colors/Inter, matching light/dark behavior, Phosphor icons, consistent control sizes/radii, Tailwind-first responsive grids, clear inline errors, and focus management. Keep forms grouped by authentication step and controls sized for their expected values; never use placeholder text as a label.
- [ ] Build `/clinic` using only `currentUser`, `myOrganizations`, and `clinicWorkspace`. Show the real organization name/branches, access state, and an honest foundation-stage empty workspace. Do not display invented patient counts, working-looking patient actions, or image upload buttons before their backend slice exists. Circular profile upload requirements remain recorded for the later real upload flow.
- [ ] Implement loading, expired-session, unavailable-service, zero-organization, denied-access, and logout states. Clear private organization state when switching or losing authorization. Keep safe errors actionable and no-store behavior consistent.
- [ ] Run the targeted browser journeys and frontend type/lint/format checks. Commit the integrated login/workspace experience only after its backend flow passes.

## Task 7: Integrated release verification and reproducible handoff

**Files:** Create/update `README.md`, `.github/workflows/ci.yml`, `playwright.config.ts`, `services/api/tests/test_foundation_journey.py`, `docs/operations/local-development.md`, and `docs/operations/production-readiness.md`.

**Interfaces:** Root commands expose `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run codegen`, `npm run test:e2e`, and `npm run build`. Backend commands use the API's locked uv environment. Document exact Compose startup, migration, provisioning, worker, API, and web commands.

- [ ] Add the integrated real-PostgreSQL journey: provision two organizations -> enroll staff MFA -> authorize one workspace -> deny the other -> revoke membership -> deny next access -> expire/reset credential -> revoke sessions -> require MFA again. Verify audit events exist and public errors do not identify other organizations.
- [ ] Run migrations from an empty database and from the previous foundation revision. Run the targeted journey plus all foundation backend tests; confirm no test is passing only because database/Redis fixtures were skipped.
- [ ] Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run codegen`, backend Ruff checks, and `npm run test:e2e`. Make one production build at this integration checkpoint. Generated contracts must match the backend schema.
- [ ] Inspect desktop/mobile and light/dark states together in one browser review round, including keyboard flow and network errors. Fix observed issues in one batch and confirm once. Run automated accessibility checks and a bounded Lighthouse inspection of the actual foundation surfaces; record measured results and limitations rather than claiming targets without evidence.
- [ ] Complete the applicable Impeccable finish review and document the actual shipped tokens in `DESIGN.md` and `.impeccable/design.json`. A required fresh reviewer is independent of the implementation author; use the user's chosen execution method. Do not repeat open-ended polish loops.
- [ ] Document missing production configuration and the next patient-management slice. Report exactly which tests/checks passed, which were blocked, the implemented scope, and that foundation is not yet the complete clinical milestone. Commit the verified foundation handoff; do not push, publish, or deploy without the applicable user instruction.

## Subsequent slice contract

After foundation, prepare the patient-management plan against the approved clinical specification. It must include grouped identity/contact/medical forms, type-appropriate controls, PostgreSQL-backed registration and search, explicit clinician-patient relationships, and the refresh-persistence/security acceptance tests. Profile avatars use circular choose/change/remove controls only when implemented with real private storage. Do not substitute the foundation shell for this next deliverable.

## Self-review and execution handoff

- Foundation scope maps to Tasks 1-7. Patient/encounter/dental/treatment/document behaviors are deliberately owned by subsequent slice plans, not silently removed from the milestone.
- Every Review Focus item has an owning task and an explicit failure assertion. Interface names are shared consistently; backend policy remains authoritative.
- Secrets stay outside source control; runtime-derived test credentials and MFA material never become committed examples.
- The execution helper was resolved from the local Superpowers bundle at implementation time. The user selected native implementation in this chat; no global helper installation was needed.
- The user reviewed the plan and selected native execution. Implementation ran in this checkout on codex/clinical-foundation, followed by an independent final review. Both material findings were fixed and the reviewer approved shipping at the documented local-foundation scope.

## Primary implementation references

- [Tailwind Labs Prettier plugin](https://github.com/tailwindlabs/prettier-plugin-tailwindcss): Tailwind v4 stylesheet entry and class sorting.
- [shadcn/ui Next.js installation](https://ui.shadcn.com/docs/installation/next): use the supported installation route and then customize the approved tokens.
- [FastAPI password hashing guidance](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/): pwdlib/Argon2 hashing; this plan deliberately uses opaque sessions rather than copying the tutorial's JWT transport.
- [Strawberry query depth limiter](https://strawberry.rocks/docs/extensions/query-depth-limiter): depth is one bound; the plan also requires independent cost/body/batching limits.

## Execution evidence

See `docs/operations/foundation-verification.md` for measured results, implementation adaptations, and remaining deployment limits. This completion applies to the foundation slice only.

### Task-level completion

The original step checklist above is preserved as the planned sequence, rather than retroactively claiming every test was written before its implementation. Work was implemented natively, with regression tests added incrementally and related commits consolidated. Task outcomes:

- [x] Task 1: runtime, migrations, environment validation, and formatting tooling.
- [x] Task 2: persistent organizations, permissions, provisioning, and audit.
- [x] Task 3: password, challenge, mandatory MFA, and session lifecycle.
- [x] Task 4: HTTP protection, Redis throttling, and recovery outbox/worker.
- [x] Task 5: protected GraphQL, request bounds, proxy, and generated contracts.
- [x] Task 6: integrated authentication and tenant workspace UI.
- [x] Task 7: local integration/browser/accessibility checks, design documentation, CI definition, and handoff.
