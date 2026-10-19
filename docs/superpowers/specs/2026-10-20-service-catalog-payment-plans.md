# Services, patient workflows and installment plans

Status: written specification approved by the user on October 20, 2026; native implementation plan awaiting review. Execution remains native in this chat, without subagents or separate chats.

## Intent and approved scope

Clinic staff need reusable service definitions so they can select a service instead of repeatedly entering its description and price. Clinics can configure an ordered workflow and an optional payment preset. Selecting a service for a patient creates a patient-specific copy of the workflow and prepares native billing. An installment preset generates a reviewable dated schedule, including a down payment where configured.

The agreed initial payment model is fixed-price PHP services, interest-free monthly installments, partial payments and early payments. Example only: a PHP60,000 braces service, PHP12,000 down payment and twenty-four monthly installments of PHP2,000. The down payment is additional to the twenty-four monthly installments. A plan specifies its deposit due date and first monthly due date explicitly; the UI shows its final payment date rather than describing a potentially ambiguous two-year term alone.

Deliver the catalog, per-patient workflow, service selection in billing, schedule generation/confirmation, due-aware reporting and patient statement display as one connected milestone. No automatic account charging, invented payment receipt, interest, penalties, recurring appointments, clinical procedure completion, live messaging or external payment integration is included.

## Existing implementation and approach

The existing Django billing owner already stores invoices, immutable issued lines, append-only payment/refund/credit entries, exact versions, request idempotency and branch/patient authorization. It calculates amounts in integer minor units. Treatment plans separately own attributed clinical work. Station departments separately configure kiosk queues. None currently provides a reusable priced service catalog or dated installment schedule.

Extend native billing with one schedule attached to one invoice. Do not introduce a second monetary ledger or create a new invoice every month for debt already included in the original invoice. The alternatives are price templates alone, which omit the requested patient plan, or a general automation engine, which adds routing/trigger machinery beyond this workflow. The connected catalog plus native schedule is the selected approach.

## Services surface and interactions

Add Services to the clinic navigation at `/clinic/services`, preserving the existing shell and the user's uncommitted width change. The surface follows the incumbent white/navy/teal system, restrained icons and existing typography, shared form controls, real shadcn components and Tailwind. Persist its Operate designation only in its surface brief.

The Services tab contains searchable active/archived definitions with category, price, branch availability, workflow-step count and a readable payment summary. An administrator creates or edits a service in a focused entry sheet with three groups:

1. Details: name, category, description, permitted branches and active toggle.
2. Workflow: ordered named steps, Add/Remove and keyboard-accessible Move up/Move down. Empty workflows are allowed. Reordering never requires dragging.
3. Payment: fixed total price, Full payment or Monthly installments, optional fixed down payment and monthly installment count. Show the remaining principal, regular amount, any final rounding adjustment and final-date explanation immediately.

Bound name/description/category lengths; allow at most forty workflow steps and one through sixty monthly installments. Require a positive fixed price within the incumbent money limits. A positive installment principal must contain enough minor units for every installment to be positive. Down payment must be less than total for an installment preset. A full-payment service has no installment fields. Zero deposit omits the deposit row.

No production services or prices are automatically seeded. Empty state explains how to add the clinic's first service. Archiving prevents new selection and preserves historical cases, invoice sources and plans. Forms provide validation, unsaved-change protection, permission errors, loading recovery, exact-version conflict recovery and disabled repeated submissions. Use toggle styling for binary controls.

Add a Patient services tab beside the catalog for authorized staff to find existing cases by patient/reference, service and workflow status. A patient profile exposes the same scoped cases through a Services panel. Financial details are rendered only for financial readers. Existing patient workflow controls remain authoritative.

## Permissions and patient scope

Django enforces native staff realm, MFA, active membership, organization and permitted branches. Catalog administration uses `organization.manage`. Catalog selection for invoices additionally requires `billing.manage`; financial reads, payments and adjustments retain `billing.read`, `payments.record` and `billing.adjust` respectively. Catalog administration grants no patient financial-read entitlement by itself.

Add service-specific `services.read` and `services.work` permissions for nonclinical patient service tracking. Add only these new permissions to existing clinic-administrator, receptionist, doctor and dentist roles through an additive migration and seed defaults; do not change existing clinical, billing, diagnostic or Station grants. Service tracking checks the same patient's organization and branch and does not return clinical notes, findings, attachments or financial amounts without their separate permissions. Custom roles receive no automatic grant.

Service definitions returned to a workflow-only reader omit price/payment fields. Workflow updates require `services.work`; registration and case creation require the same permission. Invoice linking/creation requires `billing.manage`. Catalog edits remain administrator-only. Clinical completion still requires the existing clinical owner and is never inferred from a service step.

Public websites, kiosk patient sessions, queue displays and delegated doctor-code sessions receive no new catalog/financial/workflow authority. The initial authoring and workflow surface is the regular authenticated clinic workspace. Existing device-policy checks still apply. No public service-price publication or automatic Station department replacement occurs.

## Patient service cases and workflow

Creating a case selects an actual scoped patient and an active branch-available service. Copy the service identifier/version, name, category and ordered workflow into a case snapshot. Store agreed pricing separately behind financial permissions. Later catalog edits cannot silently change the case or its financial agreement.

A case begins as active, with steps pending. Staff explicitly mark steps pending, in progress, completed or skipped; skipped and reopened completed steps require a bounded reason. Record actor, timestamp, exact case version and append-only event history. A case may be marked complete only when every step is completed/skipped, or when its zero-step workflow is explicitly completed. Completing or skipping steps never creates a Procedure, completes an encounter, books an appointment or changes a queue ticket. No diagnosis or clinical note field is added to this operational checklist.

Allow explicit cancellation with a reason; cancellation stops further workflow edits and remains visible in history. Cancellation does not cancel a bill, erase a payment or reduce debt. Show the linked invoice and require the existing authorized void/credit/refund workflow for any financial adjustment. Workflow and payment completion are separate statuses. A financially settled case can still have unfinished work, and completed work can still have an outstanding balance.

Do not allow silent case-template replacement. Editing agreed workflow structure, rescheduling an issued plan and moving cases across patients/branches are outside this initial phase. Catalog workflow entries can describe repeat visits, but no recurring appointment engine or automatic clinical completion is implied.

## Billing selection and agreement lifecycle

Add Add from services to the existing invoice charge editor. Selecting an active available service fills a server-validated description, quantity one and current unit price. Save its catalog version and an immutable source snapshot with the charge. Existing free-text/manual charges remain supported; ordinary invoices may contain multiple full-payment service lines.

Installment enrollment is deliberately one patient case, one fixed-price service line of quantity one and one invoice. This prevents ambiguous plan allocation across unrelated services. Reject a mixed-charge invoice, plan-total mismatch, foreign/archived service, unavailable branch, stale catalog version during initial selection, or a case already linked to another invoice. Existing issued invoices are not retrofitted automatically. A draft created from a service remains a draft and does not imply patient acceptance or money received.

From a patient case or invoice entry, selecting the installment preset opens an agreement review with the actual patient, service, final agreed total, deposit/date, installment count, first monthly due date, final due date and complete schedule. Staff can adjust the draft total, deposit and count before confirmation if they have `billing.manage`; clearly label departures from the preset and validate them server-side. Apply any agreed discount before generating the plan. The result must exactly match the native invoice total, with no separate interest or hidden fee.

Save draft and Issue invoice remain separate. Issuing the plan requires explicit confirmation of the reviewed terms and creates/locks the schedule in the same native transaction as issuing its invoice. For a plan invoice, set the existing immutable invoice due_date to the final scheduled due date before issue. Current due and overdue amounts use schedule rows, not that final date. Validate the deposit and first monthly due date are not earlier than clinic-local issue day; if deposit exists, the first monthly date must be later than its deposit date. Delayed draft issue requires reviewing stale dates again.

Use exact invoice/case/catalog versions, row locks and existing request-digest/idempotency behavior. Concurrent or retried confirmation must not create two invoices, two plans or duplicate case links. Reauthorization precedes idempotent replay. Preset changes after draft capture show a notice and permit explicit refresh before agreement, never silently repricing an issued invoice.

## Schedule arithmetic and financial coverage

All authoritative arithmetic stays in Django integer minor units; client previews are explanatory. Deposit plus monthly principal must equal invoice total exactly. Divide principal into the configured number of installments, use the integer quotient for regular payments and add the remainder to the final payment. Example: PHP1,000 over three installments becomes PHP333.33, PHP333.33 and PHP333.34.

Generate dates from the original selected day of month independently for each month. Clamp to the month's last valid day without drifting the next month: January31 becomes February28/29 then March31. Clinic timezone defines today; a due date is a calendar date. A date equal to today is due today; only earlier dates are overdue.

Issued schedule rows are immutable obligations, not payment receipts. Reuse native Payment/Refund/CreditNote records and invoice version locks. Do not write a duplicate cash allocation ledger. Derive the current effective schedule deterministically:

1. Apply total native credits from the latest obligation backward, reducing future principal before earlier obligations. Preserve and display original schedule amounts alongside credits/effective amounts; credits never count as cash received.
2. Apply net received money (payments minus refunds, floored at zero for coverage) to effective obligations from earliest due date/position forward. Partial coverage leaves a partial obligation. Early/extra payments cover later obligations after earlier ones.
3. Refunds reduce net coverage and can reopen the most recently covered obligations under this same deterministic order. Display this as current computed coverage, not as a claim that a historical receipt was edited or allocated to a particular month.
4. Effective remaining schedule principal must equal native invoice outstanding; any excess money remains the incumbent refundable balance. Zero-effective obligations are credited, not paid. A void invoice has no active due obligations; no-payment/credit void restrictions remain intact.

Row states distinguish upcoming, due today, overdue, partially covered, paid and credited. Summary shows total agreed, actual net received, credits, remaining balance, due through today, overdue, future balance and next unpaid due date/amount. Partial coverage can coexist with a date state; label both rather than hiding an overdue balance behind Partial.

Record payment offers the unpaid amount due through today by default; when nothing is due, show the next unpaid installment as an explicit early-payment suggestion. Allow another positive amount up to the native outstanding limit. Cash/bank-transfer/other methods and the existing already-received confirmation remain. Creating a plan or reaching a date never posts a payment. Refund/credit controls remain limited to their existing financial permission.

## Reporting, statements and reminders

Use one shared server-side projection for schedule coverage and monetary obligations. Update Billing, Dashboard financial overview/aging, patient financial summaries, invoice detail, verified patient portal statements, staff payment entry and existing kiosk own-bill summaries so they distinguish total remaining from due now/overdue/future. Non-plan invoices retain existing semantics. Counts distinguish invoices/cases from individual installments, preventing a twenty-four-payment plan from being counted as twenty-four invoices or visits.

Aging groups only unpaid obligation amounts by their individual due dates. Issued invoice totals and actual daily payment/refund comparison graphs remain native and are not duplicated by schedule rows. Future installments do not enter overdue totals. Clearly label full remaining principal as Total outstanding rather than Amount due today. Portal reads retain verified patient/guardian links and omit internal workflow history/actors and staff financial references as today.

Audit communications source selection and safe-message formatting: a plan message must identify the actual due obligation and unpaid amount rather than the full two-year balance as currently due. Do not add an automatic installment reminder scheduler or enable channels. Existing manual reminders retain consent, preview and delivery policy; suppress an amount-specific plan reminder at dispatch if its selected obligation has since been paid/credited or terms are stale, requiring fresh review rather than silently changing the reviewed message. SMS remains preview-only; no live messages are sent by this phase.

The patient kiosk can display its scoped existing plan summary but cannot establish a financial agreement, edit terms or mark money received. Staff/customer identity modes remain unchanged. Optional public website service copy is not automatically synchronized from this private catalog.

## Persistence, integrity and module boundaries

Keep service definitions/cases/workflow events in a focused native Django services app, with bounded validated snapshot data and exact versions. A versioned definition contains branch availability, ordered workflow and the optional monthly preset. Cases protect their patient/branch/source identity; case event history is append-only.

Keep installment agreements/immutable obligations in billing, attached one-to-one to the invoice and optional service case. Store the agreed source snapshot, original amounts/dates, actor/time and confirmation metadata. Draft schedule changes are allowed only before invoice issue through the owning transaction. Database guards prevent issued schedule update/delete, cross-tenant/case/invoice links, mismatched sums and duplicate case agreements. Preserve incumbent issued invoice, line, payment/refund/credit and audit guards; do not rewrite their history to accommodate plans.

Separate catalog validation/query/action code, workflow actions, schedule arithmetic/projection, billing integration and frontend catalog/editor/case/plan views into readable modules. Extend typed GraphQL operations and generated contracts; no arbitrary client-defined prices or foreign identifiers bypass validation. No dependencies are assumed necessary; inspect installed date/form libraries and Next guides before implementation.

## Bounded verification and activation

Use synthetic records in an isolated review database. Accumulate focused cases for permissions/tenant/branch/device scope, template snapshot preservation, workflow events/version/retry/cancellation, invoice selection and one-to-one agreement atomicity, cent rounding/month-end/leap dates, deposits, partial/early payment, refund/credit coverage, overdue/aging/report totals, portal isolation and stale manual reminder suppression. Test database immutability guards and concurrent/idempotent enrollment where meaningful.

Run targeted tests, build/TypeScript, scoped ESLint/Ruff/Prettier and migration drift in one accumulated pass. Inspect one batched desktop/tablet/phone browser journey across catalog creation, case workflow, braces plan review/issue/payment, financial due summaries and patient statement. At most one focused activation-blocker confirmation; no broad test/repair loop. Log unrelated findings in docs/operations/error-log.md and preserve the older deferred issues.

After implementation, standing local activation applies: preserve the source baseline and existing width edit, stop app services, create a fresh encrypted checkpoint, verify an isolated database restore and separate private storage copy, capture original-row fingerprints, apply additive original migrations only, verify original rows/objects, then start the new artifact with the root launcher. Never import review fixtures, restore a clone over original, reset credentials/MFA, push or deploy publicly. Keep the old artifact and record actual runtime/acceptance/rollback boundaries honestly.

## Planning evidence and limits

Existing Graphify corpus queried first: graphify-out/backend-websites-batch7/graph.json, 1,912 nodes. Vocabulary expansion selected actual tokens billing/invoice/payment/financial/treatment/plan/service. Query command: `graphify query 'billing invoice payment financial treatment plan service' --graph graphify-out/backend-websites-batch7/graph.json --budget 1200`. BFS depth2 reached656/showed47; output was explicitly truncated. It locates Invoice/Payment, billing queries/analytics, treatment services, policy and idempotency owners. Source inspection verifies their present behavior; the graph is not permission or arithmetic proof. No new product source exists yet, so no refresh is claimed. Refresh the relevant implementation corpora before final evidence.

Jev CLI authentication status succeeded. Sanitized architectural choice selected extending native invoices with a snapshot schedule over a parallel ledger, confidence1.0, model jev-1.13.0, 448 input/31 output tokens. Only generic architecture and requirements were submitted, with no patient information, credentials, attachments or original database content. Raw local outputs are `/tmp/medframe-service-plans-graph-query.log` and `/tmp/medframe-service-plans-jev.json`. Jev is a judgment, not verified correctness or authorization. The preliminary `graphify query --help` was interpreted as a query and returned no match; the real explicit-corpus query above is the relevant evidence. Bare `python` is unavailable; vocabulary inspection used python3 without product changes.

Impeccable's incumbent context from this session remains applicable; its earlier failed launcher is not rerun. PRODUCT.md, DESIGN.md and Operate guidance were read directly. No UI was edited during specification work, no tests/migrations were run and the existing local Batch7 runtime remains active. Review and approval of this written specification precedes a written native implementation plan under the brainstorming workflow.
