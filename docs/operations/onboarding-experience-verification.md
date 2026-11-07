# Clinic onboarding experience — October 20, 2026

## Implemented

A photo-led introduction card replaces the simulated app preview and supports slide buttons, keyboard arrows and swipe. The photograph is generated generic clinic scenery at apps/web/public/images/onboarding/clinic-welcome.png, not a real clinic or patient. Quiet circle outlines, shared form cards, interactive saved/unlocked steps and a reduced-motion-aware active dot preserve the established visual language. Phones use six compact step targets with the current title. Step changes from data-entry forms flush their existing queued save owner. Leaving nonempty administrator entry opens a shared confirmation; passwords are not placed into draft data.

Specialty cards gain icons, selected checks, clear search and explicit no-results/field feedback. Clinic email trims/lowercases on blur; phone numbers normalize to the existing international format and display grouped Philippine/North American numbers. Shared RHF/Zod validation shows all affected fields, invalid semantics and a visible summary; save/network errors retain entries. Verification retains native proof handling and adds six separate boxes, paste guidance, sent/error/busy states, missing-digit feedback, resend countdown and a development-only local inbox link. Contextual Help gives three instructions for each step and save/resume guidance. Password length/variety guidance is local only;15–128 characters remain required, other checks are suggestions, with native Django validation and MFA unchanged.

Each weekday has an open/closed switch and its own time fields. The existing draft JSON accepts daily_hours; completion writes the existing PracticeDay rows with matching day times. Legacy drafts retain common opens/closes fallback. Review lists daily hours explicitly. No migration/schema, credential, role, MFA, patient-data, AI or external-mail change.

## Verification limits

Per the user's latest instruction, no builds, typechecks, lint, automated tests or mechanical design detector ran. Prettier and Ruff formatted authored files. A temporary local visual fixture rendered the actual components with synthetic in-memory data and no save/create calls to the original database. Browser review covered the welcome card, specialty cards, account/password guidance, invalid clinic-email feedback, weekly hours and verification introduction on desktop/390px phone. One final confirmation shows the complete welcome photo, compact phone navigator and contextual Help. The temporary fixture was removed. Native email-code submission/confirmation, expiry, daily-hour save/create roundtrip, account/MFA completion and leave-account guard remain unverified. No new account, clinic or consent was submitted.

First-pass stale SSR/client preview output is recorded in ONBOARD-EXPERIENCE-001. Frontend restart briefly met a settling-port refusal; inspection found no unmanaged listener to terminate, and startup succeeded once the port became available. The old browser tab remained on its connection error; a fresh tab completed the visual confirmation. No broader repair/testing cycle was run.

## Local runtime

The existing root launcher owns frontend development mode on port3000 with .next-local-dev and native API/worker/scheduler on the original medframe_django configuration. Backend processes were restarted to load validation/completion changes; no migrations were applied. Frontend was restarted to load current source. Development mode compiles requested routes; no production build ran. Earlier loading changes, the user's clinic-shell width edit and prior source/data/backups remain intact. Use the original clinic invitation link to enter/resume; no verification bypass was added.

## Tools

Impeccable context targeted onboarding-flow; existing design/craft/shared-control contracts informed the refinement. User native/no-subagent and visual-only instructions override delegated/repeated verification guidance. Graphify queried the existing graph for onboarding/PracticeStep/WelcomeSlides/VerificationStep and found no matching current nodes. Focused frontend/backend AST graphs were refreshed under graphify-out/onboarding-experience-frontend and onboarding-experience-backend; no private attachments, credentials or patient data were included, and no external extraction tokens were used. Python multiprocessing from stdin failed and Graphify explicitly fell back to sequential extraction; coverage remains scoped rather than whole-app proof. Jev0.7.0, modeljev-1.13.0, evaluated sanitized engineering scope only and selected preserve (confidence1.0;397 input/35 output tokens) over bypass. This was advisory, not validation evidence.

Final source graph onboarding-experience-frontend: 23 files, 140 nodes, 370 edges.

Final source graph onboarding-experience-backend: 13 files, 127 nodes, 351 edges.
