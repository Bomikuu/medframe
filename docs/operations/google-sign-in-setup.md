# Google sign-in setup

Medframe uses Google Identity Services with server-side ID-token verification. No Google client
secret, refresh token, or Google API access is needed. Staff and patient login use the same Web
client ID; their Medframe sessions and access rules remain separate.

1. In Google Cloud, create or select a project, configure the OAuth consent screen, and create an
   OAuth client of type **Web application**. Configure test users if the consent screen is in testing.
2. Add `http://localhost:3000` to **Authorized JavaScript origins**. If reviewing on port 3001, add
   `http://localhost:3001` as well. Production needs its own exact HTTPS origin. This popup/callback
   integration does not use a redirect URI.
3. Set `GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com` in the root `.env`, then
   restart the Django API. The frontend obtains the public ID from Django at runtime; no frontend
   rebuild is required when changing this setting.
4. Use an existing clinic-provided Medframe account with a matching Google email and an enrolled
   authenticator. Patient accounts must already have an active clinic-verified patient connection.
   Complete initial invitations and authenticator enrollment using the password flow first.
5. Select **Continue with Google**, choose the account, then verify the Medframe authenticator code
   (or a saved recovery code). First-time linking completes only after this verification. Subsequent
   sign-ins resolve the durable Google `sub` identifier, including if Google's email later changes.

Google login does not create users, memberships, provider profiles, or patient connections. A
different Google identity cannot replace an existing connection through the login screen. Google
credentials are never stored in a session or application log. Invalid, expired, replayed, or
cross-realm nonces are rejected, and the normal same-origin CSRF boundary applies.

When the client ID is absent, both login screens display a disabled Google control with an honest
setup message. Blocked Google scripts or a lost connection leave password sign-in available.
Reload the login page to renew the short-lived Google challenge after it expires.

**Stay logged in** is unchecked by default. Unchecked sessions use a browser-session cookie and an
eight-hour server maximum. Checked sessions use a persistent cookie and a 30-day server maximum.
Both retain the 30-minute inactivity limit, active-account checks, MFA, realm restrictions, and
server revocation/logout behavior. The remembered choice lives only in the short-lived sign-in
challenge until MFA succeeds; credentials are not saved to browser storage.

Implementation references: [Google button API](https://developers.google.com/identity/gsi/web/reference/js-reference),
[server-side verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token),
and [Web client setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
