# Onboarding reference layout — October 20, 2026

## Implemented

Native setup now uses a shared OnboardingHeader/OnboardingLayout: compact brand/help header, connected icon progress rail with actual saved completion percentage, wider form card, step icon and contextual “Why this matters” panel. Sparse concentric circles and diagonal lines sit behind the cards. Clinic fields gain clearer basic-information/location hierarchy. Active-step pulse respects reduced motion. Existing StepForm, native save/version queue, validation, account navigation confirmation, MFA, review and completion owners remain; canonical step order is unchanged. No backend, schema, credentials or permissions changed.

Three columns at xl, two columns at lg with collapsed guidance below the form, compact icon progress and one column on phone. Pre-account setup does not fabricate an authenticated avatar menu. Existing generic-clinic welcome image remains.

## Actual tools

- Impeccable context was loaded for onboarding earlier in this session; existing product/design/surface contracts and craft floor informed this refinement. User-authorized scope and visual-only checking override additional approval/build/test process.
- Initial `graphify query 'OnboardingProgress StepForm OnboardingFlow stepDetails' --budget 450` returned no matching nodes in the stale root graph. Direct source inspection established Flow → StepForm/account/review ownership before edits. A focused local AST extraction refresh covers onboarding TS/TSX in `graphify-out/onboarding-reference-layout`; it is source relationship evidence, not runtime validation. Counts appended below.
- `jev choice` received only generic sanitized engineering state and two options: preserve existing native order/guards while changing presentation, or restructure behavior. It selected `preserve`, confidence 1.0, model jev-1.13.0; usage 397 input/35 output tokens. This judgment did not replace source inspection or browser review. No patient data, credentials or private attachments were submitted.
- Prettier formatted authored TS/TSX/CSS. No build, TypeScript, lint, detector or automated tests were run, per user instruction.

## Bounded visual evidence and limitations

One manual browser inspection batch plus final presentation confirmation used a temporary synthetic in-memory preview rendering the actual shared layout/progress/StepForm; the preview route was removed afterward. No account/clinic was created and no backend data was changed.

Observed clinic-information layout at 1536×1024, practice-hours layout at tablet/phone dimensions, compact phone progress and bounded time fields, native inline invalid-email error plus summary/focus, and phone Help & support dialog. Read-only browser measurements show no document overflow at phone (390 viewport, 375 document width) or desktop (1536 viewport, 1521 document width). Some screenshots taken immediately after resizing reflected the previous layout until the subsequent browser observation; only the settled views support responsive conclusions. Final confirmation shows the teal progress indicator and form footer.

This is visual/presentation evidence, not end-to-end invitation, server autosave, account/MFA, logo scan or clinic-creation acceptance. Those flows were preserved in source and not repeated. The development server remains active at localhost:3000 using `.next-local-dev` under the existing root launcher, so these changes are available without a production build. Existing unrelated working-tree edits and deferred findings remain untouched.

Focused Graphify refresh: 24 onboarding source files, 149 nodes, 392 edges. No whole-repository coverage claim.

## Follow-up: save controls in header

Moved the actual form-owned status and Save and exit controls into a header DOM slot through a React portal. No second save/status owner was introduced. Account/review exit actions also live in the header and retain existing account-entry confirmation. The header stays visible on scroll; phone uses a second header row to avoid crowding the brand/help controls. Removed the redundant in-form status/action row.

One bounded manual visual pass used a temporary synthetic in-memory preview of the actual header/layout/StepForm. Desktop and 390px phone captures show controls in the header and the form beginning directly with fields; editing changed the header to Unsaved changes and then All changes saved. Save and exit reached the synthetic paused state using the original form handler. This does not assert a live backend save or account/MFA end-to-end acceptance. Preview route removed; viewport reset. Prettier only, no build/automated tests.

Graphify root query `OnboardingHeader StepForm persist` returned no matches (root graph remains stale); direct source verified the form owner and focused extraction refreshed below. Jev chose portal over duplicate implementation, confidence 1.0, jev-1.13.0, 377 input/31 output tokens, sanitized generic engineering state only. The judgment is not verification. Local dev HMR activates the change.

Follow-up focused Graphify refresh: 24 onboarding files, 150 nodes, 393 edges.

## Follow-up: specialty cards with descriptions

Added short plain-language descriptions for all 14 existing reference specialties in a separate presentation module, with a safe generic fallback for future catalog entries. Refined cards have consistent icons, full-card selection, teal selected background/border and explicit Selected/check feedback. Selection count appears near the search; clearing selection retains native dirty/validation updates. Search includes descriptions, empty categories do not render, and a no-results state offers Clear search. Native catalog codes, multi-select owner, provider fields and authorization remain unchanged.

Impeccable guided the existing visual language. Root Graphify query `SpecialtyStep availableSpecialties` returned no matching nodes; direct source/catalog inspection verified all 14 native names before changes. Focused graph refreshed below. Jev selected descriptive cards with explicit multi-select feedback over decorative name-only cards, confidence 1.0, jev-1.13.0, 370 input/33 output tokens; only sanitized generic engineering state was submitted.

One manual browser pass used actual SpecialtyStep in a temporary synthetic RHF fixture: desktop and 390px phone screenshots, description search for braces returning Orthodontics, selecting it while a preselected specialty remained filtered out, two selections preserved after clearing search, and no-results guidance. Phone document width375 within viewport390. Fixture removed and viewport reset. No build, automated tests, backend writes or account changes. Prettier applied; local dev HMR activates the UI. This does not assert live onboarding completion or backend save acceptance.

Specialty follow-up Graphify refresh: 25 files, 153 nodes, 401 edges, scoped to onboarding source relationships.
