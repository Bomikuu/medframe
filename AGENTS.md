# Medframe working instructions

The user's latest instructions, supplied October 18, 2026:

- Work natively in this chat. Do not spawn subagents, delegate implementation/review, or create separate chats. This overrides earlier native-plan instructions that requested an independent agent reviewer.
- Deliver multiple connected features per phase. The Django Edition's Batch 1 is one integrated clinical milestone; internal tasks and commits are implementation order, not separate user handoffs.
- Preserve the existing implementation and data before replacing infrastructure. The verified baseline is commit `77bf229`, tag `checkpoint/pre-django-2026-10-18`.
- Use readable, focused code. Use Prettier for supported files, Ruff for Python, and Tailwind for UI styling. Group fields by purpose and size them for expected input.
- Profile-image controls/previews are circular. Clinical images and documents retain their full framing; clinic logos retain their intended proportions.

The current target specification is `docs/requirements/medframe-django-edition.txt`. It supersedes conflicting stack, theme-default, icon-family, and release-grouping requirements in the earlier master brief. Read `PRODUCT.md` and `docs/superpowers/specs/2026-10-18-medframe-django-amendment.md` before implementation. The local runtime uses Django after the verified Batch 1 cutover. Batch 2 clinical/history and verified portal work is recorded in `docs/operations/django-batch-2-verification.md`; consult its current activation state and rollback boundaries before changing infrastructure. The preserved FastAPI baseline remains available at the checkpoint; see `docs/operations/django-batch-1-verification.md` for evidence and rollback boundaries.

Django must own backend persistence, authentication, permissions, migrations, and operational administration after cutover. Preserve tenant/patient authorization, MFA, record integrity, audit behavior, and the existing patient workflows. A Django superuser is not a clinical authorization bypass.

Frontend work must also follow `apps/web/AGENTS.md` and the relevant installed Next.js guides. Use the project's established design system and shared interaction contracts; the new default is a predominantly white light-mode interface with explicit dark/system preferences.

Do not push, publish, deploy, reset the source database, or delete the checkpoint without a corresponding user instruction. Keep secrets and backups out of Git. Use synthetic records for development and tests. Report actual verification and unfinished functionality honestly.

The user's testing preference, October 19, 2026: keep verification bounded and proportional to the feature. When an issue is found, document its reproduction, impact, and evidence in `docs/operations/error-log.md`; do not attempt a fix until the user requests it. Do not turn a feature phase into repeated broad testing and repair cycles.

For Batch 3, the user explicitly requested native implementation and one testing pass only. Run the accumulated targeted checks once at the end; log failures and do not retry or fix them without a later user instruction.

The user subsequently requested Batch 3 activation, authorizing repairs to its recorded activation blockers. Batch 3 is now active locally; consult `docs/operations/django-batch-3-verification.md` for preservation/activation and `docs/operations/error-log.md` for remaining deferred issues. Keep future verification bounded.

The full-screen dental editor/point-note extension is available locally for review using `.next-dental-editor`; `.next-anatomical-dental` and tag `checkpoint/pre-dental-editor-2026-10-19` preserve rollback. Build and focused backend tests pass, but the one browser run was blocked by a dialog locator mismatch and Ruff found a test import-order issue. These are deferred in `docs/operations/error-log.md`; do not repair/retest without a later user instruction. See `docs/operations/dental-editor-verification.md` for runtime and incomplete browser acceptance.
