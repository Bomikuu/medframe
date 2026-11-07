# Internet call setup for pixelsbymiku.dev

The user chose pixelsbymiku.dev for the internet configuration. This is prepared configuration,
not an active public deployment. Current local activation stays on localhost. Do not replace an
existing website, change DNS, install trust roots, expose the development server or bypass TLS
warnings. Server/DNS/certificate details are still needed from the user. No production build was
run because the user requested visual checks only.

## Prepared owners

- infrastructure/calls/pixelsbymiku.dev.Caddyfile: exact-host trusted TLS reverse proxy; only
  /ws/calls/* reaches the native Django call gateway, with ordinary web/API traffic through Next.
- infrastructure/calls/pixelsbymiku.dev.env.example: public origin, media IPv4 and existing TLS/TURN
  certificate path placeholders. This is not automatically evaluated or loaded by the launcher.
- medframe: explicit MEDFRAME_PUBLIC_ORIGIN sets the exact backend/frontend origin, secure cookies
  and production backend mode. It refuses public access in frontend development mode, missing media
  IP and origin changes while owned processes are running. Defaults remain loopback.
- scripts/prepare-call-media.py: optional explicit globally routable IPv4 candidate configuration;
  raw :7880 API/signaling stays bound to loopback behind the native gateway. Optional embedded
  TURN/TLS uses a separately configured hostname/trusted certificate on5349. Existing generated
  media keys are retained; no credential is copied into public config or the browser.
- callSocket: HTTPS pages use same-origin WSS /ws/calls, while localhost HTTP retains native :8000.
  The socket still rechecks session/admission/expiry; no direct client media token is introduced.

## Required before activation

1. Confirm where Medframe will run and whether pixelsbymiku.dev is already serving another site.
   Provide its server/public IPv4 and DNS access through the user's normal hosting controls.
2. DNS for pixelsbymiku.dev must resolve to that server. Provide existing trusted certificate/key
   paths covering the exact domain, or arrange certificate issuance with the hosting provider.
   Never paste private keys into chat or commit them.
3. Supply a compatible production frontend artifact. The current serving artifact is development
   source; no new production build is authorized under the user's present preference.
4. Production Django configuration must satisfy existing security validation, including authenticated
   TLS email when recovery is enabled. Do not silently disable account recovery or reset credentials.
5. Configure/firewall the public frontend TLS443, media UDP7882 and optional ICE/TCP7881 as appropriate.
   Keep3000/8000/7880 and database/storage/Redis private. The reverse proxy and app are same-host in
   this prepared profile. Verify actual listeners/candidates before accepting internet readiness.
6. For restrictive networks, configure TURN with turn.pixelsbymiku.dev DNS and trusted certificate.
   The supplied optional5349 listener is not a guarantee for443-only networks; those require an
   appropriately isolated TURN443 endpoint/load balancer or a separate public address. No firewall,
   DNS, proxy, public address, cloud account or certificate was created during this phase.

## Future authorized activation

After prerequisites and explicit public deployment authorization, stop owned app processes first.
Set the public profile variables explicitly using the hosting service's protected environment;
do not shell-evaluate the repository .env file. MEDFRAME_PUBLIC_ORIGIN is
https://pixelsbymiku.dev and MEDFRAME_MEDIA_PUBLIC_IP is the actual server/mapped public IPv4.
Set optional MEDFRAME_TURN_DOMAIN/CERT/KEY and existing MEDFRAME_TLS_CERT/KEY for Caddy separately.
Start an existing matching production artifact through ./medframe and start Caddy using the prepared
configuration through the operator's service manager. No commands here create a certificate or
modify a remote server automatically. No development server exposure.

Native room inspection reports only safe profile/secure-origin booleans, never IPs or credentials.
Configured profile does not mean a measured successful connection. Real doctor/patient devices,
external/mobile networks, TURN fallback, reconnect, admission/expiry and permission behavior need
explicit live acceptance before reporting working internet appointments.

Sources consulted: official LiveKit deployment and port/firewall guidance and the pinned1.13.10
config sample; installed Next16 header-override documentation. One speculative source path returned
404 and was not relied on.

- https://docs.livekit.io/transport/self-hosting/deployment/
- https://docs.livekit.io/transport/self-hosting/ports-firewall/
- https://github.com/livekit/livekit/blob/v1.13.10/config-sample.yaml
