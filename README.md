# Medframe

The Foundation of Modern Care.

Medframe is a clinical workspace built with **Next.js, TypeScript, Tailwind, and Django 5.2 LTS**, backed by PostgreSQL, Strawberry GraphQL, Django authentication/sessions/permissions, and scoped operational Django Admin.

The integrated Django Batch 1 includes patient management, providers, walk-in consultations, SOAP, diagnoses/observations, immutable finalization and amendments, linked 2D/3D dental findings, procedures and basic treatment plans, private scanned documents, white default branding, personal preferences, dashboard layout, and notifications. Native implementation; no subagents. The local app now runs this batch; see [verification evidence](docs/operations/django-batch-1-verification.md).

The previous implementation and database are preserved: commit `77bf229`, tag `checkpoint/pre-django-2026-10-18`, and a private encrypted backup. See [checkpoint notes](docs/operations/pre-django-checkpoint.md), [Django amendment](docs/superpowers/specs/2026-10-18-medframe-django-amendment.md), and [Batch 1 plan](docs/superpowers/plans/2026-10-18-medframe-django-batch-1.md).

## Local development

Requires Node.js 22+, Python 3.12+, uv, and Docker Compose. Use synthetic data during development.

```bash
python3 scripts/setup-local.py
# Existing installations keep .env and run this only for missing storage credentials:
python3 scripts/setup-storage.py
docker compose --env-file .env -f infrastructure/compose.yaml up -d --wait --wait-timeout 600
uv sync --project services/api --locked
npm ci
uv run --project services/api python scripts/setup-django.py
uv run --project services/api python services/api/manage.py migrate --noinput
uv run --project services/api python services/api/manage.py collectstatic --noinput
uv run --project services/api python services/api/manage.py initialize_private_storage
```

`setup-local.py` refuses to overwrite an existing `.env`. Keep its encryption key: it protects existing MFA and recovery payloads. `DATABASE_URL` remains the preserved legacy import source; Django uses the separate `medframe_django` database, or an explicit `DJANGO_DATABASE_URL` / `DJANGO_DATABASE_NAME`.

Run the API, web, worker, and scheduler in separate terminals:

```bash
uv run --project services/api uvicorn config.asgi:application --app-dir services/api --host 127.0.0.1 --port 8000 --no-access-log
npm run dev
```

```bash
cd services/api
uv run celery -A config.celery worker --loglevel=warning --concurrency=2 --without-gossip --without-mingle
```

```bash
cd services/api
uv run celery -A config.celery beat --loglevel=warning --schedule=/tmp/medframe-celerybeat
```

Open [Medframe](http://localhost:3000/login). Use `localhost` to match the configured browser origin. Local [Mailpit](http://localhost:58025) receives recovery emails. RustFS provides private S3-compatible storage; ClamAV scans files. A missing worker or unavailable scanner leaves files quarantined and unavailable for download.

After native setup, the optional Compose `app` profile can run API/web/worker/scheduler containers. Stop native servers that use the same ports, then run `docker compose --env-file .env -f infrastructure/compose.yaml --profile app up --build -d --wait --wait-timeout 600`. Container builds are separate from the verified native workflow.

## Accounts and Django commands

Provision a clinic membership; passwords are prompted rather than passed as arguments:

```bash
uv run --project services/api python services/api/manage.py provision_staff \
  --email clinician@example.org \
  --display-name "Clinic clinician" \
  --organization "Your clinic" \
  --branch "Main branch" \
  --role dentist
```

Use `doctor`, `dentist`, `clinic_administrator`, or `receptionist` as appropriate. Reusing an email adds an explicitly requested membership/role without changing its password. Staff complete MFA at sign-in. Administrators manage demographics and explicit clinician grants; they do not automatically receive clinical-note access. Clinical registration grants the registering clinician patient access atomically.

Common Django commands:

```bash
uv run --project services/api python services/api/manage.py runserver 127.0.0.1:8000
uv run --project services/api python services/api/manage.py migrate
uv run --project services/api python services/api/manage.py makemigrations --check --dry-run
uv run --project services/api python services/api/manage.py createsuperuser
uv run --project services/api python services/api/manage.py check
```

`createsuperuser` creates an operational identity. Complete MFA through the app before visiting [Django Admin](http://localhost:8000/admin/). Operational staff flags do not grant clinic membership or patient access. Admin organization/branch views are scoped and read-only; clinical writes go through domain services.

## Importing the saved implementation

Rehearse against a new target database first. Never restore or migrate over the source database.

```bash
uv run --project services/api python services/api/manage.py import_legacy_medframe --dry-run
uv run --project services/api python services/api/manage.py import_legacy_medframe --apply
uv run --project services/api python services/api/manage.py import_legacy_medframe --verify
```

The importer preserves UUIDs, password behavior, encrypted MFA, recovery-code state, memberships, grants, patient/history versions, authors/times, replay keys, and audit events. Old sessions/reset links are not imported. A changed source or nonempty unrelated target is refused. Verify before allowing new target writes; after cutover, new legitimate edits can differ from the old source and must never be overwritten by re-importing.

## Clinical workflow

Choose a patient, review their history, and start a consultation without an appointment. Record SOAP, diagnosis certainty, observations, tooth/surface findings, procedures, and optional files. Drafts autosave with visible save/failure/conflict state; explicit Save remains available. Finish or clear selected uploads before completing a visit.

Mark the draft completed, review, and finalize. The original revision is preserved. Corrections require an amendment reason; historical links reopen the exact visit, chart, patient-history context, and attached file versions. Proposals remain separate from completed procedures, and plan completion requires matching finalized evidence.

The 3D model is a repository-owned **schematic development model**, with explicit identifiers for 52 teeth and 260 surface patches. It is not anatomically validated or patient-specific. The complete keyboard-operable 2D workflow remains available without WebGL. The approved clinical model and concept-11 Medframe logo are still pending.

Appearance settings support organization branding and personal light/dark/system mode, fonts, density, layout/presets, saved logos/avatars, and dashboard visibility/order/width. Default mode is light, regardless of the operating system. Profile images are circular; clinical files retain their full framing.

## Verification

```bash
uv run --project services/api python services/api/manage.py test tests_django --settings=config.settings.test --noinput
uv run --project services/api ruff check services/api scripts
uv run --project services/api ruff format --check services/api scripts
npm run codegen
npm run format:check
npm run lint
npm run typecheck
npm run build
npm exec --workspace apps/web playwright install chromium
npm run test:e2e
```

Django tests create/destroy only `medframe_django_test`; PostgreSQL, Redis, private storage, and ClamAV must be running. Browser tests create synthetic development accounts with random credentials and refuse production; traces/videos are disabled. Use `PLAYWRIGHT_BASE_URL` and `DJANGO_DATABASE_NAME` for an isolated rehearsal. Run `MEDFRAME_CAPTURE_REVIEW=1` only for a deliberate batched visual review.

Source lives in `apps/web/features`, Django apps in `services/api/medframe_apps`, configuration in `services/api/config`, and explicit authorized GraphQL contracts in `services/api/api_graphql`. Prettier/Tailwind formatting and Ruff keep code readable. See [DESIGN.md](DESIGN.md), [UX-CONTRACT.md](UX-CONTRACT.md), and [production readiness](docs/operations/production-readiness.md). Local development verification does not establish clinical validation or regulatory compliance.
