# Login enhancements — October 19, 2026

## Delivered

- Staff and patient login share an unchecked **Stay logged in** checkbox using the existing shadcn
  Checkbox. Its value survives password/Google first-factor verification and the five-minute MFA
  challenge. Only successful MFA establishes a clinical session. Unchecked: browser-session cookie,
  eight-hour server maximum. Checked: persistent HTTP-only cookie, 30-day server maximum. The
  existing 30-minute inactivity timeout, revocation, and realm checks still apply.
- Authenticator enrollment and verification use the official shadcn radix-nova Input OTP and
  `input-otp`, with six separate slots, numeric input, full-code paste, backspace/selection editing,
  and one-time-code autocomplete. A separate recovery-code action preserves the 16-character
  single-use recovery workflow. Shared form/validation/error patterns and Tailwind remain in use.
- Google Identity Services renders Google's actual button when configured. Django verifies ID-token
  signature/audience/issuer/expiry with Google's maintained Python library and checks a one-time,
  session-bound, realm-specific nonce and verified email. No account or clinical access is created
  by Google sign-in. Existing MFA must already be enrolled; the durable Google subject is linked
  only after MFA succeeds. Google challenges recheck membership/portal eligibility before completion.
- Unconfigured Google sign-in is shown honestly as unavailable. Script/network failures retain
  password sign-in. Root `.env` has no Google client ID; a real Google round trip is therefore
  **not enabled or verified**. See [setup instructions](google-sign-in-setup.md).

## One bounded verification pass

| Check                              | Actual result                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Formatting                         | Prettier and Ruff formatting applied to changed supported source                                                       |
| Scoped Python lint                 | Passed                                                                                                                 |
| Focused backend tests              | 32 passed in 4.063 seconds: new login cases plus existing auth/session-realm tests                                     |
| Production build / TypeScript      | Passed; `.next-login-enhancements`                                                                                     |
| Scoped ESLint                      | Zero errors; one deferred memoization warning, AUTH-001                                                                |
| Browser                            | Five groups passed; zero page errors                                                                                   |
| Visual review                      | Desktop and 320px staff/patient login and MFA screenshots inspected; no horizontal overflow in asserted mobile screens |
| Real Google account authentication | Not run: Web client ID absent; provider callback browser coverage was explicitly mocked                                |

Browser groups cover checkbox/default/unconfigured provider and responsive login, six slots and
typing/backspace/paste/recovery switching, real checked password/MFA cookie behavior, real unchecked
password/MFA cookie behavior, and configured-provider SDK nonce/callback/remember wiring with a mocked
Google script. No claim is made that the mocked button proves Google's live popup or a real Google
account works. No broad suite, repeated browser loop, or deferred dental repair occurred.

The new backend cases include cookie lifetime and inactivity enforcement, strict boolean input,
missing provider configuration, CSRF, MFA-gated identity binding, nonce expiry/replay/mismatch,
unverified email, missing account/enrollment, stable subject lookup, refusal to replace a connection,
membership revocation, patient/staff boundaries, and invalid token rejection.

Evidence is retained in ignored `.impeccable/review/login-enhancements/`, including the browser
harness/report, screenshots and build/backend/lint logs. AUTH-001 and installation audit output
AUTH-002 are logged without source repair or retesting.

## Preservation and local activation

Source checkpoint: `checkpoint/pre-login-enhancements-2026-10-19` at `43f56a9`; branch:
`codex/login-enhancements`. The encrypted database/configuration backup and source bundle are at
`/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-081730-43f56a9`.
The checkpoint helper verified 72 table counts and did not write to the legacy source database.

Applied `accounts.0005_google_identity` to the existing Django database. It adds the identity table
and its uniqueness constraints; no existing account, password, MFA secret, role, provider, patient,
consultation or original database was replaced. Tests use the separate Django test database;
browser authentication uses the existing dedicated synthetic review account.

Local web **3000** now uses `.next-login-enhancements`, with BACKEND_URL `http://127.0.0.1:8000` and
WEB_ORIGIN `http://localhost:3000`. Native web runtime session: `65938`; API runtime session: `93605`.
Logs: `/tmp/medframe-login-web-runtime.log` and `/tmp/medframe-login-api-runtime.log`. Existing
clinical workers/infrastructure remain running. No push or public deployment occurred.
Activation smoke checks returned HTTP 200 for `/login` and healthy Django status; temporary review
web/API ports 3001/8001 were stopped after activation.

The preserved `.next-dental-reference` artifact remains available for UI rollback. Restarting it on
3000 with the same backend/origin restores the previous UI. The additive identity table can remain;
do not reverse its migration or restore a whole database over subsequent writes just for UI rollback.
