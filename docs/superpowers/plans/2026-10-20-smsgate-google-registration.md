# Native SMSGate / Google registration plan

Spec: docs/superpowers/specs/2026-10-20-smsgate-google-registration-design.md.
- Add local-only configured SMSGate OTP adapter and encrypted outbox dispatch without changing reminder transports.
- Extend contact proof with channel/mobile information and intake with a separate portal-email field, preserving older email requests.
- Add purpose/entry/invitation-bound Google contact and new-account activation paths, retaining existing-account password/bound-identity policy and native MFA.
- Reuse Google Identity Services button for sign-up text; add contact choices and honest setup/verification states to patient registration and invitation activation.
- Prettier/Ruff format; root-launcher checkpoint/additive migration and local dev activation. Visual-only bounded inspection; no live SMS/Google claim without supplied configuration. Document limitations and setup.
