# Module improvement Phases 1–2 — October 23, 2026

## Delivered scope

Implements the first two phases of `2026-10-23-module-improvement-audit.md` together, with native execution and no subagents.

**Phase 1: shared reliability and identity**

- Today Dashboard retains its last successful result only in the same organization/branch during refresh and shows an updating notice. Transient failures use the existing nonblocking retry notice; rejected authorization clears retained data. The refresh button is guarded with aria-disabled rather than native disabled so keyboard focus is retained during the request.
- Removed the duplicate Dashboard branch-switch button; existing account/footer selection remains authoritative.
- Added shared SearchField with separate icon/text slots, accessible immediate clear, composition handling and a 300ms remote-search debounce for Services. Explicit Enter submits Services immediately; patient directory retains its explicit submitted-search behavior.
- Added native-history URL state for Dashboard tab, patient sort, Services tab and availability. Existing scope parameters are preserved. The existing UX contract explicitly prohibits patient names/search terms/cursors in URLs: these remain in memory, and cursor history resets on organization/branch/query/filter/sort changes. This refines the audit's broad URL-state recommendation without changing that privacy boundary.
- Added optional GraphQL portrait IDs. Directory/recent-patient projections use the existing clinical patient queryset before consulting the clean same-patient portrait map. Demographics-only readers retain initials. Encounter responses already pass native clinical/Station authorization; their portrait projection reuses that same clean map. Secure image downloads still independently authorize. Propagated IDs into directory, consultation header and anatomy header avatars.

**Phase 2: clinical continuity and presentation**

- Extracted ConsultationSaveState and ConsultationReviewSummary from editor presentation. The existing form, serialized autosave, save versions, request guards, editing leases, lifecycle transitions and immutable finalization/amendment owners remain unchanged.
- Save presentation distinguishes unsaved session-only edits, saving, saved version/time, failure, read-only and historical state. A stale loaded/saved message is hidden while edits await saving. Final review shows actual notes/diagnosis/finding/document counts as review aids; it introduces no clinical completeness gate or diagnosis requirement.
- Recent care identifies the existing saved draft with a Resume saved draft action and clarifies that a draft is not attendance evidence.
- Shared DocumentScanState explains uploading, pending, clean, blocked and unavailable files in native card/table collections. It changes neither scanning nor attachment/download authorization.
- DiagnosticProgress derives prepared/accepted/performed/result/review facts and the next responsible role from existing request fields. Referral sharing and clinician review remain distinct from patient portal publication. Cancellation and withdrawn sharing get separate next-step wording.
- Follow-ups show current-page open/overdue counts, earliest dated item, clinic-timezone due status and native status badges. Counts are explicitly page-local, not a claim about the whole patient record.
- Shared ClinicalSelectionState clarifies tooth/surface or anatomy view context, finding counts and editing versus read-only mode. A dental illustration legend explains selected/missing/crown colors. Geometry, clinical findings and AI preview behavior remain unchanged.

## Source preservation and activation

Exact prior source is privately saved under `.medframe-runtime/module-improvements12/source/`; the unrelated dirty working tree remains intact. No new migrations or original account/credential/MFA/role/grant edits were made. Only synthetic review records were added; original patient records were not edited. Existing recent verified database backups from the authorized cleanup remain preserved; this frontend/DTO batch did not create another full database/Git checkpoint.

GraphQL schema export and client generation completed. Prettier and Ruff **formatting only** were applied. No production build, automated tests, lint, typecheck or broad project-audit command ran under the user's preference.

Native local services started through `./medframe`. Final cleanup restores the exact prior Next.js configuration, including frame protection; temporary `/review-module-improvements12` routes are removed and synthetic session/user/membership/organization access revoked. Final frontend activation uses `.next-local-dev` through the root launcher, preserving the already-running API/worker/scheduler/media. No external SMS/email, online money movement, public deployment or AI connection occurred.

## Bounded browser evidence

CUA inspected native pages with a credentialless iframe and a new synthetic clinic/provider/patient set. Original browser cookies were not replaced; native responses were not intercepted or mocked.

Observed:

- Dashboard keeps Today’s patients visible during a refresh and shows updating status. Focused confirmation after the initial disabled-button finding reports `focused=true`, `aria-disabled=true` while refreshing; original disable-induced focus loss was corrected in the same bounded batch.
- Patient search finds the synthetic patient; clear restores the seven-patient list. The directory's image actually loaded (`naturalWidth=1`) from a private synthetic fixture. The one-pixel image is a transport/authorization presentation fixture, not a real portrait or a claim of scanner-pipeline acceptance.
- Patient sort adds `patientSort=name_desc` while preserving clinic/branch parameters. Services returns the seeded catalog entry, clears search and records `serviceTab=patients` in the URL. The phone service search contains no patient/search text in URL state.
- Patient overview Resume saved draft opens the native encounter. The dirty state appears after editing SOAP; existing autosave succeeds. Mark completed produces saved version 3 and the final review summary. The patient record subsequently displays the exact synthetic note and Completed status. No finalization or amendment was performed.
- Dental selection/legend and the existing model-unavailable/2D fallback are visible. The review browser has WebGL disabled: four logged renderer/handled-boundary errors concern context creation. There is **no successful interactive 3D rendering claim**.
- Patient Documents shows three native seeded scan states: clean, pending and unavailable, with the expected explanations and access controls. An encounter’s attachment-only tab correctly showed zero files because these fixtures were not attached to that revision.
- Native treatment page shows two open follow-ups, one overdue, with written dates and page-local wording.
- Native diagnostic request shows the actual awaiting-center progress and patient/clinic selection next step, without implying portal publication.
- Phone Services, Documents and Diagnostics report document content width equal to 375px viewport width. Existing document table scrolling remains local. Desktop and phone evidence was captured; this is a scoped review, not all-route responsive acceptance.

Initial inspection plus one focused correction confirmation only. A stale status message was also corrected in source in that batch; its post-correction dirty-state rendering was not separately re-exercised. No broad retry/polish cycle followed.

Private screenshots:

- `module-improvements12/dashboard-desktop.png`, `dashboard-phone.png`
- `module-improvements12/services-desktop.png`, `services-phone.png`
- `module-improvements12/consultation-desktop.png`
- `module-improvements12/documents-desktop.png`, `documents-phone.png`
- `module-improvements12/followups-desktop.png`
- `module-improvements12/diagnostic-desktop.png`, `diagnostic-phone.png`

All are under `.medframe-runtime/`.

Not exercised: demographics-only/cross-clinic portrait denial, concurrent grant revocation, failure injection during same-scope refresh, multi-page cursor traversal, Back/Forward and reload permutations, IME device-level interaction, inactive-panel resource measurement, anatomy interaction, 3D geometry, scan execution/retry, diagnostic result submission/review/release, finalize/amend races, and a physical Station-device handoff. Existing backend owners are reused; this evidence does not newly validate those boundaries.

## Tooling evidence

Graphify queried the existing audit graph first for PatientDirectory/Consultation/useDailyWork/PatientAvatar: 548 nodes overall; 19 nodes/19 edges returned in full, despite the requested 500-token budget. Then refreshed a source-only corpus of **25 changed source files** (excluding generated clients): **202 nodes, 459 edges**. Query `authorized_portraits useDailyWork ConsultationSaveState SearchField` found 93 nodes, showed 8/cut 85 under 300 tokens. Scope is changed-file AST relationships, not full-project/runtime proof.

Jev received sanitized scope and authorization choices only. It selected keeping native clinical portrait scope, same-clinic refresh retention and memory-only private search: confidence 1.0, `jev-1.14.0`, 409 input/34 output tokens. No credentials, patient information or private attachments were sent.

Impeccable and Frontend Design Premium guided the Operate-mode refinement; DESIGN.md identity and existing shared primitives were retained. UX-CONTRACT.md records the new shared helpers and the existing authorization/privacy boundaries. Automated skill audits/build/test defaults were not run because the user's explicit visual-only preference takes precedence.

Final activation note: the first bounded port-release wait elapsed with no listener; a subsequent native launcher start succeeded after release. No unmanaged process was terminated. Original frame protection and review-route removal were confirmed before final handoff.
