# Tablet editor improvements — roadmap Phase 3

User selected Phases3/4 on October20. Phase3 extends the existing editor contract.
Phase4's new display/payment contract is written separately and awaiting user
review. **No Phase4 product code, payment gate or display feed was implemented.**
Native execution; no subagents or separate chats.

## Implemented and active

Implementation76c42cd, branch codex/tablet-station-improvements, artifact
.next-tablet-editor, BUILD_ID 0CERa3TIqLXArMk_CsMhI. Source/UI rollback:
1d38391 / checkpoint/pre-tablet-station-2026-10-20 and .next-workflow-finance.
The baseline contains the Phase4 design document, not its implementation.

- Dental handles WebGL context loss and model loading failure with an honest
  fallback, preserved tooth/surface and a Continue in2D action. This opens,
  focuses and scrolls the existing selector into reach and closes a covering
  mobile inspector. RHF still owns the same clinical draft.
- Anatomy/dental share the cleaned-up one-shot context-loss listener. Anatomy
  retains its map fallback and existing save owner.
- Dental explains historical/finalized/permission/lease/locked editing states;
  mobile exposes editing feedback alongside save feedback. Anatomy has an
  always-visible editing/read-only notice. No permission/lease/provider bypass.
- Default3D, centering, exact anchors, crown/red missing illustrations, impaction
  presets and the floating disconnected assistant remain. No speculative
  React/Three/navigation rewrite or new clinical owner.

The original uncommitted clinic-shell width change remains byte-for-byte intact,
included in the artifact and excluded from commits. Private copy:
/tmp/medframe-improvements34-preserved-width.patch.

## Bounded verification

Production build/TypeScript and scoped ESLint pass. Prettier and diff checks pass.
Backend/schema unchanged; no new backend suite or migration. One previous-artifact
probe and one new-artifact confirmation; **no third browser round**.

Initial probe: five independent groups. Anatomy GPU/context-loss fallback passes.
Four dental groups stop on an incorrect accessible dialog name: Radix uses the
patient title. Screenshots show the editor. The confirmation uses its observed
data-dental-editor attribute, without changing product accessibility semantics.

| Confirmation group      | Actual evidence                                                                                                                                                                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cross-visit save/reopen | Pass. Clear/reapply a prior crown in a known writable visit; missing FDI17 and horizontal impaction FDI18 save/reopen. No disabled-control bypass.                                                                                                                                           |
| Model-fetch failure     | Pass. Intentionally aborted dental model request renders fallback and opens 2D. Its expected fetch page error is retained.                                                                                                                                                                   |
| GPU loss/save           | Fallback, Continue in2D, notes editing and native Draft saved succeed. Final reload Subjective locator stops while the dental dialog is open. A subsequent read-only native query verifies the exact synthetic SOAP marker and all illustrations; not a clean complete browser reload group. |
| Dental drawer/keyboard  | At1024 canvas size, full height, close hit test and Escape retaining parent pass. At768 close hit testing fails during a visibly fading/transformed drawer;390 not reached. Settled pointer/focus acceptance remains unproven.                                                               |
| Anatomy drawer          | Stops on an immediate1024 canvas-size comparison.390/final shared-listener GPU continuation not reached. Initial anatomy GPU fallback remains separate passing evidence.                                                                                                                     |
| Gallery navigation      | Saved visit→notes→home→walk-in→notes reached. Timestamped removeChild recurs. Final Dental selector should have been Dental chart, preventing the final return assertion. No persisted-record loss established.                                                                              |

Read-only isolated persistence: version3, context_loss_note_saved=true,
crown_saved=true, missing_saved=true, impaction_saved=true. Native
require_encounter was used; no writes or original patient records.

Unexpected navigation error: 2026-10-20T04:57:39.793Z, production React deletion
stack, first frame ui at 2nii411saqstq.js:1:108261. It does not identify the app
component. Do not claim STATION-GALLERY-003 resolved or zero browser errors.
No speculative portal repair based only on this stack.

Raw evidence: /tmp/medframe-improvements34-probe.log,
/tmp/medframe-improvements3-{build,lint,confirmation}.log,
/tmp/medframe-improvements3-persistence.json and ignored
output/playwright/improvements34/. Desktop/tablet captures inspected. Complete
phone/focus-return/settled drawer, slow-model save permutations and end-session
acceptance remain open. Older unrelated issues stay deferred.

## Actual tools and design

Graphify queried current improvements12 graphs first using verified vocabulary
for station/queue/device/dental/anatomy/canvas/ticket. Frontend797/backend591
reached at950-token budgets; direct source verified scope/lease/draft owners.
Refreshed deterministic AST:

| Corpus                  | Files | Nodes | Directed edges | Communities |
| ----------------------- | ----: | ----: | -------------: | ----------: |
| frontend-improvements34 |   373 |  1866 |           8730 |          60 |
| backend-improvements34  |   369 |  2104 |           8967 |         140 |

Refreshed queries reach611/443 nodes at650-token budgets, truncated. Frontend
app/features/components/lib excludes generated.ts; backend config/api_graphql/
medframe_apps includes migrations. Tests/scripts/docs/private/runtime/assets and
frontend proxy.ts excluded. Known partial station-entry.tsx/empty-symbol modules
remain limitations. Zero external extraction tokens. Graphs are not test proof.

Jev selected native_projection, confidence1, jev-1.13.0,408input/35output tokens;
reporting choice scoped_delivery, confidence1,436input/39output. Only generic
engineering state sent, no patient data, credentials/cookies/private attachments.
Judgments guide boundaries/reporting, not tests or authorization. Logs:
/tmp/medframe-improvements34-jev.json and
/tmp/medframe-improvements3-review-jev.json.

Impeccable used existing PRODUCT/DESIGN and Operate/craft-floor guidance directly,
retaining white/navy/teal clinical surfaces and shadcn/Tailwind. Prior failed
launcher not retried. Relevant installed Next.js client guide read. No new assets,
dependencies or AI integration.

## Preservation and local activation

Fresh encrypted checkpoint/verified isolated restore:
/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261020-130000-76c42cd;
clone medframe_django_improvements3_activation_20261020;153 tables verified,
source_written=false. Source bundle verified; backup/config private outside Git.

Original API/web/worker/scheduler stopped before fingerprint capture/check:
**all6,387 original rows across153 tables preserved**, before traffic resumed.
Private manifest improvements3-original-fingerprints-20261020.json under private
checkpoints. No migrations. Fifty-one private objects restored/verified in
medframe-review-improvements3-preservation-20261020; encrypted storage checkpoint
/home/micxsz/.local/share/medframe/checkpoints/improvements3-storage-20261020.
No clone restore over original or synthetic fixture/session import.

Root launcher starts .next-tablet-editor on web3000, API8000, worker/scheduler.
Login and API readiness HTTP200; all four services running. Original
credentials/MFA/memberships/grants unchanged; no live messaging/money, push,
publication or unrelated repair. Prior artifact retained.

Review used API8001/web3001 and isolated
medframe_django_station_kiosk_review_20261019, no review worker.

## Phase4 review boundary

Written contract: docs/superpowers/specs/2026-10-20-station-operations-completion-design.md.
It specifies an approved display-only feed, native ordering/dedup/reconnect,
opt-in number-only sound, same-visit cashier continuation and explicitly linked
invoice/due-through-today payment timing with attributed exceptions.
Roadmap Design before implementation and brainstorming written-spec review
require this review; the async question is pending. Native execution is already
selected. No Phase4 implementation plan/feed/gate/product code is claimed.

## Subsequent Phase4 status

The user proceeded after the written contract, approving native Phase4.
Implementation0a882d1 adds approved display, service-payment controls and isolated
tickets. Its evidence/activation is in
docs/operations/station-operations-completion-verification.md. Earlier pending
statements above describe the Phase3 handoff boundary, not current Phase4 status.
No Phase3 retest or unrelated editor repair was performed.
