# SMSGate Local Server and patient Google sign-up

Status: integration prepared; real SMS and Google registration require the configuration below. Existing email registration stays available. Do not put credentials in chat or Git.

## Android SMSGate (same Wi-Fi)

1. In the Android app, turn on Local Server and start it until Online appears. Keep the computer and phone on the same trusted Wi-Fi.
2. Note the **local** URL, username and password shown by the app. The local endpoint uses Basic authentication and sends through your SIM. No cloud account or API key is needed for this mode.
3. In the project's private `.env`, set:

   ```dotenv
   SMSGATE_OTP_ENABLED=true
   SMSGATE_LOCAL_URL=http://YOUR_PHONE_LAN_IP:8080
   SMSGATE_USERNAME=YOUR_APP_USERNAME
   SMSGATE_PASSWORD=YOUR_APP_PASSWORD
   ```

   Use the actual private IP shown by the app. The adapter adds `/message`. It also accepts an endpoint already ending in `/message`. Do not use the cloud `/3rdparty/v1/messages` path in local mode. Local HTTP is permitted only in development. The feature is disabled unless the dedicated flag, valid local URL and credentials are all configured.
4. Restart the backend using the root launcher. The frontend stays in dev mode:

   ```bash
   ./medframe stop --only backend
   ./medframe start --only backend --dist-dir .next-local-dev
   ```

   If the launcher reports a port still occupied immediately after shutdown, let the socket finish closing and retry start; do not kill an unrelated process.
5. Open a real branch registration link. Mobile becomes selectable when the adapter is configured. Use a permitted Philippine test mobile number (+639 followed by nine digits) and request its code yourself. SIM/carrier fees apply. No SMS has been sent by this implementation session.

The integration is for registration OTP only. It does not switch financial reminder delivery or enable general live SMS. Outbox retries are bounded; uncertain acceptance is not blindly retried. The public code screen's Check SMS delivery status reports queue/gateway acceptance, never assumes handset delivery.

Official local-mode guide: https://docs.sms-gate.app/getting-started/local-server/

## Google sign-up inside Medframe

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview), select or create a Medframe project, and complete Branding with an app name and support email. Configure Audience for development; if the app is in Testing, add the Google accounts that will test it. Authentication needs only the default openid, email and profile scopes.
2. Under Clients, choose Create client → **Web application**. Add both `http://localhost` and `http://localhost:3000` under Authorized JavaScript origins, without a path or trailing slash. This integration uses a JavaScript callback, so no Authorized redirect URI is needed. Add other actual secure app origins only when appropriate; this phase does not publish the app.
3. Set the public Web Client ID in `.env`:

   ```dotenv
   GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
   ```

   Google Identity Services ID-token verification does not need a client secret in this implementation. Do not use a Google account password or an unrelated API key.
4. Restart the backend as above. Patient registration now renders the official Sign up with Google button. Google-hosted verified email skips the separate email code and opens patient details, then clinic review. A Google account using a third-party email that Google does not manage uses email-code verification instead.
5. After clinic acceptance, the native emailed invitation offers Google account creation. New Google users can finish without choosing a Medframe password, but still complete native MFA. Existing accounts must use their already-linked Google identity or their existing password; they are not merged just by matching email.

Official [Google client setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) and [ID-token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

These configuration and identity/delivery paths have source implementation; real Google/SMS end-to-end confirmation remains pending configuration and an explicit test recipient.
