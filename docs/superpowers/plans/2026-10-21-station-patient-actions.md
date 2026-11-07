# Doctor Station patient workspace

User approved the focused patient workspace and confirmed payment recording for doctors. Work
natively without agents; no builds/tests; one visual pass, local activation, log unrelated issues.

1. Reuse PatientActionsDialog with a curated Station variant: consultations, history, treatment,
   diagnostics, documents/photos, explicit sharing, permitted visit coordination and recording money
   already received. Exclude demographics/access administration, refunds/credits/invoice management.
   Service progress is read-only on Station; catalog/agreements remain clinic administration.
2. Doctor-code sessions may call only the native roots/actions needed, never administrative JSON
   actions. Current native user permissions, patient grants, source-session validity, approved device
   functions and branch checks remain mandatory. No global role/device grant or money movement.
   Retain exact-encounter legacy restrictions. Financial Station actions require an active doctor
   profile; delegated financial/operational/service reads retain clinical patient scope.
3. Add tablet patient header/photo, safety overview and scoped upcoming visits, a central action
   hub, recent patient shortcuts and guarded patient switching. Use existing record components.
   No private patient records persisted to localStorage. Show session identity/expiry/device scope.
4. Format, refresh focused Graphify AST, sanitized Jev judgment, launcher local activation and one
   synthetic desktop/phone visual pass. Authenticated native/financial/concurrent acceptance remains
   open unless observed; do not claim full permission verification or live payments.
