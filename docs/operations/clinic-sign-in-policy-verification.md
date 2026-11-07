# Clinic sign-in policy — October 21, 2026

## Delivered and locally active

Settings -> Security now offers Strict, Password only and Remember for 30 days with descriptions,
selected-state radio cards, current/effective requirements, unsaved-work guard, app-owned confirmation,
current-password reauthentication, inline errors, conflict reload and saved/reauthentication feedback.
Existing clinics remain Strict until explicitly changed by a member with organization.manage.
No real clinic's mode was changed during implementation or visual review.

Effective routine staff policy is the strongest among active workspace memberships in active clinics:
Strict > Remember > Password only. Platform administrators and Django staff/superusers remain Strict.
Policy update validates exact organization/native permission, rejects Station delegation/device
contexts, checks expected revision under organization lock, reauthenticates the actor's password with
throttling, audits the mode and invalidates affected remembered proofs/reduced-factor sessions.

Native session completion distinguishes actual MFA from policy-satisfied staff authentication.
Password-only/trusted sessions have their own method/epoch/policy fingerprint; mfa_verified is false.
HTTP realm/routing/session middleware, applicable staff photo/Station/call context and socket authority
use the shared helper. Reduced assurance is revalidated live; delegated Station source authority
also validates the source assurance without needing another source-browser request. Existing native
lease/grant/role/realm/device checks remain. Legacy MFA and exact-encounter restrictions remain.
These are source implementation descriptions, not completed security acceptance.

Remembered-browser proof is opt-in after successful native MFA in effective Remember mode, fixed at
30 days, hashed server-side and stored in a separate HttpOnly/SameSite=Strict cookie. Native runtime
configuration requires Secure cookies outside loopback and HTTPS in production. A valid first factor
is still required; reuse rotates the token without extending its original expiry. User epoch/policy
fingerprint/revocation/deadline are checked. Shared-device/paired/Station sign-in cannot use or issue
remembered proof. Forget this browser revokes that proof and dependent trusted sessions. Stay logged
in and the 30-minute inactivity limit remain separate. No password is saved by this feature.

Password and already-linked Google routine sign-in accept the native authenticated nextStep.
Unlinked Google identities still require native MFA before linking. Initial clinic/staff account
activation, patient portal/contact proof, pairing codes and doctor entry codes retain their separate
requirements. No original MFA secret/recovery code, credential, role/grant or device function changed.
The pre-existing Google button helper still says an authenticator is always required; this visual
copy finding is logged without repair as SIGNIN-POLICY-002.

## Preservation, migrations and runtime

Selected pre-edit source archive: .medframe-runtime/sign-in-policy-before-20261021-135906.
Focused implementation archive: .medframe-runtime/sign-in-policy-source (41 source files, not a full
repository snapshot). Synthetic presentation source retained privately at
.medframe-runtime/sign-in-policy-presentation.tsx; temporary public review route removed.
Unrelated changes and the user's original clinic-shell width snippet remain preserved.

Launcher stopped original local services. The first migrate refused occupied port3000 while no
listener subsequently appeared; no unmanaged process was killed. A later showmigrations step failed
because an import-placement edit left Station middleware indentation invalid. Ruff format reported
line83; the narrow activation blocker was repaired, then migration/startup resumed. No database
migration had run before that repair. No repeated broad test or visual cycle was used.

Launcher created encrypted checkpoint:
/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261021-140917-a89bd41

Isolated restore medframe_django_launcher_20261021_060916_f5396e verified165 original tables,
source_written=false. Applied accounts.0006_trusted_browser_session_assurance and
organizations.0004_organization_sign_in_policy successfully. These add trusted-browser/policy tables
and native session assurance columns. Missing policy rows resolve Strict; no policy seed or account
fixture was imported. New model metadata permissions are unassigned. Restore evidence precedes the
migrations; no post-traffic row/object fingerprint claim or clone restore over original data.

Active launcher .next-local-dev, original medframe_django: API1180531, worker1180723,
scheduler1180724, media1180725, web1181227. The API supervisor child is1180534. Local readiness and
final status report services running. Existing loopback call-media/public-domain preparation remains
unchanged; no public deployment, live messaging or money movement.

## Actual verification

Prettier formatted changed supported frontend files and Ruff format formatted Python. No build,
automated tests, typecheck or lint suite under the user's visual-only preference. The formatting
parse failure above was an activation blocker, repaired narrowly before migrations.

One desktop/390x844 phone CUA visual pass reused actual SecuritySettings, SignInModeChoices,
MfaVerificationForm, SafetyProvider and shared Dialog/PasswordInput/Switch. It used clearly marked
synthetic Example Clinic data and a local sample confirmation callback, without native settings or
authentication writes. Observed three cards, current/selected state, keyboard ArrowRight selection,
password confirmation, sample incorrect-password message, sample saved acknowledgement, readable
phone stacking/scrolling and phone modal. The real six-cell MFA form accepted synthetic digits and
passed the opted-in remember flag to its presentation callback. Phone DOM geometry was375px content
within390px viewport. Initial immediate resize screenshot was transitional; settled capture was
readable. No native cookie proof was issued by the preview.

The native anonymous /login settled from its shared loading container to the existing login form,
Stay logged in and Google button. Its Google helper copy finding is preserved in the error log.
The temporary tab was closed, viewport reset and review route removed. No second visual pass.

Native successful/denied settings changes, real password-only/trusted/strict sign-ins, Google linking,
real browser-cookie rotation/expiry/forget, multi-clinic/privilege changes, policy/password revocation,
concurrency, websocket and delegated Station-source enforcement remain unverified. Synthetic
presentation and successful migration/startup do not prove those behaviors. SIGNIN-POLICY-001 records
these acceptance gaps. No production security/compliance claim.

## Actual Graphify and Jev use

Planning queried the old1150-node root graph for mfa_required/MFAChallenge/Organization/auth_policy:
203 neighbors/15shown, truncated and stale frontend paths. Source inspection was authoritative.

Refreshed41-file AST corpus .medframe-runtime/sign-in-policy-graph-corpus, graph output
.medframe-runtime/sign-in-policy-graph: final373nodes/949edges. Corpus warning: config/urls.py yielded
no symbols (top-level route data), so route allowlists were read directly. No syntax warning in the
final extraction. Initial extraction before the import repair had372nodes/948edges. No semantic
extraction or whole-repository/runtime coverage claim; no private clinical records included.

Final query expanded from actual vocabulary [policy, assurance, session, trusted, browser]: BFS2,
115neighbors/15shown at500-token budget, explicitly truncated. An attempted `graphify query --help`
was interpreted as literal search and returned no matches; it supplies no coverage evidence.

Jev0.7.0 auth status available; official model jev-1.13.0, sanitized generic engineering state only:
planning distinction choice confidence1.0 (400input/36output); implementation limited choice
confidence1.0 (430/33); review limited choice confidence1.0 (437/31). Judgments favored explicit
policy/assurance and honest verification limits, never global MFA bypass or verified security.
No PHI, credentials, identities, private attachments/logs or clinic records sent to Jev.
