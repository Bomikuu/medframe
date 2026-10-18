# Clinical workspace deployment boundary

The foundation and patient-management slices are for local development with synthetic data. It is not the complete clinical milestone and must not receive real medical records yet.

## Implemented controls

- Argon2 password hashes; no shared account or committed credentials.
- Password-only challenges separated from clinical sessions; mandatory staff TOTP.
- Encrypted authenticator secrets, replay-resistant TOTP, hashed single-use recovery codes.
- Hashed opaque session tokens, rotation, absolute/inactivity expiry, logout and reset revocation.
- Origin and bound CSRF checks; HttpOnly cookies; production Secure/HTTPS validation.
- Shared Redis throttling that fails closed; successful authentication refunds its reserved attempt.
- Active organization membership, explicit role permission, branch scoping, database foreign keys.
- Append-only audit-event trigger and transactional write/audit behavior.
- Private/no-store API responses, generic errors, redacted validation responses, SQL parameter hiding.
- Query cost/depth/body limits, fragment-cycle protection, no HTTP batching, production introspection disabled.
- Encrypted password-reset outbox with bounded retries and a separate delivery worker.

## Required before production

Configure HTTPS and reverse-proxy security, authenticated TLS SMTP, per-environment secrets, key backup/rotation procedures, least-privileged database credentials, private network service access, storage encryption, encrypted backups and restore drills, audit retention/review permissions, monitoring/alerting, incident and staff recovery procedures, session administration, and deployment-specific rate-limit behavior.

The API deliberately ignores X-Forwarded-For. Behind the Next.js proxy, clients share the proxy-address throttle in addition to independent identity limits. Before multi-clinic deployment, configure a trusted edge/address mechanism and test it; never begin trusting arbitrary forwarding headers. This foundation does not claim production perimeter readiness.

The mail worker uses database row locks to prevent simultaneous claims. SMTP delivery can be repeated if a process crashes after sending but before committing; reset-token consumption remains single-use. Use an idempotent provider integration before production if exactly-once delivery is required. Rows stop retrying after five attempts and need operational monitoring.

Platform/clinic administrators have no universal medical-record bypass. Patient relationships, branch-scoped demographics, explicit clinical grants, and immutable patient-history revisions are implemented. Consent/sharing, immutable encounters/amendments, private scanned document storage, clinical asset validation, and patient identity verification must be implemented and tested in their corresponding slices before medical use.

## Patient-management boundary

Registration/search/demographics and clinician-authored history, allergies, and medications now persist. A clinic administrator or receptionist can manage permitted demographics; clinical reads still require a clinical permission and active patient grant. Grant changes serialize with history writes. Review states distinguish unreviewed from explicit none reported, and historical versions retain their author and server time.

These free-text histories are not encounter notes, structured diagnosis catalogs, medication reconciliation/interaction checking, or a complete clinical record. No private upload, patient account/guardian authorization, appointment, or finalization/amendment workflow is claimed by this slice. The new permission grants are additive migrations; existing staff identities, passwords, and MFA are preserved.

## Dependency evidence

`npm audit --omit=dev` reported zero runtime vulnerabilities during foundation verification. The full audit reports an upstream `braces <=3.0.3` stack-exhaustion advisory propagated through development-only code generation and lint tooling. The registry's current latest braces release has no patched update. Do not run those tools on untrusted patterns; recheck upstream before release. No forced major downgrade or incompatible override was applied.

## External assets

The approved concept-11 Medframe logo and a licensed, clinically reviewed dental GLB/GLTF are not supplied. The app uses the Medframe text name. Future development models must be labeled schematic and must not imply patient-specific anatomical accuracy.
