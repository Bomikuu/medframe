# Medframe

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Current implementation, selected in the user's Django Edition amendment: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod, a suitable typed GraphQL client/code generation, React Three Fiber/Three.js, and Lucide. The backend is a modular Django application using Django ORM, authentication, sessions, permissions, migrations, Admin, Strawberry, strawberry-graphql-django, and PostgreSQL. Private S3-compatible storage, ClamAV, and Celery support connected document/asset workflows; Redis supplies shared throttling and the broker.

Batch 3 clinic-operations implementation source is saved on `codex/django-clinic-batch-3`, but activation is blocked by failures from the user-requested single verification pass. The running app remains Batch 2; see `docs/operations/django-batch-3-verification.md` and `docs/operations/error-log.md`.

The local app has completed the Django Batch 1 cutover. Batch 2 extends it with verified patient access and explicit clinical releases; local activation and actual verification are recorded in `docs/operations/django-batch-2-verification.md`. The old FastAPI/SQLAlchemy/Alembic/Phosphor implementation remains saved as `77bf229` / `checkpoint/pre-django-2026-10-18`, with its source database intact. See `docs/operations/django-batch-1-verification.md` for verification and clinical/production boundaries.

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

The amended identity remains professional, clinical, trustworthy, minimal, modern, and secure. The default is explicitly light and predominantly white: page/sidebar/header/cards `#FFFFFF`, secondary background `#F8FAFC`, foreground `#1E293B`, supporting text `#475569`, borders `#E2E8F0`, navy actions `#0F2D4A`, and teal interaction accents `#0EA5A4`. Inter remains the default within a safe configurable font system. Organization branding and allowed user preferences consume centralized validated tokens; dark/system modes are optional saved choices. Preserve accessible contrast and meaningful clinical semantic colors. Avoid excessive gradients, cartoon illustration, unnecessary decoration, excessive cards, and oversized controls.

Use the approved concept-11 medical symbol when supplied. Do not invent an unrelated substitute. The text name can identify the product while that asset is unavailable.

## Evidence on Hand

- `docs/requirements/medframe-django-edition.txt`: exact new authoritative user brief; overrides conflicting earlier stack, theme, icon, and delivery instructions.
- `docs/superpowers/specs/2026-10-18-medframe-django-amendment.md`: migration/preservation, clinical integrity, appearance, execution, and eight-batch roadmap.
- `docs/superpowers/plans/2026-10-18-medframe-django-batch-1.md`: one integrated implementation plan covering all connected Batch 1 features.
- `docs/operations/pre-django-checkpoint.md`: source/data recovery locations and verified baseline evidence.
- `docs/requirements/medframe-master-v3.txt` and the older foundation/patient plans: historical context and unchanged requirements, not the current stack/release authority.
- The approved logo and licensed/clinically reviewed anatomical asset remain unavailable. No production infrastructure, clinical validation, or compliance evidence is supplied.

## Product Principles

1. Clinical usefulness precedes booking and public websites.
2. Backend authorization and record integrity are part of every feature.
3. Persist actual work and communicate save failures honestly.
4. Visualization explains stored findings and never independently diagnoses.
5. Familiar, accessible clinical workflows outrank visual decoration.

## Accessibility & Inclusion

Provide keyboard operation, visible labels and focus, readable contrast, understandable validation, accessible alternatives to 3D, reduced-motion support, responsive layouts, and verified light/dark surfaces. Preserve entered text during errors and conflicts.
