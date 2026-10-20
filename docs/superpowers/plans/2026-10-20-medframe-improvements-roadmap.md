# Medframe improvement plan

**Purpose:** Make the implemented clinic workflows dependable, easier to use and cheaper to verify before adding another large subsystem.

**Status:** User approved native implementation of Phases 1 and 2 on October 20, 2026. Implemented together in `48d6bb0`; see `docs/operations/workflow-finance-improvements-verification.md` for activation and staged evidence. Template-application browser acceptance and print pagination remain recorded follow-ups. Phases 3–5 remain proposals. No subagents or separate chats.

**Baseline:** `395fafc`, active `.next-batch8`, original Django database. Preserve existing data, accounts/MFA, role/patient boundaries and the user's uncommitted clinic-shell width change. Existing Batch8 scope/spec and phase verification records remain the sources of implemented behavior.

## Recommended sequence

| Phase                                    | Priority | Connected outcome                                                                                                                          | Relative size | Entry condition                                                                |
| ---------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ------------------------------------------------------------------------------ |
| 1. Finish the daily workflows            | First    | Services, specialty templates and clinical exports can be demonstrated through their real controls, with reliable download/fixture tooling | Medium        | Review this proposed scope                                                     |
| 2. Improve financial usability and scale | High     | Long payment histories stay responsive; installments, refunds and balances remain understandable and consistent                            | Medium        | Phase1 financial workflow baseline                                             |
| 3. Refine the tablet clinical editor     | High     | Dental/anatomy editing, drawer overlays and session handoffs work predictably on supported tablet/phone sizes                              | Medium–large  | Reproduce the remaining editor findings first                                  |
| 4. Complete Station operations           | High     | A working TV queue display, clear service tickets and cashier continuation complete the one-stop device workflow                           | Large         | Write/review the Station display contract; retain existing device/queue owners |
| 5. Refine onboarding and reporting       | Next     | New clinics reach useful setup faster; reporting and website state are clearer and verifiable                                              | Medium        | Earlier daily workflows stable                                                 |

Sizes express relative scope, not delivery dates. Each phase should deliver multiple related improvements and one local activation. Choose an earlier phase if it blocks real use; the table is a recommended order, not a reason to defer a newly reported blocker.

## What the evidence actually says

| Item                                   | Current evidence                                                                                                                                             | Planning treatment                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| B8-002                                 | Browser scripts inspect attachment response text and stop before specialty/export interactions; the same-origin CSV endpoint returns a valid file body       | Correct the harness and inspect the downloaded file. Do not label the export feature broken without reproducing a product failure |
| SERVICE-CONTEXT-001 / SERVICE-PLAN-002 | Core totals and a native payment have passing evidence; later draft/void/role/portal assertions were not reached                                             | Complete the missing targeted journey, retaining earlier passing evidence                                                         |
| B4-004                                 | Current `invoice_detail` still iterates every payment and financial event; large-history runtime impact is unmeasured                                        | Confirmed unbounded serialization in source; implement bounded history without changing totals/refund authority                   |
| DENTAL-ILLUSTRATION-004                | Cross-visit crown control was disabled; the authorization/lease reason was not established                                                                   | Reproduce with a known permitted writer before any UI or authorization change                                                     |
| B6-004 / CLINICAL-AI-DRAWER-001/002    | Responsive/accessibility or geometry assertions remain partly unverified; later refinements already resolved some earlier problems                           | Check the current component and retained evidence; do not assume every historical layout issue remains                            |
| STATION-GALLERY-003                    | An earlier navigation sequence recorded a DOM removeChild error without a usable stack                                                                       | Capture the precise source/sequence first; repair only a reproducible current defect                                              |
| DEVICE-STATION-REFINE-002              | Code copy/reopen/regeneration UI assertions were not completed; backend lifecycle evidence exists                                                            | Finish that narrow device flow rather than redesigning the modals again                                                           |
| ONBOARD-004                            | Review wording/first-run presentation follow-ups and incomplete edge acceptance are recorded                                                                 | Target these specific surfaces; retain the working onboarding/invitation owner                                                    |
| B7-005                                 | Historical custom-host canonical assertion failed; current page source already has host-aware metadata, while structured business URL uses the Medframe path | Verify the current host propagation and choose a consistent URL policy before changing source                                     |
| AUTH-002 and runtime advisories        | Historical dependency/streaming/Redis findings require a current inventory                                                                                   | Triage current versions/reproduction; do not describe old counts as current vulnerabilities or force-upgrade dependencies         |

Login redirection/session recovery, reception-assisted kiosk access, separate device/code modals, default3D focus and the floating shared assistant already exist. Preserve those capabilities rather than listing them as new work. AI remains disconnected.

## Phase 1 — finish the daily workflows

**User outcome:** Existing features can be followed end-to-end without repeated setup or misleading verification reports.

**Owners:** `scripts/review/` proposed shared helpers; `apps/web/features/consultations/export/`; `apps/web/features/specialties/`; `apps/web/features/consultations/templates/`; `apps/web/features/services/`; existing native review-fixture/session helpers.

**Contract:** Product authorization and data owners stay unchanged unless a current defect is reproduced. Reuse existing session recovery and native disabled/read-only states. A failed assertion is recorded as a harness failure, an acceptance gap or a reproduced product defect, with those labels kept distinct.

- [x] Create one reusable review harness for fresh synthetic metadata, exact accessible roles, stable state waits and scoped contexts. Keep session/identity material private. Use actual fixture IDs/names rather than stale literals; type=search means searchbox, and changing modal titles require reacquiring the correct dialog.
- [x] For CSV/JSON, start the Download listener before clicking, save the Download and parse that file. Never validate an attachment with response.text. Keep this helper in the review tooling; the product download helper is not proved defective by B8-002.
- [ ] Complete one connected specialty-to-export journey: select clinic specialties, copy/edit/save a starter, apply guidance without replacing existing SOAP, open an exact saved revision, change the export selection, review/download, and prove denial after revocation. Include the reader-role exclusion.
- [x] Complete the missing service-payment branches: no invoice, proposed draft, partial/settled obligations, void history, financial-reader denial and patient portal display. Reuse the current ledger and existing successful payment evidence.
- [ ] Present concise action/loading/retry/read-only explanations only where the journey reveals a current usability defect. A missing clinical grant/provider profile/lease must lead to a permitted setup/recovery action, never an authorization bypass or disclosure of an inaccessible patient.
- [x] Record a short click path for administrator, clinician, reception and patient roles so users can find the delivered functions. Avoid providing or changing passwords as a shortcut.

**Implementation note:** Eight of nine browser groups have staged passing evidence. Specialty/starter saving succeeds; guidance application remains IMPROVE-002 because its collapsed parent prevented the final browser assertions. No recovery/authorization defect was reproduced that justified a product repair. See the phase verification record.

**Done:** Real downloaded CSV/JSON files pass their content/selection assertions; specialty prompts remain distinct from patient facts; grant-revoked exports fail; service balances/void wording are consistent; each failure has an accurate classification. No blanket full-app acceptance claim.

## Phase 2 — financial usability and scale

**User outcome:** A two-year payment plan remains understandable and fast to use after many payments, refunds and adjustments.

**Owners:** `services/api/medframe_apps/billing/queries.py`, native billing policy/calculations/installment projection, billing GraphQL contracts; `apps/web/features/billing/{invoice-detail,payment-form,installment-schedule}.tsx`; `apps/web/features/services/service-billing.tsx`.

**Contract:** Amounts, coverage and refundable balances remain computed from the whole native ledger. Paging a display must never change financial totals or remove the ability to choose an eligible original payment for a refund.

- [x] Add deterministic keyset pages for invoice payments/events, scoped by invoice/organization and permission. Plan the eligible-refund payment lookup separately so it does not depend on whichever payment page happens to be loaded.
- [x] Keep an immediately readable statement and next unpaid obligation; progressively reveal the full ledger, credits, refunds and history. Preserve the existing Due/Upcoming/Settled filters and service Manage payments destination.
- [x] Improve the payment review with explicit amount received, payment date/method, resulting coverage and remaining balance. Retain the existing acknowledgement and exact-version/idempotent posting owner; no automatic charge or silent financial-term edits.
- [x] Add a printable confirmation/receipt view for an already recorded payment, clearly identifying refunds/voids and the source entry. No printable paid receipt for a pending or unrecorded payment.
- [x] Check one long synthetic history, one partial payment, one refund reopening coverage, and one permission denial. Complete the dedicated concurrent agreement-issue case only if touching that owner; do not rerun unrelated financial suites.

**Implementation note:** Native long-history/refund/review/portal cases and confirmation content pass. Print pagination spans five A4 pages and remains IMPROVE-003; no single-page or physical-printer claim.

**Done:** Detail response size is bounded by pages; full-ledger totals are unchanged; refunds can select any eligible original payment; receipt state agrees with the native recorded entry.

## Phase 3 — tablet clinical editor refinement

**User outcome:** The clinician can select, annotate, save and return to the patient workflow comfortably on a tablet.

**Owners:** `apps/web/features/{dental,anatomy,assistant,stations}/`, shared editor sheets/headers, existing encounter aggregate and Station editing leases.

**Contract:** Preserve default3D, tooth/structure centering, existing crown/red missing-tooth illustrations, exact anchors, floating full-height assistant and the single versioned clinical draft. The assistant stays disconnected.

- [ ] Reproduce the retained gallery→notes→home→walk-in→dental DOM-error sequence with timestamps/stack capture; avoid speculative React/Three rewrites.
- [ ] Check supported tablet/phone canvas bounds, drawer edge placement, visible close/save/end controls and keyboard/focus return. Fix only the current reproduced overflow/occlusion, preserving shared component behavior elsewhere.
- [ ] Make selected tooth/surface/structure and the active editing state unmistakable. Explain when a record is historical, a lease belongs elsewhere or a provider setup is missing. Never enable a disabled crown control by bypassing the native write owner.
- [ ] Complete the cross-visit crown/missing/impacted state save-and-reopen check under a known writable lease. Distinguish saved current state from historical findings.
- [ ] Check one slow/failed model fetch and one GPU/context-loss fallback while saving the same clinical draft. A fallback must not erase notes or claim that unavailable geometry loaded.

**Done:** The supported viewport set has reachable controls, preserved draft/selection and a working native save/reopen path; reproduced navigation errors are resolved or remain explicitly documented. No claim of anatomical/clinical validation.

## Phase 4 — complete Station operations

**User outcome:** Reception, the clinician tablet, the patient kiosk and the TV provide a coherent journey with no repeated normal-mode verification.

**Owners:** Existing Station devices/pairing, visit/stage owners and operation queues; `apps/web/features/stations/station-entry.tsx`; the existing live/public-safe queue transports where suitable. The current display mode still shows a next-phase placeholder.

**Design before implementation:** Define a dedicated display-safe DTO and supported device/branch access, reconnect behavior, ordering, retention and optional sound policy. This is a new subsystem, so that contract must be reviewed before implementation.

- [ ] Implement the paired read-only TV display: currently called numbers, room/counter, upcoming numbers, time and explicitly authored announcements. Reuse native queue/priority order; reveal no patient names, records, reasons or financial details. Do not duplicate the queue engine.
- [ ] Add call/recall/skip/transfer/complete updates and an honest disconnected/stale indicator. Sound/speech is opt-in and may require an initial operator gesture; speak queue numbers/counters only.
- [ ] Finish the device code lifecycle UI check: current code visible when retrievable, copy, reopen/reload, regenerate and hide after consumption/revocation. Preserve separate Manage/code modals and existing encrypted-code handling.
- [ ] Finish print-friendly service tickets and cashier continuation in the same visit. Staff-assisted and customer-facing identity entry remain distinct; normal reception-selected sessions do not gain repeated codes. Strict mode retains its explicit repeated-verification policy.
- [ ] Define configurable payment-before/after-service behavior with auditable staff exception rules before implementing a hard gate. Queue-stage completion must never finalize clinical notes or fabricate payment.

**Done:** An approved display device receives only the allowlisted branch feed; reconnect preserves correct current order; reception/kiosk/cashier transfer preserves one visit and clear next steps. Browser print layouts are not claims of physical printer/cash-acceptor validation.

Live digital payments are a separate integration: choose a provider and environment, design idempotency/webhook verification/reconciliation/refunds, then approve the contract. Do not connect a live provider or accept cash hardware merely to complete this display phase.

## Phase 5 — onboarding and reporting refinement

**User outcome:** Clinic setup and reporting explain what is ready, what needs attention and what the figures mean.

**Owners:** `apps/web/features/onboarding/{review-step,workspace-preview}.tsx`, existing setup checklist/dashboard, analytics/finance projections, `apps/web/features/websites/`, public metadata/proxy owners.

- [ ] Replace machine-style provider ranges and over-capitalized review text with readable labels; make the actual clinic name/logo/admin/specialty summary consistent. Improve the first-run dashboard using the existing checklist rather than duplicating empty metrics.
- [ ] Improve specialty/template discovery with readable active/legacy labels and clear unsaved/save feedback; retain generic guidance when a clinic has no selected starter. Do not add clinical advice or automatically alter provider credentials.
- [ ] Add custom reporting ranges only after agreeing a bounded range/timezone policy; keep current-balance snapshots separate from period flows, exact tables available and currencies distinct. Do not introduce clinic/provider revenue attribution or collection-rate denominators that the ledger cannot support.
- [ ] Recheck verified custom-host propagation and choose consistent canonical/OpenGraph/structured-data URLs. Current metadata already has a host-aware branch; reproduce the reported mismatch before editing it. No real DNS/TLS/public publishing changes without the relevant user request.
- [ ] Inventory current dependency advisories and reproduce streaming/Redis warnings separately. Prefer minimal supported fixes with affected-flow checks; no blanket package upgrades or new tracking services.

**Done:** A new clinic can understand its setup summary and next action; report periods and snapshots are explicit; verified-host behavior matches the chosen policy and preserves private-route denial.

## Verification and activation budget

This roadmap is not permission to spend multiple phases on a broad test campaign.

1. Inspect the current source and relevant retained evidence before editing. Resolve historical/resolved status before assigning work.
2. Accumulate targeted checks once per implemented phase. Reuse earlier passing backend evidence when that owner is unchanged.
3. Use small independent browser groups so a CSV/harness failure does not prevent recording unrelated specialty/editor results. Each group reports its own pass/fail/unexecuted status; no hidden retries and no false aggregate pass.
4. One batched browser pass across the relevant desktop/tablet/phone surfaces, then at most one focused confirmation. Save/read attachment files, use current fixture metadata, wait for committed UI states and avoid stale title/text assumptions.
5. Log unrelated findings and stop rather than starting another repair loop. New reproduction does not by itself authorize unrelated source changes.
6. Each implemented phase ends with the established fresh encrypted checkpoint/isolated restore, preservation checks, only necessary additive migrations and local activation. Documents-only planning does not require stopping or rebuilding the active app.

## Later proposals requiring their own decisions

- **AI assistance:** provider/model, approved context, transmission policy, clinician review and retention must be selected. No connection is included in this plan.
- **FHIR/HL7/DICOM or vendor EHR exchange:** choose the destination/implementation guide and mapping/identity/import policy. Native JSON does not establish conformance.
- **Live messaging/payments, real domains and production release:** require the corresponding explicit operational instruction and selected service. No passwords/MFA/roles, external messages, money movement or public deployment are authorized by this planning request.

## Planning evidence and next action

Read-only review of current error/activation records and relevant source, including current session recovery, the existing download helper, unbounded invoice detail and host-aware website metadata. No new browser audit, test suite, runtime change, product repair or database mutation was performed for this planning request. The user's width edit remains untouched.

Graphify queried the existing current Batch8 graphs first using actual vocabulary: download/export/session/station/lease/payment/editor. Frontend1,838nodes,607reached/28shown at700tokens; backend2,087nodes,630reached/31shown at750tokens, both truncated. Graphs cover scoped code, excluding tests/docs/private/runtime/assets and frontend proxy.ts, and do not replace authorization or establish every relationship. No graph refresh was needed because this pass changes only documentation; zero external extraction tokens.

Sanitized Jev selects finish_existing over external_expansion, confidence1.0, model jev-1.13.0,480input/36output tokens; CLI/auth status succeed. It received only generic implementation/evidence state, no patient information, credentials, private attachments or original database content. This supports prioritization, not proof or authorization. Local logs: `/tmp/medframe-improvements-{frontend-graph,backend-graph,jev}.*`.

**Current next action:** Review the Phase1/2 verification record and logged follow-ups. Select later scope explicitly; this implementation does not authorize Phases 3–5.
