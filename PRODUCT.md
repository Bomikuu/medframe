# Medframe

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Explicitly selected in the user's master brief and approved architecture: one Next.js App Router application with TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod, a typed GraphQL client and code generation, and React Three Fiber/Three.js. The backend is a FastAPI/Strawberry modular monolith using SQLAlchemy, Alembic, PostgreSQL, Redis, and private S3-compatible document storage.

## Users

Dentists and doctors documenting real clinical care are the primary users. Clinic staff have narrowly scoped administrative permissions. Patients and authorized guardians receive access to permitted records in a later portal slice. Initial specialties are dentistry and general medical practice.

## Product Purpose

Provide a clinical workspace for patient management, consultations, structured medical records, interactive dental charting, treatment planning, and longitudinal history. The first complete release lets a dentist register a patient, document care, record tooth/surface findings and procedures, attach supporting documents, finalize the consultation, and reopen its persisted history.

## Positioning

Medframe integrates tooth-specific and surface-specific visualization with attributed, versioned clinical records. The care encounter is independent of appointment booking. The clinical record, rather than the visualization or a scheduling event, is authoritative.

## Operating Context

Clinicians work with patient context, medical history, allergies, findings, notes, treatments, and supporting images during a consultation. Desktop use must be efficient; narrow-screen and keyboard workflows must remain usable. Model interaction has an accessible 2D alternative and remains functional without WebGL.

## Capabilities and Constraints

- Deliver foundation, patients, consultations, dental charting, then treatment/history/documents as integrated vertical slices.
- Persist clinical records in PostgreSQL and enforce tenant and patient authorization in backend services.
- Staff must complete MFA. Receptionists and administrators receive no automatic entitlement to clinical notes.
- Finalized records are immutable; amendments preserve the original and identify author, time, and reason.
- Keep subjective symptoms, confirmed diagnoses, proposed treatment, completed procedures, and illustrative previews distinct.
- Use synthetic patient data during development. Do not claim regulatory compliance or anatomical validation without review.
- Patient portal follows the clinical milestone. Scheduling, queues, billing, diagnostics, general anatomy, and clinic websites follow the roadmap.
- Maintain readable source, focused modules, Prettier for supported formats, Ruff for Python, and Tailwind-first styling.
- Group and size form inputs for their expected content. Profile-image uploads use circular avatar controls; clinical images retain complete framing.

## Brand Commitments

Name: Medframe. Tagline: The Foundation of Modern Care.

The user specifies a professional, clinical, trustworthy, minimal, modern, secure identity; Inter typography; deep navy `#0F2D4A`, medical teal `#0EA5A4`, soft teal `#22C1B6`, off-white `#F8FAFC`, and slate `#475569`. Preserve these commitments with accessible contrast. Avoid excessive gradients, cartoon illustration, unnecessary decoration, excessive cards, and oversized controls.

Use the approved concept-11 medical symbol when supplied. Do not invent an unrelated substitute. The text name can identify the product while that asset is unavailable.

## Evidence on Hand

- `docs/requirements/medframe-master-v3.txt`: exact copy of the supplied master brief.
- `docs/superpowers/specs/2026-10-18-medframe-clinical-foundation-design.md`: architecture approved on October 18, 2026, including subsequent code/form requirements.
- The initial repository has no application or existing visual implementation.
- The approved logo and licensed/clinically reviewed anatomical assets are not present. No production infrastructure, customer claims, clinical validation, or compliance evidence has been provided.

## Product Principles

1. Clinical usefulness precedes booking and public websites.
2. Backend authorization and record integrity are part of every feature.
3. Persist actual work and communicate save failures honestly.
4. Visualization explains stored findings and never independently diagnoses.
5. Familiar, accessible clinical workflows outrank visual decoration.

## Accessibility & Inclusion

Provide keyboard operation, visible labels and focus, readable contrast, understandable validation, accessible alternatives to 3D, reduced-motion support, responsive layouts, and verified light/dark surfaces. Preserve entered text during errors and conflicts.
