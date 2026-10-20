# Clinic invitation and onboarding

Mode: Operate. Follow the approved design at `docs/superpowers/specs/2026-10-19-medframe-clinic-onboarding-design.md`. Existing Medframe navy/teal/white, Manrope/Jakarta, Tailwind and shadcn are the visual authority. Introduction is a spacious five-slide product presentation; setup is a focused progress rail plus readable forms, never the clinic dashboard shell. Use actual entered clinic identity and an explicitly illustrative private preview. Only complete server-confirmed saves display success. Profile circles never crop clinic logos.

The new route family is `/onboarding/invite/[token]` → `/onboarding/setup`; platform invitation management is `/platform/clinic-invitations`. Both operate outside WorkspaceProvider. Preserve all native identity/MFA, proof/tenant guards and private-logo boundaries. Specialties do not grant credentials. The AI panel elsewhere remains an unconnected preview; no website builder or staff invitation subsystem is added here.

Active locally with `.next-clinic-onboarding` / implementation `8582eea`. Staged evidence establishes the full synthetic invitation/verified setup/resume/scan/account/MFA/review/creation/dashboard flow and platform administration. Welcome/branding captures cover desktop/tablet/phone with no document overflow; not every step has a full viewport acceptance matrix. Existing zero-patient metric below the new checklist, compact review labels, incomplete completion-summary embellishments and three lint advisories are deferred in ONBOARD-004 under the user's bounded-verification preference. No further polish cycle was run. See `docs/operations/clinic-onboarding-verification.md` for exact failures, confirmations, source/data preservation, access bootstrap and rollback.

## Phase5 refinement

Readable review labels retain actual names/emails, provider ranges and operating
days. The private scanned-logo preview keeps proportions. The first-run dashboard
uses one native readiness read and real next actions before empty metrics. Existing
proof/MFA, draft save and scan boundaries remain. Review casing/count/day/preview
name and first-run actions have staged responsive browser evidence. The manual
review fixture omitted some defaults; its future preparer is corrected without a
third browser run. Default-value and new logo image-load acceptance remain open.
See docs/operations/onboarding-reporting-refinement-verification.md.
