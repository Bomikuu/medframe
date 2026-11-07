# Suggested reasons and consultation popup — October 20, 2026

Native frontend refinement adds a shared ReasonField: explicit single-choice suggestions with selected checkmarks, native keyboard-accessible radio semantics, Other revealing bounded custom text, optional clearing and existing field errors. No reason is preselected. Reason values remain ordinary strings under each existing controlled/RHF owner. Suggestions are explicit user assertions, not generated diagnoses or inferred clinical facts.

Context-specific choices cover consultation/walk-in visits, rescheduling/booking notes, queue/department operations, clinical-history changes, encounter amendments, service changes, payment exceptions, refunds/financial adjustments/voids/pricing overrides, diagnostic changes and access/release reasons. Existing required-reason gates, consent, permission checks, audit/version owners and financial confirmations remain. Optional fields remain optional; Other must contain text when the owning workflow requires it.

## Consultation popup

The existing start form is extracted to start-consultation-form.tsx and reused inside ConsultationStartDialog. Next native parallel/intercepting routes preserve the underlying clinic page when existing consultation links are clicked. Direct links also render the dialog; default/catch-all modal routes clear it elsewhere. Existing patient/provider/branch, allergy/medication context, patient-specific draft owner, unsaved guard, idempotent request ID and exact queue ticket/version linking remain. Success still opens the native encounter editor. Busy submission blocks dialog close. No second mutation path or provisional Station workflow replacement was introduced.

Native installed Next16.4 routing documentation was read before adding the slot. App clinic layout now renders the modal slot within existing protected workspace/Safety providers; no auth/permission bypass or server fetch of private records was added.

## Preservation and activation

All16 pre-existing touched source files are privately preserved under `.medframe-runtime/reason-consultation-before-20261020-220958`; new files are additive. User-owned clinic-shell width snippet remains1insertion/2deletions. No backend, migration, account, credential/MFA, original patient/data or stored reason mutation. Authored files were Prettier-formatted. No build, automated suite, TypeScript/lint run or broad repair loop, per user preference. Root launcher activates source with frontend-only restart in `.next-local-dev`; existing Django/database/worker/scheduler remain.

## One bounded visual batch

A temporary synthetic local preview imported the actual shared ReasonField. Desktop1280×720 shows all choices unselected initially, explicit selected Follow-up visit with checkmark and review of the exact selected string without typing. Other reveals Your reason; typing a custom value and reviewing it preserves that string. Phone390×844 shows wrapped touch choices/custom input with document width375 and no horizontal overflow. No private clinical data or backend mutation was involved. Preview route removed and viewport reset.

One actual /clinic/consultations/new attempt redirected to staff sign-in; current browser has no staff session. Thus authenticated popup interception/back/forward/close guard, provider/patient context, actual encounter creation, queue link, persistence and the other native reason-form saves remain unverified. Do not treat the component preview as consultation end-to-end acceptance. These limits are REASON-POPUP-001; no auth fixture/grant or bypass was used.

## Actual Graphify/Jev

Existing root graph query `NewConsultation start consultation reason`, budget600, used1150nodes and returned18of303 related nodes (truncated). Source inspection established current form/queue/draft relationships. Focused AST refresh covers24 authored frontend files,356nodes/827edges under `graphify-out/reason-consultation`. Its temporary helper lacked Python multiprocessing main-guard and printed a forkserver bootstrap error; Graphify reported parallel extraction unavailable and completed via sequential fallback with exit0. This warning is retained as tooling evidence, not a product defect or full-repository/security graph claim.

Jev choice used only generic engineering state about existing versioned reason strings, unsaved drafts and requested suggestions/popup. It selected reuse of context-specific choices and existing owner over automatic reasons/new mutation path: confidence1.0, jev-1.13.0,405input/31output tokens. No patient data, actual clinical reasons, credentials or private attachments were sent. Neither graph nor model judgment is verification. No agents were spawned or implementation/review delegated.


Activation snapshot: root launcher frontend PID3631932 serves .next-local-dev on port3000; readiness succeeded. Native Django API/worker/scheduler/database retained. Closed port3000 sockets were allowed to expire before starting; no unmanaged process was terminated. No build or extra browser round.
