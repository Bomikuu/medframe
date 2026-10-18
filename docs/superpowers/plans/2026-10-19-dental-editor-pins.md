# Dental editor and anchored notes

User direction: extend the existing dental workspace into a default 3D editor with individually accessible teeth and Figma-like click-to-place notes. Work natively, without subagents, preserve the current implementation, and run one accumulated focused verification pass. Log new issues without a repair loop.

The existing tooth/finding/consultation workflow is the implementation boundary. Keep the white/navy/teal clinical identity and shadcn/Radix controls. The editor opens across the viewport with a tooth navigator, large canvas, inspection panel and the existing draft save action. Select and Comment are explicit tools; isolate/rotate exposes individual tooth sides. The keyboard chart remains available.

Notes are finding annotations with an optional versioned asset/local-coordinate anchor, not inferred clinical surface segmentation. The existing JSON draft/revision/chart snapshots retain the anchor. The normalized ToothFinding index stores its established clinical fields, while exact JSON revisions own the complete annotation. No database schema change is required. Validate finite bounded points, supported asset identifiers and matching permanent tooth identity on the server. Old records without anchors remain compatible.

- [x] Preserve the active source and build before editing.
- [x] Extend frontend/backend finding validation and revision comparison with optional anchor metadata; preserve finalization and history.
- [x] Add numbered 3D pin popovers, a note composer, draft editing/resolution and read-only historical notes. Keep camera drags distinct from point clicks and preserve shared GLTF resources.
- [x] Make 3D the default viewport editor, with individual-tooth navigation, fullscreen return, current save state/action and responsive inspector.
- [x] Format once, run focused backend annotation/finalization tests, lint/type/build and one connected synthetic desktop/mobile save/reload journey. Log failures without repeated repair.
- [x] Record actual results and limits, maintain durable docs, commit and make available as a local review preview. Preserve the previous artifact and original data. Browser acceptance remains incomplete.
- [ ] Address EDITOR-001/002 and complete blocked browser/visual acceptance only after a later user instruction.

Actual evidence: `docs/operations/dental-editor-verification.md`.
