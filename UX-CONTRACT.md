# Medframe foundation interaction contract

Visual rules live in [DESIGN.md](DESIGN.md). The master brief and approved clinical design own business/security policy.

## Canonical owners

| Capability     | Canonical owner                                         | Source of truth        | Allowed variants                                    | Verification                            |
| -------------- | ------------------------------------------------------- | ---------------------- | --------------------------------------------------- | --------------------------------------- |
| Button         | `apps/web/components/ui/button.tsx`                     | DESIGN.md              | Primary, outline, ghost; busy and disabled          | Browser journeys and axe                |
| Form           | `apps/web/components/form-field.tsx`                    | Approved clinical spec | Typed email/password/OTP fields; grouped by step    | Foundation browser tests                |
| Password       | `apps/web/components/password-input.tsx`                | UX-CONTRACT.md         | Current/new password, accessible reveal             | Sign-in and reset tests                 |
| Select/Listbox | `apps/web/components/ui/select.tsx`                     | DESIGN.md              | Authored Radix organization selector                | Keyboard organization switching and axe |
| Checkbox       | `apps/web/components/ui/checkbox.tsx`                   | UX-CONTRACT.md         | Recovery-code acknowledgement                       | MFA browser journey                     |
| Session        | `apps/web/lib/auth/client.ts`                           | Approved clinical spec | Clinical session, MFA challenge, recovery bootstrap | PostgreSQL security and browser tests   |
| Authorization  | `services/api/app/modules/organizations/permissions.py` | Approved clinical spec | Explicit membership, permission, branch scope       | PostgreSQL tenant tests                 |

Auth transport is owned by `apps/web/lib/auth/client.ts`; typed GraphQL transport by `apps/web/lib/graphql/client.ts`. Both use the fixed same-origin proxy. Backend policy remains authoritative.

## Authentication flow

Password verification issues only a five-minute MFA challenge. First enrollment shows an authenticator QR/setup key; no recovery credential can bypass initial TOTP verification. Successful MFA rotates the token into a clinical session. New recovery codes appear once and require acknowledgement before the UI continues.

Existing staff can use a current authenticator code or one-time recovery code. Preserve leading zeros by treating codes as strings. On expired challenges return to sign-in with a clear message. Never put tokens, passwords, setup keys, or recovery codes in URLs, analytics, persistent client storage, or notification messages.

Recovery requests always use the same account-existence-neutral message. Reset links carry the short-lived token in the URL fragment; the reset screen captures it in memory and removes the fragment. A completed reset revokes existing sessions and preserves the MFA requirement.

## Forms and feedback

Each authentication step owns a focused form. `noValidate` disables browser validation bubbles; React Hook Form/Zod owns inline errors and first-invalid-field focus. Labels remain visible, errors use text and `aria-invalid`, and helper IDs exist before references are added. Passwords support paste and managers. Never trim passwords.

Pending buttons stay the same size and cannot be submitted twice. Failed requests preserve safe input and explain retry/restart. Alerts are inline; no browser alert/confirm/prompt APIs are used. Profile avatar uploads use circular choose/change/remove affordances when their real persistence slice is implemented; clinical image previews retain full framing.

## Workspace states

Cookie presence only controls the initial route redirect; the API always authorizes data. An expired session redirects to sign-in. A user without active organizations sees an actionable no-membership message. API failures show a retry action. Organization switching clears the previous workspace immediately and ignores superseded workspace responses. Returning focus refreshes authorization; denied/revoked access clears workspace content. Navigation between future clinical modules must preserve these rules.

## Accessibility and responsive behavior

English interface; organization timezone defaults to Asia/Manila. Use native input types/autocomplete and an authored Radix organization select. A skip link reaches main content. Use real headings, landmarks, focus outlines, visible errors, and keyboard-operable controls. Dark mode follows system preference and reduced motion suppresses transitions. Desktop sidebar becomes normal-flow organization/navigation controls on mobile; it cannot clip forms or hide actions.

## Verification boundary

The foundation has no patient CRUD, clinical finalization, medical uploads, or dental visualization. Their contracts belong to later slices. Current browser checks exercise successful enrollment/login, failure retry, refresh, organization switching, logout, recovery messaging, light/dark accessibility, and narrow layout.
