# Patient-first registration implementation plan

Goal: patient-owned email verification and demographic intake with provider acceptance and automatic native invitation.
Spec: docs/superpowers/specs/2026-10-20-patient-self-registration-design.md.
Execution: native in this chat, no agents. User chose email-first. No build/automated tests; bounded visual review only.

- Add isolated portal registration-link, contact-proof and application records plus additive migration. Keep organization derived from branch/link; preserve all existing identities.
- Add throttled public link/bootstrap/send/verify/submit/status endpoints, keyed OTP hashes and encrypted mail outbox. No record lookup or patient access before staff acceptance.
- Add staff-scoped link management/request review, duplicate checks and atomic native register/invitation delegation; preserve existing patient authorization and MFA.
- Add readable public verification/details/review UI and Patients registration-review modal with link copy and explicit create/link decisions.
- Prettier/Ruff formatting only. Fresh launcher-managed migration checkpoint/restore and additive migration; activate original Django services with dev frontend. Inspect synthetic UI in a bounded visual pass; log unresolved findings without broad retesting.
- Refresh focused Graphify relationships, record sanitized Jev judgments and actual verification limits. No public deployment/live messaging/SMS/AI.
