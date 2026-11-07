# Contact input formatting — October 20, 2026

Native UI refinement adds a shared PhoneInput with separate editable calling-code and national-number controls. Philippines defaults to +63; SMSGate verification remains Philippine-mobile-only. Digits are filtered on entry/paste, domestic leading0 is removed for PH, and PH/North American national numbers receive3/3/4 spacing. Pasting a full international number is supported. Forms still receive a compact international string such as +639171234567, not display spaces. Optional blank phones remain blank. Common calling codes are recognized on paste; unfamiliar saved international numbers are preserved and require explicit calling-code entry rather than an invented country. No phone lookup or external service is used.

Shared control is connected to patient registration verification/details, clinic onboarding, patient/emergency/guardian contacts, Station walk-in details, customer kiosk intake, communication-recipient preferences and website contact editing. Existing React Hook Form/controller or controlled-state owners remain. Phone validation runs in the relevant existing form schema/native form path. Communication consent, clinic review, MFA and permission boundaries are unchanged. This is input validation, not proof of ownership/reachability.

Shared email Input removes whitespace and lowercases typed/pasted email, with email keyboard, no capitalization and no spellcheck. Existing form/backend email validation remains. PH clinic postal code filters to four digits and validates length; other countries retain their existing postal formats. Existing date, verification-code and financial input owners remain separate. No backend/schema/migration/data/credential change.

## Preservation and activation

Pre-change authored sources and full uncommitted patch are privately preserved under `.medframe-runtime/contact-inputs-before-20261020-201236`. Unrelated source work, including the existing clinic-shell width snippet (1insertion/2deletions), remains intact. Native `.next-local-dev` receives the changes; the root launcher restarts only the frontend for activation. Original Django database/API/worker/scheduler remain unchanged. No build or automated tests were run; authored files were Prettier-formatted.

## Bounded visual pass and limits

One temporary, synthetic, local-only preview imported the actual RegistrationDetails and onboarding Field components. Desktop1265×712 inspection established letters filtered from `0917abc1234567` and display `+63` / `917 123 4567`, uppercase/spaced email normalized, full +63 phone paste formatted, and `80a00` postal paste displayed8000. Phone390×844 inspection shows separate prefix/number, stacked registration fields and no horizontal overflow (document375/viewport390). No registration submit, SMS, Google action or patient write occurred. Preview route removed afterwards and viewport reset.

Initial preview SSR contained the prior onboarding phone input while client rendering used the new control, producing a hydration warning and client recovery. Logged as CONTACT-INPUT-001; no source repair/repeated acceptance loop was attempted. The subsequent frontend activation restart is normal runtime activation, not evidence of warning resolution. Native staff/kiosk/website save/consent, edit-caret/undo/autofill and uncommon calling-code flows were not exercised. Do not infer broad form or persistence acceptance from the focused preview. Existing legacy noncanonical phone strings are not migrated; editing may require correcting an incomplete number before saving.

## Actual Graphify and Jev

Graphify first queried `PatientForm ClinicStep RegistrationDetails phone` with budget550 against the existing1150-node root graph. It returned16of219 nodes (truncated), including PatientForm/form-schema and shared form relationships. Source inspection established current behavior. A focused AST refresh covers15 authored frontend files,195nodes/374edges, at `graphify-out/contact-inputs`; this is not full-repository or dynamic authorization coverage.

Jev `choice` used only generic engineering state describing controlled/RHF forms, digit-only national input, separate PH prefix and unchanged backend contracts. It selected `shared` over ad-hoc/global numeric coercion, confidence1.0, jev-1.13.0,395input/33output tokens. This prioritization is not test evidence. No patient data, credentials, phone values or private attachments were sent. Native/no-subagent execution and visual-only verification continue.


Activation snapshot: root launcher restarted frontend PID3414807 on port3000 using `.next-local-dev`; native API/worker/scheduler retained. Initial restart refused while the closed server socket remained occupied (no listening process); subsequent start succeeded without killing an unmanaged process. No build was performed.
