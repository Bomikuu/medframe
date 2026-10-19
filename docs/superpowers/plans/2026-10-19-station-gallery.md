# Native Station gallery implementation plan

1. Preserve current source/artifact and restore isolated review DB. Add PatientPortrait pointer model/migration, using existing DocumentVersion rather than a duplicate file system.
2. Add narrow Station dashboard metadata/timing query and portrait get/select endpoints. Keep clinic/branch/own-provider operations scope and explicit clinical patient grants. Keep old exact-encounter sessions restricted and test foreign/revoked/pending boundaries.
3. Build focused dashboard data hook, clinic clock, gallery cards, status labels and agenda rail; reuse patient picker, clinical routes and doctor code control. Add circular patient-photo dialog and an image-only variant to the existing upload control.
4. Add explicit End session confirmation, cancellation and saved/unsaved copy above full-screen editors.
5. Prettier/Ruff, one accumulated targeted test/build/lint pass, batched browser checks with synthetic schedule/delay/reschedule/portraits at shipped widths. Record actual limitations. Activate locally after fresh encrypted checkpoints/restore and additive row-preserving migration; no public deployment or broad retest loop.
