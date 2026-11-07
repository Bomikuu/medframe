# Registration SMSGate and Google — October 20, 2026

Native implementation extends the existing patient registration flow with dedicated Android SMSGate Local Server OTP and Google contact verification/account sign-up. Both remain unavailable until configured. Existing email registration remains available. No SMS, Google account operation or external message was performed. No original passwords, MFA, roles or clinical grants were changed.

## Scope and identity boundaries

- SMSGate is registration OTP only; it does not switch reminders or general live SMS. A dedicated flag, private-IP local URL and backend-only Basic credentials are required. Local HTTP is development-only. The adapter uses `/message`, bounded expiry and timeouts, and distinguishes accepted, retryable, uncertain and rejected requests. Uncertain acceptance is not automatically resent. Gateway acceptance is not handset delivery.
- Mobile contact proof requires a separate email for the later portal invitation. That supplied email is explicitly unverified; native invitation/account activation remains required.
- Google contact proof is purpose/nonce-bound and leads to patient details and clinic review, never directly to patient access. Google-managed verified email may replace the contact code; other email domains use email verification.
- Approved invitations can create a new Google-bound account with an unusable password, then require existing native MFA/portal activation. A new proved Google first factor persists for interrupted-enrollment resumption; no portal grant/session is created by that step. Existing accounts are not linked by email matching alone and retain their existing authentication requirements.
- Shared Google button preparation is reused by the registration and invitation surfaces. Existing staff/patient sign-in defaults are retained.

## Preservation and activation

Pre-change source is privately preserved in `.medframe-runtime/smsgate-google-source-20261020-191933.tar.gz` with the adjacent uncommitted patch. The root launcher's encrypted checkpoint is `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261020-192111-a89bd41`. Its isolated restore verified 157 original tables with `source_written=false`. Additive `portal.0005_patientapplication_portal_email_and_more` adds channel/phone/delivery metadata and a separate portal email; no credential or grant migration.

The original `medframe_django` remains active. `./medframe` owns API PID3303393, worker3303583, scheduler3303584 and Next dev3303585, using `.next-local-dev`. These are the activation snapshot, not permanent identities. The launcher briefly refused port3000 while its old socket closed, then started normally; no process-killing or launcher change was needed. Existing unrelated source changes, including the clinic-shell width snippet, were preserved.

## Bounded visual evidence

One native-browser batch at desktop default1265×712 and phone390×844 inspected a fresh isolated synthetic branch registration link. Email is selectable; Mobile and Sign up with Google are disabled with visible configuration explanations. The circle/line canvas, contact card and progress stages render at both sizes. Phone measured document width375 against viewport390 without horizontal overflow. The synthetic link was disabled afterwards; no patient/account/application or real messaging was created in this batch.

As requested, no build, automated test suite, lint or TypeScript check was run. Authored frontend files were Prettier-formatted; Python was Ruff-formatted. Migration/readiness and preservation operations are not application test coverage. Google credential verification/MFA completion, real SMS transport/receipt, configured-provider UI, worker failure/retry and concurrency/permission boundaries have source implementation but no live acceptance in this phase. See SMS-GOOGLE-001 in error-log.md. Setup instructions are in smsgate-google-setup.md.

## Actual Graphify and Jev use

Graphify first queried the existing graph with `GoogleIdentity prepare_google SmsProvider`, budget550. Root scope1150nodes yielded a truncated18-of97-node neighborhood, including unrelated matches; source inspection remained authoritative. The focused native AST refresh covers14 frontend files (148nodes/269edges) and20 backend files (230nodes/574edges), exported under `graphify-out/patient-registration-frontend` and `patient-registration-backend`. Routing data is manually inspected because symbol extraction does not establish URL/policy behavior. This is a focused corpus, not full-repository/security coverage.

Jev `choice` compared gated configuration/clinic-MFA preservation/no email-only merge/no uncertain resend against automatic enable/link/retry. Sanitized engineering state only; jev-1.13.0 chose `gated`, confidence1.0,405input/33output tokens. This is a prioritization judgment, not verification or authorization. No patient information, credentials, phone numbers or private attachments were sent.


## Google configuration follow-up

October20: user replaced the placeholder locally. A sanitized settings inspection confirms nonempty, non-placeholder value matching the expected OAuth Web Client ID format; the actual ID was not printed. Root launcher reloaded backend/API3349510, worker3349644 and scheduler3349645; existing dev web retained. One fresh native patient-login observation confirms the official Continue with Google button is visible. No Google account selection/sign-in/signup was attempted, so token acceptance, authorized-origin setup and account/MFA completion remain unverified. SMSGate remains pending configuration. This supersedes the missing/placeholder Client ID status, not the recorded acceptance gaps. No build or automated test run.
