# Native local launcher — October 20, 2026

## Delivered

Root executable `./medframe` uses Python's standard library to orchestrate the existing uv/npm/Docker commands. Linux and Python 3.12+, Node 22.13+, uv and Docker Compose are prerequisites. It resolves the project root from its own location, including when called from another working directory.

- `setup`: preserve existing environment/secrets; create local configuration only if absent, append missing storage credentials using existing helpers, install locked uv/npm dependencies, start infrastructure, create the separate Django database only if absent, apply pending migrations, collect static files and initialize private storage. No account/fixture import.
- `start` (also the no-argument command): start infrastructure, check migrations and launch API, worker, scheduler and frontend in independent background process groups. Default frontend artifact `.next-local-dev`; `--production` serves `.next-local-production`, or an explicit `--dist-dir`. A plain repeated start retains the existing frontend mode/artifact. `--only frontend` and `--only backend` select connected service groups.
- `build`: prepare a separate production frontend artifact; refuse rebuilding the launcher-owned active artifact.
- `migrate`: require stopped application processes and free application ports. When pending migrations exist, use the established encrypted checkpoint helper and verify a new isolated database restore before applying. Keep checkpoint clones for recovery; no destructive cleanup or migration generation.
- `stop`: terminate only owned process groups with matching Linux PID/start-time identity, leaving Docker infrastructure and volumes running. It does not kill an unmanaged service occupying a port. A shutdown timeout reports the remaining process without forced termination.
- `status`, `logs [api|web|worker|scheduler]`, and `--help` expose local operation. Logs, PID metadata, locking and scheduler state are private under ignored `.medframe-runtime/`; detached services survive the initiating terminal command. There is no watchdog/reboot auto-start or log rotation.

Django continues to read the private environment through its native runtime loader; the launcher never evaluates it as shell code. Local bind addresses, local mail capture and disabled live SMS are explicit. Settings/database overrides already supplied through environment variables remain supported. This is local operation, not public deployment.

## Bounded verification and activation

Ruff formatting/check and Python compile pass. Help and status run. Current-database migration command reports all migrations already applied; no migration writes or checkpoint clones were needed for that no-op. Live-app migration refusal and invalid build-directory rejection pass. Actual production startup passes, repeating start leaves all four process IDs intact, and stopping/restarting only frontend preserves the API/worker/scheduler IDs. A focused final plain-start confirmation verifies retention of the current production mode. Login and native Django readiness both return HTTP 200. No frontend rebuild, backend suite or new browser sweep was necessary for this operational wrapper.

Fresh-install dependency installation, setup against a new database, actual pending-migration backup/apply, interrupted startup rollback, forced shutdown timeout, recycled-PID rejection, development compilation and unmanaged-port collision have source guards but were not independently exercised end to end here. Existing setup/checkpoint helpers retain their earlier evidence; this phase does not claim new acceptance of those paths. See LOCAL-LAUNCHER-001 for initial diagnostics and bounded activation cleanup.

The previously interrupted Devices gallery activation now runs `.next-devices-gallery` against original `medframe_django` through this launcher. The earlier fresh encrypted checkpoint and isolated restore are retained. Before application traffic resumed, all 6,030 original rows across 139 tables matched preservation fingerprints; 51 objects were already verified separately. No schema, credentials, MFA, clinical authorization or original storage changes. See [gallery evidence](devices-gallery-verification.md).

## Graphify and Jev

Queried existing frontend Devices gallery and backend session-recovery graphs, then inspected actual runtime, Compose, setup helpers, README and installed Next.js deployment guide. The frontend graph is outside the launcher scope and its broad query was truncated; the backend Settings query reaches 247 nodes, showing eleven under a 350-token budget. These queries support source location only.

Refreshed a dedicated local AST graph of eight files: root launcher, three setup helpers, checkpoint helper, runtime settings, Celery entry point and Django base settings. It contains 66 nodes, 140 directed edges and ten communities at the first extraction. Follow-up start/migrate/process query reaches 37 nodes and displays twenty under the 350-token budget. Celery's assignment-only module yields no symbols; shell subprocess targets, Compose YAML, npm JSON and private/runtime data are not modeled as runtime call edges. No semantic extraction, external extraction tokens or secrets/attachments were involved. The final source refresh is recorded below.

Jev `jev-1.13.0` received sanitized architecture choices only. It selected explicit setup/migrate separate from repeatable start over automatically reinstalling/migrating on every startup, confidence 1.0, 373 input/31 output tokens. This informed the operational contract; it did not verify behavior or grant authorization.

Final AST source refresh: 8 files, 66 nodes, 140 directed edges, 10 communities; zero external extraction tokens.
