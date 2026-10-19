# Batch 7 clinic websites implementation plan

**Goal:** Deliver the connected roadmap milestone for local clinic website authoring and publication.

**Execution:** Native in this chat; user forbids subagents and separate handoffs.

**Spec:** `docs/superpowers/specs/2026-10-20-medframe-websites-batch-7.md`.

**Architecture:** Django owns website drafts, immutable publications, domains, permission checks and public-safe serialization. Strawberry exposes authenticated editor operations. Next renders a shared structured page in the editor preview and public route; private documents retain their current owners.

- [x] Add `medframe_apps.websites` models/migration, bounded content validation, native administrator policy, versioned save/publish/unpublish/restore and domain ownership actions. Add append-only publication integrity.
- [x] Extend existing document upload/scan ownership with website images. Add public snapshot/asset/queue/domain read views without patient or clinical DTOs; test boundaries and immediate withdrawal.
- [x] Add website GraphQL query/mutation and regenerate contracts. Build focused editor files: schema/state, sections, settings/history/domains, responsive preview and explicit publish review.
- [x] Add public clinic route, metadata/sitemap and verified custom-host routing. Keep application-origin portal CTA and private authentication separate.
- [x] Run accumulated targeted tests/build/format/lint once. Inspect desktop/phone browser evidence together, log other findings and make at most one focused blocker confirmation. Refresh relevant Graphify scopes and record sanitized Jev judgments.
- [x] Commit source, stop services, take fresh encrypted checkpoint/verified isolated restore and storage check, fingerprint original rows, apply additive migrations, verify preservation and activate the new local artifact. Record actual runtime, evidence, incomplete external hosting steps and rollback boundaries.
