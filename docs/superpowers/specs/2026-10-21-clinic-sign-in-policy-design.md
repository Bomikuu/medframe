# Clinic sign-in modes

Date: October 21, 2026 (Asia/Manila)
Status: user-approved design, implemented locally. Existing clinics remain Strict; native security acceptance gaps are recorded in docs/operations/clinic-sign-in-policy-verification.md.

## User-approved intent

Clinics need three choices to reduce repeated authenticator prompts: Strict, Password only,
and Remember for 30 days. An authorized clinic administrator chooses the policy. Existing
clinics retain Strict until explicitly changed. Work remains native, with no agents, builds
or automated tests; activate locally after implementation and one bounded visual pass.

## Modes and scope

| Mode | Normal staff sign-in | Authenticator prompt |
| --- | --- | --- |
| Strict | Password or already-linked Google identity | Every new sign-in |
| Password only | Password or already-linked Google identity | Omitted for routine sign-in |
| Remember for 30 days | Password or already-linked Google identity | Required until the user explicitly trusts this browser; required again when trust expires or is revoked |

The remembered-browser mode remembers second-factor proof, not the password or an indefinitely
open session. Existing Stay logged in controls session persistence separately. The existing
30-minute inactivity and normal absolute session limits remain. Closing a session or signing out
ends that session; a separately trusted personal browser can still omit the next authenticator
prompt until its fixed deadline. Offer Forget this browser separately with clear explanation.
Shared-device sign-in does not offer or use remembered-browser trust.

Clinic policy applies to routine staff authentication. Patient portal MFA/contact ownership,
patient registration verification, invitation email ownership, device pairing, doctor Station entry
codes, account activation and authenticator enrollment/recovery retain their existing requirements.
Existing unlinked Google identities still require native MFA before account linking; this feature
must not silently link accounts by matching email. Password-only means no extra authenticator step
for routine staff sign-in, not unrestricted access or disabling the native password requirement.

## Multi-clinic and privileged accounts

The staff login currently has no clinic selector. Resolve policy after valid first-factor identity
from all active staff memberships with workspace access in active clinics. Strict outranks Remember
for 30 days, which outranks Password only. No eligible membership falls back to Strict. Display the
effective requirement only after first-factor verification; do not publicly expose account/clinic
membership. Explain in Settings that another clinic can impose a stronger requirement.

Platform administrators, Django staff/superusers and operational administration retain Strict.
Clinic administrators without platform privileges follow their clinics' effective mode. Do not alter
roles, passwords, MFA secrets/recovery codes, clinical patient grants or Station device functions.

## Native authorization model

Separate authenticated session establishment from actual MFA proof. Introduce an authenticated
session marker/helper while retaining mfa_verified only for real code verification. Legacy sessions
with actual mfa_verified remain recognized. Record authentication method, user auth epoch and effective
policy fingerprint for reduced-factor sessions. Patient sessions still require actual MFA.

Adapt native HTTP/session routing/realm gates and applicable WebSocket/call/native Station entry
checks to recognize policy-satisfied staff sessions without pretending MFA happened. Actual-MFA-only
operations (platform/Django administration, initial activation/linking and authenticator maintenance)
keep real-proof checks. Existing CSRF, throttle, inactivity, realm, live membership/grant, device,
source-session, editing-lease and version checks remain authoritative.

Revalidate effective policy and user epoch for reduced-factor sessions on authenticated requests and
live socket authority checks, including delegated Station source authority. A stronger/newly changed
policy, privilege/membership change, password reset, user disable or expired trust must not leave a
reduced-factor session or its delegated Station access valid. Return the established session-expired
recovery state instead of an indefinite refresh. Actual-MFA sessions may continue within their native
limits. No global MFA bypass or organization chosen solely by untrusted input.

## Persistence and remembered browser

Add an organization authentication-policy record with Strict default and monotonic revision; missing
record means Strict. Add a native trusted-browser record containing user, hashed random token,
auth epoch, effective-policy fingerprint, creation/fixed expiry and revocation state. Secrets remain
in an HttpOnly, SameSite=Strict cookie, Secure outside localhost; no token in JavaScript/localStorage,
URL, logs or audit payloads. Trust lives for at most 30 days from actual MFA proof; no sliding renewal.
Trust is opt-in after a successful authenticator challenge in the effective Remember mode, not granted
from password-only authentication or generic device pairing. Trusted login still requires a valid
first factor and live native eligibility. Invalid/stale trust falls back to normal MFA enrollment/
challenge. Validate token/epoch/fingerprint/deadline server-side and handle reuse atomically.

Changing policy increments its revision, invalidates that clinic's affected remembered-browser
proofs and reduced-factor sessions, and creates an attributed audit event. Password reset uses the
existing auth epoch to invalidate trust. Forget browser revokes its row and clears its cookie.
No fingerprinting claims or reliance on browser user-agent as proof. Bound untrusted cookie/input size.

## Clinic Settings UI and API

Add Settings -> Security, visible to organization.manage. Use the current white/navy/teal settings
language and three accessible radio cards, each with a restrained icon, concise description and
explicit selected state. Include current mode, effective multi-clinic explanation, separate session
persistence guidance and clear saved/error/conflict feedback. Preserve selection on failure.

Server endpoints read/update only the authorized organization, reject delegated Station and paired
configuration contexts, validate the mode and expected revision, and audit the actor/change.
Changing the sign-in policy requires the clinic administrator's current password reauthentication
and an app-owned confirmation naming the clinic and selected behavior. Platform accounts still
require their strict native session. This password confirmation allows administrators of a
password-only clinic to restore Strict without requiring an MFA bypass or silently enrolling them.
Policy update is transactional; concurrent stale updates receive a conflict rather than overwriting.

At MFA, show the trust-browser option only when effective mode permits it. Existing OTP cells/recovery
controls remain. Login and Google flows accept an authenticated nextStep and enter the native
workspace without constructing a fake MFA step. Recovery and session-expiry screens remain shared.

## Preservation, activation and acceptance

Before applying additive migrations, preserve selected sources and use the launcher encrypted
checkpoint/isolated restore. No resets, permission grants, credential/MFA deletion or real-clinic
policy change during development. Existing clinics remain Strict after migration. Start original
local services with the launcher; no public deployment or live external messages.

Use Prettier/Ruff format, source review, sanitized Jev judgment, refreshed relevant Graphify corpus
and one desktop/phone visual pass. No build/typecheck/automated tests per user preference. Record
actual native authenticated/negative/concurrent/expiry/browser-cookie/socket/Station acceptance
performed versus unverified. Synthetic cards/login presentation alone cannot establish secure
cross-clinic enforcement. Log unrelated findings without repair; do not claim production security
acceptance from this limited verification.

## Source and planning evidence

Inspected native accounts services/middleware/session realms/session routing, Google sign-in, user/
ClinicalSession models, organization memberships/policy, staff onboarding, Station context, realtime/
call authority and Django administration. Existing login always starts MFA; mfa_verified currently
also gates generic session authentication. This coupling requires coordinated changes, not a UI toggle.

Existing root Graphify query for mfa_required/MFAChallenge/Organization/auth_policy: 1,150-node graph,
203 neighbors, 15 shown, explicitly truncated; old frontend paths and no current policy-model coverage.
Source inspection is authoritative; no fresh/full backend graph claim. Jev 0.7.0 auth status available;
model jev-1.13.0 classified the distinction between password-only and remembered-browser policy as
requiring explicit choice (confidence1.0; 400 input/36 output tokens). State was sanitized engineering
text only, with no PHI, credentials or private records. User subsequently requested all three modes.
