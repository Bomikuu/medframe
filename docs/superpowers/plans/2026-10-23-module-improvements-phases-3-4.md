# Module improvements — Phases 3 and 4

Native execution of the approved module audit. Preserve existing source, database, authorization, clinical aggregates, financial ledger and manual staff refresh. No builds or automated checks; use one bounded visual review. No migration is planned.

## Phase 3: operations and Stations

1. Restore appointment date/view/status/provider and queue provider filters from validated, non-sensitive URL state. Keep patient selections and cursors in memory. Preserve the visible calendar while opening booking details.
2. Explain effective schedule precedence with a current saved-hours preview and proposed override summary. Booking conflicts remain enforced by native scheduling mutations; preview is not a reservation.
3. Surface provider profile/specialty/schedule readiness under the existing staff-administration boundary, with direct schedule handoff and effective-access wording.
4. Clarify department visit continuity, device lifecycle, editing ownership and terminal timeout/connection recovery using native state. Retain separate Manage/code dialogs and identifier-only fast terminal policy.

## Phase 4: financial clarity

1. Replace approximate catalog installment wording with integer-cent illustrative allocation and an exact final installment. Distinguish catalog presets, captured service versions and issued agreements; native patient invoice preview remains authoritative for dates and allocations.
2. Add a read-only cashier day reconciliation using native scoped payments/refunds, recorded dates and methods. Any counted cash input remains local, and opening cash is explicitly separate. No accounting close or ledger mutation is created.
3. Explain invoice balance/credit/refund equations and installment allocation order alongside native amounts. Expose traceability from payments to native refund events without inventing allocation records.
4. Improve metric definitions and summary labels; compare periods and current balances retain their separate time bases.

## Preservation and verification

Save touched source privately before editing; retain all unrelated changes. Refresh a source-only Graphify corpus and use sanitized Jev prioritization. Format supported source, regenerate clients only if required, activate via ./medframe. Review synthetic desktop/phone workflows in one native browser pass; log failures and unverified boundaries. Remove temporary review routes, revoke synthetic sessions and leave normal local services active. Record actual evidence, limitations and tool usage in docs/operations/module-improvements-phases-3-4-verification.md.
