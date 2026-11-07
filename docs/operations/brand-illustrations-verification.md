# Supplied Medframe branding and illustrations — October 22, 2026

## Implemented and active

The exact uploaded transparent WebP doctor illustration is now Medframe's shared BrandMark, with the existing wordmark retained. Shared Brand covers staff/portal authentication, clinic shell, Station/kiosk/display and portal headers. Bespoke clinic onboarding, patient registration, platform invitation administration, online room desktop/mobile entry and onboarding preview marks now use the same shared owner. The collapsed clinic sidebar uses BrandMark. Browser icon metadata points to the supplied asset. Organization-uploaded logos and circular patient/staff portraits retain their existing owners and framing.

The provided Downloads WebP folder had no SVGs. The adjacent `medframe-illustrations-individual/medframe-illustrations/svg-editable` pack contains 14 actual path-based, simplified vector traces. Its README explicitly distinguishes them from original editable source artwork. All 14 were inspected during import with an element/attribute allowlist; no scripts, raster embeddings, foreign objects or external resources were included. Original coordinates and view boxes remain. Source styles/title IDs were replaced with inherited palette fills inside a reusable `artwork` group.

`MedframeIllustration` references individual same-origin SVG assets with `<use>`, keeping path data out of the JavaScript bundle and avoiding global style/title-ID collisions. CSS palette variables follow the clinic primary and teal colors, with per-instance accent overrides; original skin/paper defaults remain. Illustrations are decorative and hidden from assistive technology; adjacent text carries meaning. Original palette/provenance notes are stored with the assets. The logo itself remains the exact raster upload and is not represented as SVG.

Connected placements: five clinic introduction slides, clinic setup progress footer, patient directory and consultation empty states, documents empty state, staff-directory empty state, notification empty state, staff appointment agenda and patient appointment empty states, and shared-care portal records empty state. Existing data-rich calendars, clinical models, real portraits and actions are retained. Unused library assets remain available for future contexts; this is not a claim that every asset appears everywhere.

## Preservation

Current dirty source was copied before edits into private ignored `.medframe-runtime/brand-illustrations-source/`, including the later launcher activation repair. Other uncommitted work was retained. The user-owned clinic-shell main opening tag was compared with this pre-edit copy and remains byte-for-byte present; the shell was deliberately excluded from whole-file formatting. Existing sidebar pending/draft protection and width changes remain.

Encrypted checkpoint: `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261022-130309-a89bd41`. Isolated restore `medframe_django_brand_illustrations_20261022_e6b492` verified 167 tables, `source_written=false`. No schema migrations, fixture patients, sessions, role changes or credential/MFA changes were introduced by this phase. No clone was restored over the original database.

## Actual Graphify and Jev usage

Initial existing-root query: `graphify query 'Brand EmptyState AuthLayout OnboardingHeader' --budget 240`; stale root graph, 245 matches, 7 shown and 238 truncated. Current source inspection governed the changes.

After implementation, a focused AST-only corpus of 23 affected TSX/CSS source files produced 125 nodes and 215 edges under private `.medframe-runtime/brand-illustrations-graph/graphify-out/`. Query `Brand BrandMark MedframeIllustration EmptyState WelcomeSlides`, budget 320: 19 nodes found, 13 shown and 6 truncated. This is focused code relationships only, not whole-repository, SVG semantic, clinical, launcher or runtime verification. No image interpretation or LLM extraction was run.

Jev choice received only sanitized public design context about a medical workspace, vector illustrations and compact controls; no user images, attachments, patients or credentials were transmitted. It selected contextual onboarding/empty-state use over large artwork in every data panel with confidence 1.0; returned model `jev-1.14.0`, usage 383 input / 37 output tokens. This judgment informed placement and is not verification.

## Bounded visual evidence and limitations

One native in-app-browser round mounted the real shared Brand, EmptyState, MedframeIllustration and WelcomeSlides components on a temporary local-only preview, without accessing/modifying user accounts or cookies. Desktop confirmed the supplied brand mark, four contextual empty states, introduction artwork and slide switching. Two simultaneous notification illustrations visibly used different teal/pink accents, confirming inherited per-instance colors through external SVG references. Light and dark sample logo presentation was viewed. Phone width 390px confirmed stacked empty states, readable instructions/actions and the responsive introduction. Browser error sample returned no entries.

Findings were logged without repair or another visual loop: BRAND-ILLUSTRATIONS-001 (small narrow-phone introduction-header overflow) and BRAND-ILLUSTRATIONS-002 (source vector-trace fidelity on dark surfaces). This component review is not authenticated end-to-end acceptance of every consumer, every browser, onboarding persistence, patient access, image optimization at every size or favicon compatibility on every platform.

No builds, automated tests, TypeScript checks or lint suites were run. Supported edited source used Prettier; the launcher used Ruff format only. The temporary preview route was removed and the frontend restarted, clearing its active module graph. No original security headers were changed.

## Activation and port conflict

The normal all-service launcher initially refused activation because port 8000 was already occupied. Read-only process inspection identified an unrelated project server; it was not terminated or reconfigured. The launcher gained a validated local API-port choice via `MEDFRAME_API_PORT` or private `.medframe-runtime/backend-port.json`, defaulting to 8000 when neither is set. Availability checks, API bind, readiness checks and frontend BACKEND_URL use the same selection. Changing origin or API port while owned services run requires stopping them first.

This workspace's private selection is port 8001, so plain `./medframe start --dist-dir .next-local-dev` continues to work without an environment prefix. Full activation succeeded against original `medframe_django`: API 1823124, worker 1823256, scheduler 1823257, media 1823258, web 1823716. UI stays at `http://localhost:3000`; API is loopback `http://127.0.0.1:8001`. Launcher readiness and status report running services/healthy infrastructure. No build or migration application occurred. The unrelated port-8000 project remains untouched.

For source rollback, use the private pre-edit file copies selectively; do not reset the dirty tree, database or private storage. Stop all launcher-owned services before changing the private port choice. Existing historical verification findings remain deferred.

## User-reported directive correction — October 22

The new Brand import in `features/platform/clinic-invitations.tsx` had been inserted before its compact client header. Prettier then represented the misplaced statement as `("use client");`, which Next rejects. Restored a standalone `"use client";` as the first statement, followed by imports, and formatted only that file. Source-header inspection across web TS/TSX files found no other matching misplaced client directives. This was a direct authorized correction to the reported blocker, not an unrelated repair.

The focused 23-file Graphify corpus was refreshed with the corrected component (125 nodes, 215 edges). The existing-root relationship query for ClinicInvitations/WorkspaceProvider was stale and truncated: 82 found, 5 shown, 77 omitted; current source governed the fix. Jev received only the public directive/import issue, selected the narrow directive correction at confidence 1.0, model jev-1.14.0, usage 377 input / 31 output tokens; no secrets or records sent.

A single native browser navigation to `/clinic` reached its normal unauthenticated `/login` redirect and rendered the sign-in form rather than a compilation error. No sign-in was submitted and no authenticated dashboard acceptance is claimed. The development server applied the correction locally through its normal refresh. No build, automated tests, typecheck, schema or identity changes were performed.
