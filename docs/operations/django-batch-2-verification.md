# Django clinical Batch 2 — local verification

Branch: `codex/django-clinical-batch-2`. Native implementation and self-review in this chat; no agents, external invitations, push, PR or deployment.

Status: production rehearsal verified; original Django database activation is pending.

## Connected features

- Staff and patient workspaces use separate native Django session realms. Password verification, five-minute MFA challenges, recovery codes, rotation, idle/absolute expiry and reset revocation retain their native owners. The same identity may have staff and verified patient relationships, with explicit sign-in for each realm. Patient sessions cannot call staff GraphQL, file or Admin endpoints.
- The owned schematic v2 GLB distinguishes crown silhouettes while preserving 52 FDI teeth and 260 named surface patches. The original v1 artifact remains. A generated static reference matches the Django vocabulary; the editor, historical comparison and portal share the keyboard 2D grid and 3D renderer. Exact historical snapshots, current finalized comparison and proposed/completed tooth procedure evidence remain distinct. Absence is never interpreted as healing.
- Consultation, document and clinical timeline lists have literal text, clinic-local inclusive date, status/type, author and applicable tooth filters, with signed scope/filter-bound keyset cursors. Administrative demographic history retains its restricted path.
- Ordered plans support adding/editing proposals, keyboard move controls, expected versions, replay receipts and immutable version history. Cancelled items leave the completion denominator; completed evidence cannot be rewritten. Existing plans receive an explicitly labeled current migration snapshot, without invented earlier history. Manual follow-ups have dates, status, attribution and immutable revisions, and appear on the scoped dashboard.
- Clinic templates have immutable prompt versions, archive state and attributed applications. Applying guidance saves dirty input first, coordinates with autosave and never populates clinical facts. Exact guidance provenance survives finalization; optional observation labels create empty clinician-authored entries.
- Staff verify identity or guardian authority before issuing a 24-hour, single-use invitation. Native password/MFA activation atomically consumes it and creates the exact relationship. Email, birth date and demographic guardian fields never link accounts. An existing account keeps its password, MFA and memberships. Reissuing a self invitation also revokes the earlier token when its email is corrected; independent guardians remain distinct. Invitations/revocations are attributed; private tokens are hashed or encrypted and transported in a cleared URL fragment. Recovery and invitation mail share the bounded encrypted outbox.
- Clinicians preview and explicitly publish selected immutable clinical versions through a separate portal schema. The patient and verified guardians see only released SOAP sections, diagnosis certainty, procedures, chart, plan/follow-up snapshots and exact clean file versions. Source changes conflict with an old preview. Amendments do not rewrite existing releases. Withdrawal and relationship revocation immediately deny new reads and ticket consumption; downloaded copies cannot be recalled.
- Patient reports remain immutable, separately labeled submissions with append-only clinician review receipts. Reconciliation may reference an existing same-patient clinical-history revision; it never edits confirmed history automatically. Patient mode/density updates preserve unrelated staff preferences and widgets.
- Private raster/PDF previews obtain fresh 60-second authorization. Matching pinned PDF.js 6.4.299 API/worker/fonts/CMaps are prepared locally from the dependency. Rendering uses bytes, bounded single-page canvases, extracted text, no viewer scripting/forms/annotation links, no external viewer service, and cancellation/destruction/Blob cleanup. Password-protected, malformed or unsupported previews retain the original download path. Clinical imagery keeps its framing; avatars remain circular.
- Actual existing shadcn/Radix controls, React Hook Form, Zod and Tailwind remain canonical. The shadcn configuration names Lucide. The white default, explicit dark/system choices, narrow layouts and safety/draft guards extend to the portal. Theme tokens change together to prevent intermediate color-transition contrast loss.

## Preservation and rehearsal

The Batch 1 baseline remains at `da3d519`, branch `codex/django-clinical-batch-1`, and tag `checkpoint/django-batch-1-2026-10-18`. The original FastAPI baseline remains at `77bf229` / `checkpoint/pre-django-2026-10-18`; its source database has not been reset or re-imported.

`scripts/checkpoint-django.py` created `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261018-221844-2518f52`. A consistent PostgreSQL snapshot was encrypted in memory, the Git bundle was verified, and private configuration/count/hash manifests were saved with directory 0700/files 0600. No plaintext dump or secret entered Git. The dump restored into `medframe_django_batch2`; all 47 original table counts reconciled. The original database remained intact.

Rehearsal uses ports 3001/8001, database `medframe_django_batch2` and Celery Redis broker DB 3. The active database remains `medframe_django`, with broker DB 2. Private storage keys are opaque and never reused or deleted by checkpointing. Browser tests use separate synthetic contexts. Localhost cookies are not isolated by port: do not use an active personal staff browser session to authenticate against the rehearsal clone.

The original `.next` build is retained in ignored `apps/web/.next-batch1-checkpoint`. A default `.next` production build was served on 3001 against the rehearsal API. The first full run found two concrete issues: an ambiguous filter-tooth label and intermediate theme-transition contrast. Both were repaired before the next production rehearsal. No custom-dist artifact was renamed into the active build. A final native UI review replaced an unusable reconciliation-ID entry with a labeled, paged history-version picker; the rebuilt artifact passed all nine journeys. The existing-account guardian test uses an unused native recovery code, avoiding accidental TOTP replay within the same 30-second window.

## Additive migrations

| Owner      | Added migrations                                                                       |
| ---------- | -------------------------------------------------------------------------------------- |
| accounts   | `0003_clinicalsession_realm_passwordreset_realm`, `0004_mailoutbox_kind`               |
| auditing   | `0003_requestreceipt`                                                                  |
| encounters | `0003_consultationtemplate_templaterevision_and_more`, `0004_template_integrity`       |
| treatments | `0002_followup_followuprevision_treatmentplanrevision_and_more`, `0003_work_integrity` |
| portal     | `0001_initial`, `0002_integrity`, `0003_identity_guards`                               |

Composite scope constraints and immutable triggers protect clinical versions, relationships, releases, file joins, reports and review receipts. The permission migration grants `portal.manage` only to eligible default roles retaining its prerequisite permissions. Invitation verification/identity and relationship identity cannot be rewritten; revoked relationships require another verified invitation.

Account realm migration down/up was rehearsed in the disposable clone, preserving identities, password/MFA data and session counts. The existing document-author migration round-trip still runs in the disposable test database. Reversing portal integrity with portal records present is intentionally blocked for reconciliation; no downgrade of active clinical or relationship data was performed.

## Verification evidence

- Latest complete backend run: **88 Django tests passed** on real PostgreSQL, including real private S3/ClamAV transfers, baseline clinical/auth boundaries, template/save and duplicate publication races, duplicate native invitation/MFA claims, immutable reports, portal preference isolation, source-preview conflicts, keyset ties/DST dates and scope revocation.
- Production browser suite: **9 journeys passed** against the final production artifact. It includes all eight Batch 1 journeys plus the connected Batch 2 self/guardian, templates/plans/follow-ups, private PDF, report/review, dark/mobile and withdrawal/revocation journey.
- TypeScript, ESLint, Prettier, Ruff, migration no-drift and strict frontend audit passed. Repeat export/codegen reproduced all six independent schema/client files; the final reconciliation query is checked again before completion.
- Six staff/portal schema and generated-client files reproduced byte-for-byte on repeat export/codegen.
- Runtime npm audit: **zero vulnerabilities**. Python audit scanned 64 installed distributions and found **zero known vulnerabilities**; the local `medframe-api` project is not a published PyPI dependency and is excluded from advisory matching.
- Synthetic screenshot review: `.impeccable/review/batch2` and baseline review directories; artifacts remain ignored. No credentials, invitation fragments or real patient content are intentionally captured.

## Local activation and rollback boundaries

Activation is pending. Apply additive migrations to the original Django database after rehearsal passes; do not restore the rehearsal database over it. Pause its web/API/worker/beat, take a fresh encrypted checkpoint, reconcile identity/MFA/membership and immutable clinical fingerprints, migrate, initialize/check private storage, then restart native ports 3000/8000 and original broker DB 2. Rehearsal broker DB 3 never processes original jobs.

Retain the old code, encrypted checkpoints and saved web artifact. Rollback after new writes requires reconciliation. A Batch 1 backend does not enforce the patient session realm: patient sessions must be revoked before any explicitly approved compatibility rollback. Do not silently drop new versions, releases, reports or relationships, and do not reset or guess an existing administrator password for verification.

## Boundaries

This is local synthetic-data verification, not production clinical validation or regulatory approval. The approved concept-11 logo and a licensed, clinically reviewed dental anatomical asset are still unavailable; the product name and clearly labeled schematic remain. Real production mail, HTTPS/storage operations, independent clinical/access review, operational recovery/monitoring, broader device/browser testing and load verification remain outside this local milestone. Scheduling, queues, billing and other later roadmap batches are not implemented here.
