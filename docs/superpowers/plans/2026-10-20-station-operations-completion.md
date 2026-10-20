# Station operations completion implementation plan

Execution: native in this chat; no subagents. The user proceeded after the written
contract was presented. Existing roadmap/native execution remain selected.
Spec: docs/superpowers/specs/2026-10-20-station-operations-completion-design.md.

Goal: complete approved-device queue display and same-visit operational/payment
continuation while preserving native clinical/financial authority.

Architecture: a display-only projection over native VisitStage/QueueTicket,
versioned administrative display settings, and installment-aware stage clearance.
Next.js/Tailwind/shadcn, Django/PostgreSQL and existing Station CSRF/device cookies.

## Constraints and review focus

No patient identifiers/reasons/financial data in display DTO; fresh approval on
all polls; bounded lists; initial/reconnect audio baseline; no stale queue after
30seconds or revocation. Before-service checks cannot bypass on the native queue
screen, must ignore future principal, and cannot change payment or clinical state.
Transfer preserves one visit/active stage; tickets print without parent content.
Preserve original data/credentials/MFA and uncommitted shell width. No live
provider, messaging, AI, hardware or public deployment.

## Integrated tasks

1. Add stations display settings, department counter/payment timing and optional
   stage invoice pointer in kiosk_models.py/models.py; additive migrations include
   cross-patient/branch invoice guard. Empty/after defaults; no original seeding.
2. Add display.py: display(request) -> allowlisted snapshot from live approved
   queue.display credential. Query current local day, native ordering/dedup and
   latest call tokens; cap12/20/3. Add administrative settings action to existing
   kiosk_management.py and department fields to kiosk_services.py.
3. Add payment_policy.py: link_invoice(request,stage_id,invoice_id,version),
   clearance(stage), require_clearance(request,stage,exception_reason). Lock the
   current invoice; reuse native due projection. Serialize linked consultation
   mutations with the existing visit advisory lock before queue row locks.
   Native transition_ticket and staff_stage_action both use the same guard;
   explicit authorized exception is immutable KioskEvent evidence.
4. Add native queue recall with exact version/idempotency and attributed event.
   Existing stage recall remains; no reordering/reservation/clinical side effect.
5. Add station/display route, display snapshot hook/schema, full-screen display
   and local opt-in chime/speech with no replay. Extend Station entry and existing
   proxy/session destination for display devices. Add display-settings editor,
   department payment/counter controls and scoped invoice linking/exception UI.
   Use shared print-ticket helper to isolate printable public ticket fields.
6. Write focused backend cases for allowlist/revocation/local-day/order/dedup,
   settings/version/scope and current-due/refund/exception/direct-queue denial.
   Run accumulated targeted checks once, one independent-group browser pass and
   at most one focused confirmation. Reuse Phase3 evidence, no editor retest loop.
7. Refresh relevant Graphify scope; record sanitized Jev judgments. Commit focused
   source, checkpoint encrypted DB/source/storage, verify isolated restore and
   original fingerprints, apply additive migrations and start local production
   API/web/worker/scheduler. Record actual evidence/limits and preserve rollback.

Each step is part of one connected Station milestone, not a user handoff. Review
and source/permission tests occur natively. Necessary activation-blocker repair
may receive one focused confirmation; unrelated findings remain logged.
