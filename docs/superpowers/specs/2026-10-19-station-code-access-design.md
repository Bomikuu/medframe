# Station code access amendment

The user explicitly confirmed: an authenticated clinician generates a one-use code that opens a short scoped session under their own identity, without password entry on the receiving tablet. This supersedes the original requirement to repeat native sign-in on that receiving device; original staff passwords/MFA remain unchanged.

## Scope and decision

Extend the existing device-only handoff code rather than introduce a shared account or another invitation code. The existing authenticated/MFA-verified editor saves and offers a handoff. Its code opens the same consultation on an already paired, approved clinician device. Pairing remains public, configuration-only and clinic-approved. Kiosk/display setup codes never become staff credentials.

The receiver explicitly chooses Open consultation with the code. Before any patient information appears, the backend verifies code expiry/single use, issuer's live native staff session, user auth epoch, current patient/branch permissions, live source lease/version and approved receiving device. The code is proof of that clinician's authorization; no password/MFA prompt is shown on the receiving tablet. Responsibility codes for a different clinician are excluded from anonymous redemption.

## Session constraints

Create a native Django login/ClinicalSession plus an attributed StationAccessSession. Thirty-minute absolute expiry, ten-minute inactivity expiry, bound to the receiving device credential, exact organization/branch/patient/encounter, issuer auth epoch and live source session. Logout/revoke/expiry of the source session or device immediately invalidates delegated access. Source inactivity must be recent at redemption; it is not refreshed by tablet requests. No remembered session, MFA enrollment/change, admin, financial actions, patient directory, unrelated consultations or further delegation. Existing finalized record/amendment controls remain authoritative. Codes remain digest-only and five minutes; shared throttling applies before lookup.

Scope is enforced at HTTP endpoints, GraphQL root fields (including aliases/fragments), membership permission intersection, patient queries and exact encounter access. Native full staff sessions are unchanged. GraphQL billing/admin/settings/identity operations are not permitted in a delegated session. Documents and patient history for the assigned patient remain readable, but writes use the assigned consultation and existing draft lease. Treatment plans are view-only in a code session. Consultation draft, procedure documentation, finalization and attributed amendments remain the original services, with exact encounter/patient scope; financial authority is not delegated.

## Interface

Preserve the existing Medframe Operate surface and actual shadcn eight-block input. Approved clinician devices show an access-code form rather than a sign-in demand. Explain the named identity, short duration and patient scope. Successful redemption navigates straight to the existing editor. Its Station strip shows clinician/expiry, End session and the assigned consultation; clinic-wide navigation is removed. Expiry/connection errors hide stale patient UI on the next failed ownership check while retaining form input in memory until explicit exit. Public pairing removes the unrelated sign-in footer. Returning to Station with an active scoped session offers Resume assigned consultation.

## Delivery

This is the next connected Station access milestone. Patient self-service and department queues remain the following phase; live payments/TV remain later. No automatic account elevation, hardware changes, public deployment, live messages, password reset or subagents.

Preserve source/build, encrypted checkpoint/verified review clone, accumulated bounded checks, then fresh activation checkpoint and all-original-row verification around additive migration. Native source/visual review replaces delegated review by user instruction.
