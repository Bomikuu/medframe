# Medframe

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Current implementation, selected in the user's Django Edition amendment: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod, a suitable typed GraphQL client/code generation, React Three Fiber/Three.js, and Lucide. The backend is a modular Django application using Django ORM, authentication, sessions, permissions, migrations, Admin, Strawberry, strawberry-graphql-django, and PostgreSQL. Private S3-compatible storage, ClamAV, and Celery support connected document/asset workflows; Redis supplies shared throttling and the broker.

Batch 3 clinic operations is activated locally on `codex/django-clinic-batch-3` after the user authorized the recorded activation-blocker repairs. Schedules, appointments, queues and patient operations are now available; see `docs/operations/django-batch-3-verification.md` for data preservation, focused checks and the incomplete browser journey, and `docs/operations/error-log.md` for deferred issues.

The local app has completed the Django Batch 1 cutover. Batch 2 extends it with verified patient access and explicit clinical releases; local activation and actual verification are recorded in `docs/operations/django-batch-2-verification.md`. The old FastAPI/SQLAlchemy/Alembic/Phosphor implementation remains saved as `77bf229` / `checkpoint/pre-django-2026-10-18`, with its source database intact. See `docs/operations/django-batch-1-verification.md` for verification and clinical/production boundaries.

Batch 4 financial communication is active locally on `codex/django-financial-batch-4` with `.next-batch4`: separate billing/communications apps, staff invoices/manual payments/refunds/credits, consent-based reminders and patient statements/preferences. The user authorized the recorded blocker repair; 20 focused backend tests and six browser groups pass. All five additive migrations are applied, with all 4,475 pre-existing rows across 73 tables preserved. See `docs/operations/django-batch-4-verification.md` for checkpoint/runtime/tool evidence and `docs/operations/error-log.md` for deferred issues including B4-004. SMS remains preview-only; payments/refunds record money moved elsewhere rather than initiating transfers.

Batch 5 diagnostic collaboration is active locally on `codex/django-diagnostics-batch-5`, using `.next-batch5`: referral requests, patient center selection, protected result upload, exact-version review/correction and explicit releases. Necessary activation blockers are repaired; 15 focused backend tests and the core browser flow pass across bounded confirmations. Four additive original migrations preserved all 4,560 original rows across 85 tables. See `docs/operations/django-batch-5-verification.md` for exact evidence and `docs/operations/error-log.md` for B5-005/other deferred gaps. The user requires local activation after future batches; SMS remains preview-only.

## Users

Dentists and doctors documenting real clinical care are the primary users. Clinic staff have narrowly scoped administrative permissions. Patients and verified guardians access only the exact versions explicitly released by their clinician through the separate patient portal. Initial specialties are dentistry and general medical practice.

## Product Purpose

Provide a clinical workspace for patient management, consultations, structured medical records, interactive dental charting, treatment planning, and longitudinal history. Batch 1 must deliver the connected clinical workflow: Django-backed identity/organizations/patients, a white customizable shell, provider/consultation/SOAP/diagnosis workflows, integrated 2D/3D tooth/surface findings, procedures/basic treatment plans, protected documents, finalization/amendments, and reopening exact persisted history. Organization branding and user/dashboard preferences are part of this batch.

## Positioning

Medframe integrates tooth-specific and surface-specific visualization with attributed, versioned clinical records. The care encounter is independent of appointment booking. The clinical record, rather than the visualization or a scheduling event, is authoritative.

## Operating Context

Clinicians work with patient context, medical history, allergies, findings, notes, treatments, and supporting images during a consultation. Desktop use must be efficient; narrow-screen and keyboard workflows must remain usable. Model interaction has an accessible 2D alternative and remains functional without WebGL.

## Capabilities and Constraints

- Deliver the Django Edition's integrated Batch 1 with multiple connected features. Internal work packages/commits are implementation order, not separate user handoffs. Batch 2 improves clinical visualization/history/plans and adds verified patient access; operations and public websites remain later.
- Persist clinical records in PostgreSQL and enforce tenant and patient authorization in backend services.
- Staff must complete MFA. Receptionists and administrators receive no automatic entitlement to clinical notes.
- Finalized records are immutable; amendments preserve the original and identify author, time, and reason.
- Keep subjective symptoms, confirmed diagnoses, proposed treatment, completed procedures, and illustrative previews distinct.
- Use synthetic patient data during development. Do not claim regulatory compliance or anatomical validation without review.
- The Batch 2 patient portal follows the complete Batch 1 clinical milestone. Scheduling/queues, financial communication, diagnostics, general anatomy, clinic websites, and expansion follow Batches 3–8 of the new roadmap.
- Maintain readable source, focused modules, Prettier for supported formats, Ruff for Python, and Tailwind-first styling. Execute natively without subagents or delegated reviews, as the user instructed on October 18, 2026.
- Group and size form inputs for their expected content. Profile-image uploads use circular avatar controls; clinical images retain complete framing.

## Brand Commitments

Name: Medframe. Tagline: The Foundation of Modern Care.

The October 19 application-wide reconstruction brief supersedes earlier visual defaults. Manrope headings and Plus Jakarta Sans body/UI are self-hosted with next/font/google. The light default uses a cool `#F7F9FC` canvas, white task surfaces, navy `#102A43`, teal `#0D9488`, readable text and semantic status tints. Clinic branding and allowed personal preferences remain centralized and validated; explicit legacy font choices and dark/system modes are retained. Avoid excessive gradients, cartoon illustration, unnecessary decoration and uniform nested cards.

The original concept-11 logo asset is unavailable. A Lucide HeartPulse companion mark accompanies the wordmark without claiming to reproduce that asset. Clinic logos preserve proportions.

The reconstruction is active locally on `codex/visual-reconstruction` with `.next-reconstruction`; its source/data checkpoint, tool evidence, verification and remaining dental acceptance gap are recorded in `docs/operations/visual-reconstruction-verification.md`.

## Evidence on Hand

- `docs/requirements/medframe-visual-reconstruction.txt`: current comprehensive visual brief; preserves the existing backend roadmap and integrations.

- `docs/requirements/medframe-django-edition.txt`: exact new authoritative user brief; overrides conflicting earlier stack, theme, icon, and delivery instructions.
- `docs/superpowers/specs/2026-10-18-medframe-django-amendment.md`: migration/preservation, clinical integrity, appearance, execution, and eight-batch roadmap.
- `docs/superpowers/plans/2026-10-18-medframe-django-batch-1.md`: one integrated implementation plan covering all connected Batch 1 features.
- `docs/operations/pre-django-checkpoint.md`: source/data recovery locations and verified baseline evidence.
- `docs/requirements/medframe-master-v3.txt` and the older foundation/patient plans: historical context and unchanged requirements, not the current stack/release authority.
- The approved logo remains unavailable. Two licensed Dundee dental assets are integrated locally with attribution; independent clinical validation and dimensional calibration remain unavailable. See `assets/dental/ATTRIBUTION.md` and `docs/operations/anatomical-dental-verification.md`. No production infrastructure, clinical validation, or compliance evidence is supplied.

## Product Principles

1. Clinical usefulness precedes booking and public websites.
2. Backend authorization and record integrity are part of every feature.
3. Persist actual work and communicate save failures honestly.
4. Visualization explains stored findings and never independently diagnoses.
5. Familiar, accessible clinical workflows outrank visual decoration.

## Accessibility & Inclusion

Provide keyboard operation, visible labels and focus, readable contrast, understandable validation, accessible alternatives to 3D, reduced-motion support, responsive layouts, and verified light/dark surfaces. Preserve entered text during errors and conflicts.

## General anatomy workspace — local Batch 6

Batch 6 adds a real Z-Anatomy body/skeleton reference and point findings inside the existing consultation draft. General medicine opens Anatomy by default; dentistry retains Dental. Immutable finalized anatomy history, exact comparisons and separately selected patient releases use Django authorization and the existing record lifecycle. It runs locally with `.next-batch6`; accounts/MFA and original data were preserved. The models are generic reference geometry, not patient-specific or clinically validated. Expanded responsive layout, map marker presentation and fallback acceptance gaps remain recorded in `docs/operations/django-batch-6-verification.md` and the error log.

The reference-guided anatomy editor is now active locally with `.next-anatomy-reference`, including a clearly unconnected Medframe AI sidebar preview. Chat sending, attachments, AI providers and clinical-data transfer are deferred. The focused anatomy workspace uses the existing consultation draft and authorization. See `docs/operations/anatomy-reference-ui-verification.md` for actual UI scope, checks and remaining refinements.

## Clinic onboarding and Station

Invitation-based clinic onboarding is active locally: verified recipient proof, resumable clinic/specialty/branding/practice steps, native account/MFA, review and atomic creation, with platform invitation management and a first-run checklist. Patient invitations remain separate. See `docs/operations/clinic-onboarding-verification.md` for exact scope and limits.

Medframe Station Phase 1 is active locally with approved clinic devices, focused clinician workspaces and save-before-transfer handoffs. Staff, patient, device and editing ownership stay separate. The existing consultation aggregate and chart editors remain authoritative; transfer acceptance immediately removes the prior device's server write access. Explicit responsibility handoff uses existing provider/patient authorization and attributed events. Pairing is not patient verification. Kiosk self-service/department queues and configured digital payments/live TV display remain the next two phases. Local activation does not configure physical device networking, operating-system lockdown or hardware. See `docs/operations/station-phase-1-verification.md`.

The approved Station access amendment is active locally: a native MFA-authenticated clinician issues a one-use handoff code; the approved receiving tablet opens that same consultation without another login. Its short native session retains the issuer's identity with exact patient/encounter/device scope and live revocation, while preserving existing credentials/MFA. Generic pairing codes remain configuration-only. See `docs/operations/station-code-access-verification.md` for actual verification and outstanding self-service/queue/payment/display work.

The doctor workspace amendment replaces new per-consultation Station login codes with doctor-owned branch-scoped entry. Devices open in an editable management modal with regeneration in every state. Approved tablets can choose all permitted patients/consultations or document a memory-only walk-in, confirm identity at save, then use the existing encounter review/finalization workflow. Exact-encounter legacy sessions retain their old restrictions. See `docs/operations/station-doctor-workspace-verification.md` for actual staged checks, local activation and deferred narrow-phone overflow.

Clinical Station's tablet gallery adds a clinic-time clock, today's timed patient/consultation cards, an upcoming-care rail, factual arrival/delay/reschedule labels, scanned private patient portrait selection/upload and explicit session-end confirmation. All consultations remains available. Photos are optional user-supplied patient images with initials fallback; no generated faces or public portrait URLs. See `docs/operations/station-gallery-verification.md` for actual scope, staged evidence, local activation and the deferred editor-navigation DOM error.

Dental current-state illustrations are active locally with `.next-dental-illustration`: missing/crown/bracket findings and schematic impaction presets for permanent wisdom teeth, stronger tooth selection and a single focused-context assistant preview shared with anatomy. The assistant still cannot send or generate answers. Existing clinical persistence/authorization remains authoritative; no schema changes. See `docs/operations/dental-illustration-verification.md` for actual staged checks and the deferred cross-visit acceptance gap.

The active `.next-clinical-ai-drawer` refinement replaces both AI columns with a shared full-height floating drawer. Crowns have a distinct gold schematic shell; missing teeth remain labelled red reference placeholders. AI integration remains disabled. See `docs/operations/clinical-ai-drawer-verification.md` for staged verification and responsive acceptance gaps.

Station Phase 2 is active locally with `.next-station-kiosk`: verified four-action patient kiosk, existing appointment/reservation/check-in reuse, one patient visit across provider-optional department queues, staff-reviewed new registration and verified bill/cashier continuation. Staff configure departments and issue patient codes in Patient Stations; verified portal users can issue their own short code. Digital payments/cash hardware/TV remain Phase 3 and no kiosk button records settlement. See `docs/operations/station-kiosk-verification.md` for actual scope, staged verification, explicit setup, preserved data and remaining dependencies.
