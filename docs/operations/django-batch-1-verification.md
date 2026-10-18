# Django clinical Batch 1 — local verification

Date: October 18, 2026. Branch: `codex/django-clinical-batch-1`.

The connected Batch 1 runs locally at `http://localhost:3000/login`, with Django on port 8000, a production Next.js build, Celery worker/scheduler, PostgreSQL, Redis, private RustFS storage, and ClamAV. Implementation and review were native in this chat, without subagents. This is local development verification with synthetic browser records, not approval for production clinical use.

## Delivered workflow

- Django ORM/authentication/database sessions/permissions/migrations/operational Admin replace the active FastAPI/SQLAlchemy/Alembic runtime. Old accounts retain UUIDs, working password behavior, encrypted MFA and recovery-code state; old sessions/reset links are excluded. Membership, branch, role and patient grants remain authoritative.
- Registration, bounded search, demographics, attributed/versioned history, allergies and medications retain existing behavior. Provider profiles support doctor/dentist consultations without an appointment.
- SOAP, diagnosis certainty, reported/observed entries, dental findings and procedures share an encounter/version. Debounced serialized autosave and explicit save preserve input on failures/conflicts. Completed drafts require review; finalization preserves immutable notes, diagnoses, observations, chart, procedures, patient-history context and exact file versions atomically. Amendments preserve the original and record reason/author/time.
- Keyboard-operated 2D and React Three Fiber/Three.js views share explicit FDI tooth/surface identifiers. The repository-owned GLB has 52 teeth and 260 named surface patches, primary/permanent modes, jaw visibility, isolation, camera presets/reset, and orbit/zoom/pan. Hidden teeth do not intercept visible-tooth clicks. The complete 2D workflow remains usable without WebGL.
- Ordered basic treatment plans distinguish proposals from completion backed by matching finalized procedure evidence. Patient history links reopen exact preserved visit revisions.
- Protected raster/PDF uploads use real private storage, signature/type/size validation, quarantine, ClamAV/Celery scanning, retry, exact versions and freshly authorized short-lived downloads. Branding/profile images use separate policies, normalized raster bytes, and circular avatars; clinical images retain framing.
- Predominantly white light defaults, explicit dark/system preference, validated clinic branding, safe fonts, radius/density/component/layout presets, logos/avatars, per-user dashboard visibility/order/width and actual notifications persist. Preview/cancel/reset and tenant isolation are implemented. Forms remain readable, grouped and Tailwind based, with Prettier/Ruff formatting.

## Preservation, restore and cutover

The old code remains at `77bf229` / `checkpoint/pre-django-2026-10-18` and branch `codex/clinical-foundation`. The private encrypted archive, Git bundle, configuration copy and manifest remain under `/home/micxsz/.local/share/medframe/checkpoints/pre-django-2026-10-18-77bf229`, with directory 0700/files 0600. No secret or backup is committed.

The archive was decrypted only in memory and fully restored into disposable `medframe_legacy_restore_20261018`, then imported/reconciled into disposable `medframe_django_restore_20261018`. No plaintext dump was written. A separate live-source rehearsal also passed. The source fingerprint matched rehearsal before cutover and remained `2cf42cb30d05d2d4fcc9ee569acbb95527371c924b11018ed87711a4a97acaac` afterward.

The old API, mail worker and web server were paused, and the empty separate `medframe_django` target was imported with `import_legacy_medframe --apply` and checked with `--verify`. Both reported `source_written: false` and the following preserved counts:

| Imported category                           |      Count |
| ------------------------------------------- | ---------: |
| Users                                       |        104 |
| Organizations / branches                    |    36 / 38 |
| Memberships / membership roles              |  131 / 131 |
| Roles / permissions / role-permission links | 7 / 9 / 28 |
| MFA credentials / recovery-code rows        |   38 / 370 |
| Patients / access grants                    |    34 / 34 |
| Clinical history revisions                  |         20 |
| Patient events / registration replay keys   |    70 / 34 |
| Audit events                                |        747 |

The preserved `admin@medframe.example.com` is active, retains its password digest and clinic-administrator membership, and has no automatic clinical bypass. Fresh sign-in is required. Passwords/MFA were not reset. Synthetic verification adds separate scoped records after reconciliation; do not re-import over new legitimate Django writes. After cutover, rollback requires reconciling new target writes rather than switching back and discarding them.

## Database migrations

Application migrations applied on real PostgreSQL:

| App                       | Migration IDs                                                          |
| ------------------------- | ---------------------------------------------------------------------- |
| accounts                  | `0001_initial`, `0002_user_legacy_password_digest_alter_user_password` |
| organizations / providers | each `0001_initial`                                                    |
| patients                  | `0001_initial`, `0002_integrity`                                       |
| auditing / dental         | each `0001_initial`, `0002_initial`                                    |
| branding / treatments     | each `0001_initial`                                                    |
| encounters                | `0001_initial`, `0002_integrity`                                       |
| documents                 | `0001_initial`, `0002_integrity`, `0003_version_author`                |

Django's built-in auth, contenttypes, sessions and Admin migrations are also applied. Composite tenant constraints, unique aggregate versions and append-only guards are migration-owned. A disposable PostgreSQL migration test reverses/reapplies document integrity/author migrations while preserving original bytes metadata and backfilling authors. That pre-cutover boundary does not authorize dropping later version-specific author data from a live database.

## Verification results

| Command or check                                                                                                          | Observed result                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `uv run --project services/api python services/api/manage.py test tests_django --settings=config.settings.test --noinput` | 53 passed after obsolete dependencies were removed, 11.571s; real PostgreSQL, private S3 and ClamAV |
| `npm run build`                                                                                                           | Final default `.next` production build passed after the accessibility correction                    |
| `MEDFRAME_CAPTURE_REVIEW=1 npm run test:e2e`                                                                              | All 8 passed against final Django/production Next.js on ports 8000/3000, 1.5m                       |
| `npm run lint`, `npm run typecheck`                                                                                       | Passed                                                                                              |
| Ruff check/format                                                                                                         | Passed; 134 Python files formatted                                                                  |
| Prettier check                                                                                                            | Passed on maintained supported files                                                                |
| `makemigrations --check --dry-run`                                                                                        | No changes detected                                                                                 |
| Repeated `npm run codegen`                                                                                                | Schema and both generated TypeScript files byte-identical                                           |
| Premium UI project auditor, `--mode strict --no-write`                                                                    | Zero errors, violations, warnings or unresolved findings                                            |
| `npm audit --omit=dev`                                                                                                    | Zero runtime vulnerabilities                                                                        |
| `/health/ready`                                                                                                           | HTTP 200, backend Django; database and Redis reachable                                              |

Backend coverage includes tenant/patient/provider authorization, native CSRF/origin/session behavior, legacy credentials/import reconciliation, TOTP/recovery single-use concurrency, stale save/finalize races, immutable/amended history, FDI metadata, treatment evidence, document versions/private downloads/revocation, actual scanning, fail-closed scanner outage, bounded streamed input, theme ownership/validation and outbox retries.

The browser suite covers the complete doctor flow, 3D tooth 46/occlusal picking synchronized with 2D, saved tooth findings, scanned uploads/downloads, original revision reopening, amendment and treatment evidence; branding preview/cancel/save/reset, logo/avatar persistence, two-clinic isolation, dark preference and actual dashboard order after refresh; failed SOAP autosave/offline refocus/conflict recovery/keyboard 2D with WebGL disabled; and all five original authentication/patient journeys. Axe reports no violations on the exercised clinical fallback and narrow appearance pages. A subsequent targeted branding run also passed (15.3s), adding assertions that saved logo/avatar images finish decoding successfully from private storage.

## Native visual and safety review

Impeccable finishing review was performed inline as a native self-review because the user prohibited agents. Disposition: **ship for the local development milestone**. Reviewed desktop 1280×720, mobile 390×844, explicit dark mode and the actual 3D canvas in `.impeccable/review/` (local captures, excluded from Git). The shared field grid now keeps sibling labels/inputs aligned when only one field has helper text. Consultation history has a level-two heading before its allergy/medication subheadings. No approved anatomical model or concept-11 logo was invented; the text identity and schematic disclosure remain.

Authorization, fresh document download checks, append-only constraints, import watermark/reconciliation, private logs, scanner failures/retries, activation-scoped draft recovery, theme scope and reset semantics were reviewed natively. Signed transfer URLs and medical input are excluded from normal access/error logging. The scanner and PostgreSQL/Redis/Mailpit container checks are healthy; RustFS bucket policy/direct-object denial and actual transfers were verified independently.

## Remaining boundaries and next batch

A clinically validated anatomical model/reference review and the approved product logo remain outstanding. The development GLB is explicitly schematic and not patient-specific. Production security/networking, SMTP, encrypted storage/backups/restore operations, monitoring, load/capacity checks, consent/sharing, retention and clinical review remain required; see [production boundaries](production-readiness.md). Optional application-container builds were updated but were not run; native operation is the verified path. ASGI adapts synchronous `FileResponse` streams, bounded by the 20MiB file policy; deployment capacity needs load verification. Development-only dependency advisories and upstream Three.js deprecation warnings remain separate from the clean runtime npm audit.

Batch 2 priorities are reviewed anatomical geometry, richer historical chart comparison/document filtering, clinical templates and workflow refinement, and a patient portal only after verified patient-account linking is designed. Scheduling, queues, billing and public clinic websites remain later work.
