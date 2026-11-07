# Clinic Sign-in Policy Implementation Plan

Execution: native in this chat, per the user's standing instruction and explicit proceed.
No subagents, builds, automated tests or typecheck; format and one bounded visual pass only.

Goal: authorized clinic settings for Strict, Password only and Remember for 30 days.
Architecture: additive policy/trusted-browser persistence, honest authentication-assurance metadata,
shared policy validation in native session/realm/socket/Station-source gates, existing sign-in owners.
Stack: Django/PostgreSQL sessions, Next.js/Tailwind/shadcn.
Spec: docs/superpowers/specs/2026-10-21-clinic-sign-in-policy-design.md (user approved).

## Global constraints

Existing clinics default Strict; no actual clinic policy/credential/grant changes during review.
Strongest eligible clinic policy wins; platform/Django privileged users retain Strict.
Password-only skips routine staff MFA only; initial activation/patient proof/Google linking unchanged.
Remembered-browser proof is opt-in, server revocable, HttpOnly, fixed30-day deadline, separate from
Stay logged in, and unavailable in shared-device context. No public deployment or live messages.

## Review focus

- Multi-clinic/privilege changes cannot leave reduced-factor sessions usable.
- Trusted token rotation, revocation and fixed expiry never renew from password-only login.
- Real MFA remains distinguishable from policy-satisfied authentication and legacy Station sessions.
- Source-session invalidation reaches Station and websocket authority without source browser traffic.
- Settings conflict/reauth errors preserve selection; changing policy does not silently grant access.

## Task1: native policy and session authority

- [x] Preserve selected sources; add OrganizationSignInPolicy and TrustedBrowser models/migrations.
- [x] Add policy resolver/fingerprint, trusted-browser token/cookie lifecycle and shared session helper.
- [x] Refactor native completion and login outcomes, retaining initial activation/Google-linking rules.
- [x] Wire policy-aware HTTP/realm/navigation/socket/call gates and delegated Station source checks.
- [x] Inspect reduced session expiry, epoch/membership changes and denied paths; log unverified cases.

## Task2: authorized settings and sign-in UI

- [x] Add organization.manage security read/update endpoint with password reauth, expected revision,
      transactional policy change/audit/revocation and Station denial. Add forget-browser endpoint.
- [x] Add Settings Security page using three shared accessible mode cards and confirmation dialog.
- [x] Adapt existing AuthFlow/MFA owner for authenticated nextStep, opt-in trust and optional forgot
      browser state; preserve patient/invitation paths and shared-device behavior.
- [x] Format changed sources with Prettier/Ruff format only; review native interface consistency.

## Task3: activate and document

- [x] Refresh relevant AST corpus and use sanitized Jev judgment; record exact coverage and limits.
- [x] Launcher stop/checkpoint/isolated restore/additive migrate/start against original database.
- [x] One visual desktop/phone pass; no real clinic policy, credentials, grants or clinical mutations.
- [x] Remove temporary preview routes; log acceptance gaps and update phase/design/working evidence.

Completed locally. Checkboxes describe implementation/activation and bounded presentation review,
not passing automated/security tests. See docs/operations/clinic-sign-in-policy-verification.md.
