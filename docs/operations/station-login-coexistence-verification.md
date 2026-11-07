# Station pairing and staff-session coexistence — October 20, 2026

The user confirmed the problem occurs after entering a **device pairing code**. Source inspection established two causes: `stations.views.pair` explicitly revoked the current ClinicalSession and logged out, and the global device cookie constrained clinic requests/navigation even for an independently authenticated MFA staff session.

## Implemented behavior

Pairing now only redeems the device code and sets its device credential; it does not revoke or replace the existing staff login. Ordinary native MFA staff requests retain normal membership/patient authorization outside Station. Station requests still apply live device state, clinic/branch/functions and existing permissions. The shared CSRF/GraphQL/document-upload/document-preview clients supply a per-request `X-Medframe-Workspace: station` marker from the current pathname, forwarded by the same-origin backend proxy. This is a restriction selector, not an authorization credential. No Referer dependency: the app has an intentional no-referrer policy. Device operational endpoints also select device context server-side. Anonymous and delegated identities always retain device restrictions regardless of the marker.

Session navigation prefers an authenticated staff identity over device metadata. The existing patient/device navigation order is retained. Approved clinician devices expose Open clinical workspace to native MFA staff only after existing clinician_device permission and branch checks. Nonpermitted users still need the existing appropriate access flow. Pairing approval, code expiry/use limits, delegated doctor/exact-consultation sessions, their expiry/scope/source revocation, and explicit staff-to-customer kiosk sign-out remain unchanged. Doctor-code redemption was inspected but is unchanged, following the user's clarification. No permission, credential, MFA, schema or original patient-data change.

Pre-change sources are privately preserved in `.medframe-runtime/station-login-before-20261020-223942`. Other uncommitted work is retained; the user-owned clinic-shell snippet remains one insertion/two deletions.

## Verification and limits

Per user instruction, no production build, typecheck, lint suite or automated tests ran. Changed supported files were Prettier/Ruff formatted. One native visual visit confirmed /station renders the actual device pairing entry, code input and disabled-until-complete Connect device control. The review browser has no authenticated staff session or paired device, so live pairing-plus-clinic-tab coexistence and the conditional signed-in button are **not browser-verified**. Do not claim that source reasoning or anonymous visual rendering establishes authenticated acceptance. Existing sessions already revoked by the old implementation cannot be restored; the user must legitimately sign in once if already logged out.

The root launcher restarted the backend against the original database, with the existing frontend dev server on .next-local-dev using source hot reload. No migration or data restore was performed. A normal port8000 TIME_WAIT delayed the final backend restart; no unmanaged process was killed.

## Actual Graphify / Jev

The initial root query `station session redeem code login StationAccessSession`, budget650, used the existing1150-node graph and returned22of76 neighborhood nodes, truncated and partly irrelevant. Focused native code-only extraction refreshed14 source files under `.medframe-runtime/station-login-graph/graphify-out`, final123nodes/232edges, without clustering or external semantic extraction. Graphify reported partial TSX extraction at the existing literal ampersand text in station-entry.tsx; that UI source was inspected directly and parsed/formatted by Prettier. Graph coverage is partial and does not verify runtime authorization.

Jev0.7.0/auth status succeeded. A sanitized generic engineering-only risk question returned score1.3 on Low0/Moderate1/High2, confidence0.34, modeljev-1.13.0,368input/17output tokens. Its state included a then-considered same-doctor session-preservation option; that option was subsequently excluded after the user confirmed device pairing. It was a risk judgment, not security validation. No patient details, credentials, real account identifiers or private attachments were sent. Native/no-subagent execution remains in force.
