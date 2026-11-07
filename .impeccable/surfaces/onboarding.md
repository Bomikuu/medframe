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

## October 20 refinement — current visual contract

Operate mode. The user explicitly replaces the introductory simulated workspace with a generic clinic photograph inside a card and requests circle/dot background motifs. Use the generated local clinic-welcome.png decoratively, never as an actual clinic identity or patient image. Keep white/navy/teal tokens and shared shadcn controls. Group setup in cards; use semantic field errors, status feedback and a subdued current-step pulse with reduced-motion support. Phone navigation is a compact six-step row. Specialty cards have one useful icon and a selected check. Daily hours are independent, closed days explicit; preserve server validation and legacy draft compatibility. Password checks are local guidance, not a security assessment or replacement password policy. No AI integration, account/MFA bypass or live email delivery. Verification is visual only under the user's latest instruction.

## October 20 supplied three-column reference

Use the supplied reference as visual authority for setup: connected step icons, real percentage/count, a wide form card, compact branded header and contextual guidance. Add restrained concentric circles and diagonal lines around the cards. Preserve saved native step order, guards and form owners. Collapse contextual guidance below the form on tablet/phone; keep mobile progress compact. The photograph-led welcome remains the introduction. No authenticated avatar/menu is implied before account verification. Local dev activation; visual-only verification, no build or automated tests.

Header refinement: move save status and Save and exit out of the form body into the persistent header. Compact second header row on phones; native save and guarded exit owners retained.

Specialty cards include a concise description of each native catalog specialty, consistent icon, explicit Selected/check state and full-card interaction. Search matches names/descriptions and preserves selections when filtered. Hide empty category headings and keep one-column readable cards on phones.
