# Native implementation plan

One connected milestone, implemented inline as the user requested.

1. Preserve current source/build; create an isolated restored review database. Add doctor-code/session and walk-in idempotency extension tables without modifying existing clinical rows.
2. Implement doctor issue/redeem/live policy and native session boundaries; keep legacy exact-encounter restrictions. Add atomic patient-linked walk-in commit and explicit versioned same-doctor editing transfer.
3. Add device update validation and a unified device management modal, with regenerate/approve/revoke and focused field grouping.
4. Replace per-consultation tablet entry with doctor workspace entry; add own-code dialog, authorized patient chooser, complete consultation list and provisional walk-in editor using shared form/chart owners. Collect identity at save and continue into original review/finalization workflow.
5. Format and inspect changed source. Run accumulated targeted checks once; record actual results and tool limitations. Build into a new artifact and activate locally after fresh encrypted checkpoint/verified restore, additive migration and row preservation check. Repair only new activation blockers with bounded confirmations. Document actual runtime and remaining limitations.
