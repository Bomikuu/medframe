# Pre-Django checkpoint

Saved at the user's explicit request on October 18, 2026, before amending the architecture.

- Source commit: `77bf229`.
- Git tag: `checkpoint/pre-django-2026-10-18`.
- Preserved source branch: `codex/clinical-foundation`.
- Amendment branch in the same checkout: `codex/django-clinical-batch-1`.
- Private backup directory: `/home/micxsz/.local/share/medframe/checkpoints/pre-django-2026-10-18-77bf229`.
- Backup artifacts: Git bundle, Fernet-encrypted PostgreSQL custom-format dump, private `.env` configuration copy, and a checksum/verification manifest.
- Permissions: backup directory 0700 and files 0600. No backup or secret is committed to Git.

The Git bundle was verified. The encrypted archive was decrypted in memory and its PostgreSQL restore catalog was validated with `pg_restore --list`; no plaintext database dump was written. A complete restore drill is not claimed. Keep `configuration.env` private: it contains the deployment encryption material needed to recover the archive and MFA data.

Baseline verification: 47 backend tests passed; all 5 browser journeys passed against the successful production build in 30.9 seconds; migration round-trip/no-drift, Prettier/Ruff, lint/type checks, deterministic schema generation, static UX audit, and the prior independent review passed. The preserved scope includes secure authentication and patient management, not encounters/dental/documents or Django.

The source database and account/MFA state remain intact. Django migration will use a separate target and reconcile data before any cutover. Do not restore over the source database or reset the working tree to recover files. Inspect the tag or create a separate recovery checkout; restore database archives into a disposable/new database first.

Readonly source verification:

```bash
git show --stat checkpoint/pre-django-2026-10-18
git bundle verify /home/micxsz/.local/share/medframe/checkpoints/pre-django-2026-10-18-77bf229/source.bundle
```

The current code remains on the preserved FastAPI runtime while the Django Batch 1 plan is reviewed. A Git commit does not itself migrate the running database or switch authentication frameworks.
