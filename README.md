# Medframe

The Foundation of Modern Care.

A clinical-first healthcare platform. This branch implements the **foundation slice**: secure staff authentication, mandatory authenticator MFA, recovery codes, password recovery, tenant-scoped workspace access, branch scoping, and audit records. Patient registration, consultations, dental charting, treatments, and medical uploads are subsequent slices, not implemented controls.

## Local development

Requires Node.js 22+, Python 3.12+, uv, and Docker Compose. Use synthetic data only.

```bash
python3 scripts/setup-local.py
docker compose --env-file .env -f infrastructure/compose.yaml up -d --wait
uv sync --project services/api
npm ci
uv run --project services/api alembic -c services/api/alembic.ini upgrade head
uv run --project services/api python -m app.modules.identity.provision
```

The provisioning command prompts for staff identity, clinic, branch, role, and a password. New passwords must contain 15-128 characters. Reusing an existing user's email adds a membership without resetting their password. No default account or shared password is shipped.

Run these in separate terminals:

```bash
uv run --project services/api uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

```bash
npm run dev
```

```bash
uv run --project services/api python -m app.adapters.mail
```

Open [Medframe](http://localhost:3000/login). Enroll an authenticator on first sign-in, verify its code, and save the single-use recovery codes in your password manager. The local-only [mailbox](http://localhost:58025) receives password-reset links. Keep `localhost` as the browser hostname; the configured origin intentionally rejects other hostnames.

Alternatively, the optional Compose `app` profile supplies API, web, and recovery-worker containers. Stop native servers before using the same ports. Run `docker compose --env-file .env -f infrastructure/compose.yaml --profile app up --build -d --wait`, then provision with `docker compose --env-file .env -f infrastructure/compose.yaml exec api python -m app.modules.identity.provision`.

`scripts/setup-local.py` generates a private, ignored `.env` and refuses to overwrite it. Never commit it. Preserve its encryption key for as long as its database remains in use; replacing that key makes existing MFA and queued recovery material unreadable.

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm run codegen
uv run --project services/api ruff check services/api scripts
uv run --project services/api ruff format --check services/api scripts
npm run build
```

Frontend code is formatted with Prettier and the Tailwind class-order plugin. Python uses Ruff. The frontend uses shared shadcn/Radix primitives, semantic Tailwind tokens, self-hosted Inter, and Phosphor icons. See [DESIGN.md](DESIGN.md) and [UX-CONTRACT.md](UX-CONTRACT.md).

Backend tests **require a separate database**. They truncate their test database, never the development database:

```bash
uv run --project services/api python scripts/prepare-test-db.py
uv run --project services/api pytest services/api/tests -q
```

With the API and web server running, install Chromium once and run browser checks:

```bash
npm exec --workspace apps/web playwright install chromium
npm run test:e2e
```

Browser checks create explicitly synthetic development staff with random credentials. They reset only loopback-client Medframe throttling counters to make repeated local runs deterministic. They refuse production. Traces/videos are disabled to avoid recording MFA material. Review captures include only the empty login and authorized synthetic workspace.

## Structure

- `apps/web`: Next.js application, focused authentication/workspace features, typed GraphQL client.
- `services/api`: domain services, PostgreSQL persistence, migrations, auth REST endpoints, protected GraphQL queries, tests.
- `infrastructure`: local PostgreSQL, Redis, and Mailpit configuration.
- `docs/requirements`: original master brief, preserved exactly.
- `docs/superpowers`: approved architecture and foundation plan.
- `docs/operations`: deployment limitations and implementation evidence.

The database is authoritative. Cookies contain opaque tokens; the database stores token digests. A password-only challenge never grants clinical access. Roles grant only explicit permissions within active organization memberships; no role grants universal clinical-record access.

## Deployment status

This is a development foundation, not a clinically deployable release. See [production readiness](docs/operations/production-readiness.md) for required infrastructure, privacy, recovery, and operational review. Nothing in the app claims regulatory compliance. The approved logo and clinically reviewed dental asset remain pending.

## Patient management

Open **Patients** after signing in. Registration, authorized name/reference search, demographics, medical history, allergies, medications, revision history, and explicit clinician assignment use PostgreSQL-backed GraphQL operations. Search terms and unsaved clinical input stay out of URLs and browser storage.

A clinic administrator can register patients, edit demographics, and grant access to eligible clinicians. This role has no medical-history bypass. To provision a clinician in the same clinic and branch, run the existing command and select `doctor` or `dentist`:

```bash
uv run --project services/api python -m app.modules.identity.provision
```

Use the exact clinic/branch names to reuse an existing organization. Password entry remains hidden, and the clinician must complete MFA. Registering as a clinician grants that clinician patient access atomically; patients registered by administrative staff require an explicit clinician assignment before clinical care documentation.

Both demographic and medical-history edits detect stale versions and preserve entered values for review. Retrying an unchanged registration uses the same request ID to prevent duplicate records. Successful create/edit opens the saved patient profile. Changes are explicitly saved; this slice does not autosave.

Schema generation writes `schema.graphql`, `lib/graphql/schema-types.ts`, and `lib/graphql/generated.ts` inside `apps/web`. Run `npm run codegen` after API contract changes. Patient browser checks are in `apps/web/tests/patients.spec.ts`; set `MEDFRAME_CAPTURE_REVIEW=1` only for a deliberate batched screenshot review.

See `docs/operations/patient-management-verification.md` for evidence. Consultations, dental charts, and private scanned uploads remain later slices.
