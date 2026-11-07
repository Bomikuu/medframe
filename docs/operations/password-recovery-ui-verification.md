# Password recovery presentation — October 20, 2026

Native staff and patient forgot-password pages share a focused RecoveryRequestForm. Initial email entry, generic account-safe acknowledgement, entered-email display/change, 60-second client resend cooldown, duplicate-submit lock, explicit server-throttle errors and busy/error states are implemented. Instructions identify the native reset-mail subject, 15-minute expiry and replacement of earlier links. Existing backend recovery endpoint, active-account matching, three-per-email/hour throttle, reset-token lifecycle and native MFA remain unchanged.

Sanitized settings inspection confirmed recovery_enabled=true and local Mailpit SMTP. No credentials were printed. Local staff/patient pages now link the development inbox at http://localhost:58025, explaining that emails are captured there instead of delivered to real inboxes. This helper requires development mode, local SMTP host/port and localhost WEB_ORIGIN; production render does not expose this shortcut. No external SMTP configuration or message delivery was enabled.

Source before editing is privately preserved in `.medframe-runtime/password-recovery-before-20261020-210856`. Prior changes, accounts/passwords/MFA/data and clinic-shell snippet remain intact. Authored files were Prettier-formatted. No build, TypeScript/lint or automated test suite was run. Root launcher frontend activation uses `.next-local-dev`; backend/database unchanged.

## Bounded native visual evidence

One desktop staff / phone patient browser batch inspected the real /auth/recover and /portal/recover routes. Local inbox help/link is visible in both. Staff request using a nonexistent synthetic example.com address returned the generic confirmation, focused its heading, showed the entered email and disabled Resend in60s control. Phone390×844 shows readable one-column email/help/actions with document width375, no horizontal overflow; viewport reset after inspection. No real account lookup result was exposed, real account reset token changed, password submitted, Mailpit contents read or external email sent.

Actual mailbox delivery, password completion, backend expiry/throttle boundaries and production rendering were not exercised in this visual-only phase. These remain acceptance limits, not claims of a full recovery end-to-end test.

## Actual Graphify and Jev

Existing root graph query `RecoveryForm password reset resend`, budget500, used1150nodes and returned16of105 related nodes (truncated); current source was inspected for authoritative endpoint/token/mail behavior. Focused AST refresh covers10 frontend/backend files,108nodes/213edges, under `graphify-out/password-recovery`. Backend files are inspection-only. No full-repository/dynamic security coverage is claimed.

Jev choice used only generic engineering state about existing generic recovery acknowledgement, three-per-hour throttling and local email capture. It selected `bounded` (cooldown, generic status, editable email/local-only help) over existence revelation/unlimited resend, confidence1.0, jev-1.13.0,411input/32output tokens. No emails, tokens, credentials or patient data were submitted. This is prioritization, not verification. Native/no-subagent and visual-only execution continue.


Continuation of the same visual batch: after the60-second cooldown, Resend reset link was enabled; clicking it returned the generic acknowledgement and reset the cooldown to60s. Change email returned to the form with focus on its email field; the unchanged address retained its cooldown, while a corrected synthetic address enabled Send reset link. No third request was submitted. Existing Next dev PID3429769 serves these changes via native development recompilation/HMR in .next-local-dev; both actual public routes rendered the new component, so no redundant restart/build was needed. Backend unchanged.


## Explicit missing-account amendment

The user subsequently requested notification when the email does not exist. This supersedes the generic matching-account acknowledgement design above. Shared request_password_reset now raises ACCOUNT_NOT_FOUND/404 when no active User matches the normalized email; staff and patient endpoints retain their existing three-per-email/hour throttle. Matching rules, native tokens, credential/MFA behavior, delivery and permissions are unchanged. UI returns to editable email entry and shows the backend error inline; successful request copy says a link was requested, without claiming delivery. Missing/inactive accounts share the same wording.

Four pre-change sources are privately preserved in .medframe-runtime/recovery-account-message-before-20261020-211612. Prettier and Ruff format only, no build/automated tests. Root launcher reloaded API3517081/worker3517293/scheduler3517294, existing Next dev retained; readiness succeeded. One native browser batch submitted distinct nonexistent synthetic example.com addresses to actual staff and patient recovery forms. Both show “No active Medframe account uses this email. Check the address or contact your clinic.” beneath the input, keep email editable and stay on request entry. No real account reset/token/email/password was changed. Focus return to the input was not observed in the final AX state; keyboard/screen-reader focus acceptance remains open without a repair loop. Matching-account delivery/reset completion was not retested.

Follow-up Graphify root query request_password_reset recover_view recover, budget450, returned14of268 nodes from1150 (truncated); refreshed the same10-file108-node213-edge focused corpus and inspected backend source. Jev used generic sanitized requested-change/throttle-preservation state and chose targeted over rewrite, confidence1.0, jev-1.13.0,393input/35output tokens. No account addresses, patient data or credentials were sent. This is scoped prioritization, not verification.
