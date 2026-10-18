# Clinical workspace deployment boundary

Batch 1 is a local clinical development milestone using synthetic test records. Local verification is recorded in [the batch evidence](django-batch-1-verification.md). Production deployment and real clinical use require the operational and clinical reviews below.

## Implemented controls

- Django owns UUID users, Argon2 passwords, database sessions, ORM persistence, permissions, migrations, and operational Admin. Legacy passwords upgrade after successful verification without a reset.
- Password challenges are separate from clinical sessions. Staff TOTP is mandatory; encrypted secrets, replay counters, and hashed single-use recovery codes survive import. Old sessions and reset links are not imported.
- Session rotation, eight-hour absolute and thirty-minute inactivity expiry, logout/reset revocation, native CSRF, origin checks, HttpOnly cookies, and production HTTPS/Secure validation.
- Shared Redis throttling fails closed. Query depth/cost, request bytes, clinical input, and list pagination are bounded. Production introspection is disabled.
- Active organization membership, role permission, branch scope, and patient grants are checked by services on every request. Superuser status does not bypass clinical policy.
- PostgreSQL tenant constraints, row locks, expected versions, append-only history/audit triggers, and atomic finalization preserve clinical revisions. Amendments retain originals and attribution.
- Private S3-compatible files pass signature/type/size checks and ClamAV scanning before download or finalization. Scanner outages retain quarantine. Short-lived download tickets are reauthorized against current patient access.
- Exact document versions are preserved with finalized encounters. Logos and avatars are decoded/reencoded raster images with purpose-specific limits.
- API/file responses use no-store. GraphQL errors are bounded and generic; access logs are disabled where signed transfer URLs could appear. Celery messages contain opaque version identifiers.
- An encrypted password-reset outbox uses bounded retries and a Celery schedule. Patient histories, diagnoses, observations, dental findings, and procedures remain attributed clinician-entered records.

## Required before production

Configure HTTPS/reverse-proxy security, authenticated TLS SMTP, per-environment secrets, key backup/rotation, least-privileged database credentials, private service networks, storage encryption, encrypted backups and full restore drills, audit retention/review, monitoring/alerting, incident response, staff recovery/session administration, and deployment-specific throttling. Validate the production container build and deployment topology separately; native local runtime verification is not deployment approval.

The API ignores X-Forwarded-For. Behind Next.js, clients share the proxy-address throttle as well as identity limits. Establish and test a trusted edge/address mechanism before multi-clinic deployment; never trust arbitrary forwarded headers.

SMTP may repeat after a crash between delivery and database commit. Token consumption remains single-use. Use provider idempotency if exactly-once delivery is required. Outbox items stop after five failures and require operational monitoring.

Clinical review must validate the FDI reference, tooth/surface mapping, documentation workflow, record retention, consent/sharing, and applicable local requirements. The repository-owned 3D geometry is explicitly schematic, not anatomically validated or patient-specific. No diagnostic, medication-interaction, consent, or patient-identity-verification capability is claimed.

## Scope and assets

The initial workspace includes registration, search, demographics, versioned history/allergies/medications, walk-in SOAP/diagnoses/observations, dental findings, procedures/plans, finalization/amendments, private documents, and scoped branding/preferences. Patient portals, scheduling, queues, billing, public websites, and diagnostic collaboration remain later batches.

The approved concept-11 Medframe logo and a licensed, clinically reviewed anatomical dental GLB/GLTF have not been supplied. The interface uses the Medframe text name and labels the development model clearly. Clinic-supplied logos and circular staff avatars use the private upload pipeline.

## Dependencies

Runtime npm audit reported zero vulnerabilities during batch verification. The full audit includes the upstream braces stack-exhaustion advisory propagated through development-only code-generation/lint dependencies. Do not apply forced incompatible dependency changes or run those tools on untrusted patterns; recheck current upstream advisories before release.

## Preservation and rollback

The old implementation is retained at `checkpoint/pre-django-2026-10-18` / `77bf229`; the source PostgreSQL database and encrypted private checkpoint remain preserved. The importer uses a read-only repeatable snapshot and reconciles into a separate Django target. After new writes to Django, rollback requires reconciling those writes; switching back to the old database would lose new care records.
