# Medframe Batch 4 — Financial communication design

Status: approved by the user’s “proceed implementation”; implemented and active locally after the user’s subsequent “activate” request. The original failed pass, authorized repairs, preservation and passing focused confirmation are recorded in `docs/operations/django-batch-4-verification.md`. Execution remains native in this chat, without subagents. The user requested the next connected batch after the application-wide visual reconstruction.

## Intent and acceptance

Deliver the Django Edition's Batch 4 as one joined milestone: consultation/procedure charges, invoices, payments and partial payments, discounts, refunds and outstanding balances, plus authorized notifications, SMS reminders and follow-up coordination. A receptionist can prepare an invoice and record a real payment; an administrator can correct it through attributed financial events; the verified patient can inspect their issued statement; an authorized user can schedule, inspect, cancel or retry a reminder without exposing clinical content externally.

Preserve all current accounts, MFA, clinical history, grants, portal links, schedules and UI customization. Financial actions never edit, complete or finalize a clinical record. The new visual system remains authoritative. Existing deferred UI and dependency issues are outside this batch.

Sources: `docs/requirements/medframe-django-edition.txt`, sections 21 and 30; `docs/superpowers/specs/2026-10-18-medframe-django-amendment.md`; `docs/operations/visual-reconstruction-verification.md`.

## Approach

Use two focused Django apps, `billing` and `communications`, within the existing modular monolith. Domain services own authorization, validation, transactions, idempotency and audit. Strawberry adapters and generated frontend operations expose explicit actions. Existing Celery/Redis handle scheduled dispatch. Existing in-app notifications and treatment follow-ups are extended rather than replaced.

This is preferred over embedding financial tables into encounters: clinical immutability and finance corrections have different lifecycles. A third-party accounting/payment platform would add an account, costs and external data transfers that were not requested. Batch 4 therefore records cash/bank/manual payments; it does not charge cards or move/refund money through a gateway. Every payment/refund form says that explicitly. SMS uses a configurable provider adapter; local preview is the default and external delivery stays disabled until configured and deliberately enabled.

## Financial records and calculations

Default currency is PHP, reflecting the master specification. This batch uses one currency per clinic ledger; currency cannot be changed once financial records exist. Store integer minor units, exchange decimal input as strings and reject more than two decimal places. Never calculate persisted amounts with JavaScript floats or accept client totals.

- `BillingSettings`: organization, currency, invoice prefix, version.
- `Invoice`: organization, branch, patient, optional encounter reference, draft/issued/void lifecycle, unique organization invoice number assigned at issue, due date, version, creator and issuer/time. Draft identity is stable before an invoice number exists.
- `InvoiceLine`: invoice, ordered description, consultation/procedure/other charge type, whole quantity, unit amount; optional source procedure ID explicitly selected by a clinically authorized user. The issued description/price is a financial snapshot, not a live clinical text join.
- `FinancialEvent`: invoice, actor, event type, request key, event time, reason, minimal structured payload. Issuance snapshots and subsequent events are append-only and protected from raw Admin edits/deletes.
- `Payment`: invoice, positive amount, method (cash/bank transfer/other), external reference if applicable, recorded paid date and actor. It represents staff-confirmed receipt, not an attempted online transaction.
- `Refund`: references the original payment, positive amount, mandatory reason, actor and date. Total refunds cannot exceed that payment. Recording a refund confirms money was returned elsewhere.
- `CreditNote`: invoice, positive adjustment, mandatory reason and actor. This reduces a charge without modifying the issued invoice; cumulative credit cannot exceed the issued amount. Credits are needed when a refund also cancels some or all of the original charge.

Draft editing supports at most 100 lines, quantities 1–999, nonnegative unit amounts and either a fixed invoice discount or a percentage discount of 0–100%, never both. Percentage discounts use decimal half-up rounding once against the subtotal. Reject an amount/total above PHP 9,999,999.99. Discounts cannot exceed subtotal. Issue requires at least one positive charge, a valid scoped patient/branch, a due date not before issue date and a positive net amount. A fully discounted draft remains an unissued draft rather than an invented paid invoice.

Authoritative values:

- subtotal = sum(quantity × unit amount).
- issued amount = subtotal − discount.
- adjusted charge = issued amount − credits.
- net received = payments − refunds.
- outstanding = max(adjusted charge − net received, 0).
- refundable credit = max(net received − adjusted charge, 0).

Refunding money alone reopens the outstanding balance; a credit note cancels the charge. The UI previews both effects explicitly. Payment status (unpaid/partial/paid/refund due) is derived, not directly editable. Reject overpayments above the current outstanding amount. A credit note may create refundable credit; it does not silently invent a cash refund. Void is allowed only with no payments, refunds or credits and requires a reason. Other corrections require a credit/refund and, if needed, a replacement invoice.

Example acceptance: consultation PHP 500 + procedure PHP 1,200 = PHP 1,700. A PHP 200 discount gives PHP 1,500. Record PHP 500: PHP 1,000 remains. Replaying that request cannot record another PHP 500. A PHP 300 refund increases the balance to PHP 1,300 unless a separate credit cancels the charge.

Every mutation uses an expected invoice version, a stable UUID request key, and a transaction locking the invoice before checking aggregate values. Refunds also lock their payment. Replays reauthorize before returning the original result; changed payload under the same key conflicts. A unique clinic counter protects invoice numbers. Database checks, tenant/reference guards and append-only triggers supplement service rules. No hard deletion or raw Admin financial editing is provided.

## Access boundaries

Add explicit membership permissions through an additive migration that updates existing roles without replacing their permission sets:

- Clinic administrator: `billing.read`, `billing.manage`, `payments.record`, `billing.adjust`, `communications.manage`.
- Receptionist: `billing.read`, `billing.manage`, `payments.record`, `communications.manage`; no credit/refund permission.
- Doctor/dentist: existing clinical follow-up access; financial roles are not inferred from a clinical role. An administrator can explicitly grant financial authority through the existing role mechanism.

Every staff operation requires a live staff session, active clinic membership and permitted branch. Staff billing screens expose demographics and explicit financial descriptions, not SOAP, medical history, diagnoses or unrestricted procedure history. Optional clinical source selection still requires current clinical patient access and matching clinic/patient/encounter. Administrative finance access never grants clinical access.

Patient statements use the patient realm and the live verified PortalLink, including existing guardian relationships. Only issued records, payment/refund/credit history and calculated balances for that exact connected patient are visible. Drafts, staff-only reasons, internal audit details and other patients are excluded. Revoking a link immediately removes access. A statement is an application record; this batch makes no tax-invoice, accounting-certification or compliance claim.

## Notifications, reminders and follow-ups

Keep existing clinical `FollowUp`/`FollowUpRevision` as the source of instructions, status and due dates. The communications app references them using opaque IDs. It never copies free-text clinical instructions into SMS.

- `CommunicationPreference`: patient and clinic, explicit opt-in per channel/purpose, verified intended recipient/contact, version, actor and confirmation time. Existing contact information is not implicit SMS consent. Staff must confirm who receives messages and record consent; no emergency/guardian number is automatically substituted. Portal users can revoke delivery to themselves. Recipient changes invalidate pending deliveries until reconfirmed.
- `Reminder`: clinic/branch/patient, appointment/follow-up/invoice source, source version, due timestamp, supported template key, chosen channel and lifecycle. Source references are validated and deduplicated per reminder kind/time/version.
- `Delivery`: reminder, attempt count, due/retry time, state, provider reference, sanitized error code, lease and cancellation state. Recipient/template variables are encrypted at rest where needed. Persist no credentials, medical text or raw provider errors in job logs.
- `DeliveryEvent`: append-only transition/attempt/audit evidence. Celery payloads contain IDs only.

Templates are fixed, bounded and privacy-minimal: a clinic appointment reminder, a request to contact the clinic about a follow-up, and a request to sign in to view a billing update. No patient name, procedure, diagnosis, free-text instruction, invoice amount or medical document appears in SMS or push-style notification previews. Appointment times are displayed using the clinic timezone. Follow-up and balance details remain behind authenticated pages.

Staff can create an explicit reminder from an appointment, invoice or existing follow-up, choose time/channel, preview the exact safe message and cancel it. A clinic setting can enable appointment reminders 24 hours before a future booking and follow-up reminders at 09:00 clinic time on the due date; defaults are off. Past trigger times are skipped rather than sent in a burst. Billing notices are explicit actions, not automatic debt chasing. Recipient opt-out, cancellation, settled invoice, completed/cancelled follow-up or rescheduling suppresses stale work at dispatch. Rescheduling invalidates the old reminder and schedules at most one eligible replacement.

In-app notifications identify event type/time and an authorized target route. Resolution rechecks live permissions; a retained notification cannot restore revoked access. Support pagination, unread filtering, per-item and bounded bulk read actions. No fabricated unread counts.

## Delivery and external service behavior

Use a preview transport for development, visibly marked **Preview — not sent**, and a Twilio SMS adapter for configured deployments. Keep provider credentials server-side in environment settings. No new credential is requested in chat or committed. No real SMS/email is sent during implementation or verification. Existing authentication/invitation mail behavior is retained independently.

The worker claims due rows with row locks/leases, commits the claim and then performs bounded network I/O outside the lock. Before dispatch it rechecks current source, authority, consent and confirmed recipient. Pre-dispatch cancellations prevent submission; cancellation after provider acceptance is recorded as too late to recall. Do not imply that an accepted message was recalled.

Outcomes distinguish preview, scheduled, sending, provider accepted, delivered, retryable failure, permanent failure, unknown and cancelled. Provider acceptance alone is never called delivered. A signed provider status callback is validated against the configured public callback URL and correlated by provider message ID; invalid callbacks are rejected and duplicates are idempotent. Without a configured callback, accepted remains accepted.

Retry only known pre-acceptance transient failures with capped exponential backoff and at most five attempts. An ambiguous network timeout may have accepted a message; mark it unknown, require reconciliation and do not automatically submit another SMS. Staff retry keeps the same logical delivery, rechecks eligibility and cannot duplicate a delivered/accepted/unknown message. A preview delivery cannot later be relabeled as a real send. Logs and UI show sanitized codes and useful corrective actions.

## User interface and API ownership

Use existing fonts/tokens, Tailwind, shadcn/Radix, RHF/Zod, guarded EntrySheet, confirmations, scoped request handling and generated GraphQL client. No single large component or unformatted code.

- `/clinic/billing`: real totals for the selected branch/currency, status/search/date filters, invoice list, New invoice action. Do not present clinical revenue trends without actual data.
- `/clinic/billing/[id]`: draft line editor or issued immutable statement; totals, balance, payment/credit/refund timeline and permission-gated action Sheets. Group patient/context, charges, discount and dates; money inputs use decimal keyboard and clear PHP units.
- Patient page: Billing tab only when authorized; source buttons open the existing invoice destination with patient context. It must not require clinical access merely to bill an authorized branch patient.
- `/clinic/communications`: due/sent/failed/preview list, safe message preview, cancel/retry/reconcile explanation, consent/contact management and opt-in automation settings. Clinical follow-up instructions remain in existing clinical views.
- `/portal/billing`: issued statements/balances and payment history for the selected verified link; no online Pay button without a real gateway. Patient display preferences remain available.
- Existing notifications popover gains readable titles, dates, authorized links and per-item actions without leaking resource details into event broadcasts.

Django `billing/{models,inputs,policy,calculations,invoices,payments,queries,admin}.py` and `communications/{models,inputs,policy,preferences,reminders,delivery,providers,tasks,views}.py` own focused responsibilities. Additive migrations own permissions, financial invariants and append-only protections. GraphQL adapters live in dedicated billing/communications/portal modules composed into the existing schemas. The billing and communications frontend features split forms, tables, details and schemas into separate modules; regenerate existing contracts once the API is ready.

## Preservation and verification boundary

Baseline: `8b059fa`, tagged `checkpoint/pre-batch4-2026-10-19`; branch `codex/django-financial-batch-4`. Private encrypted checkpoint `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-094413-8b059fa` restored to new `medframe_django_batch4_20261019` with all 73 table counts matching. Original database was not written by the checkpoint helper. The historical checkpoint directory prefix is unchanged. Keep `.next-reconstruction` intact.

Implement against the clone with isolated test broker/Redis settings and disabled external transports. Review jobs must never be consumed by existing workers against the original database. Apply additive migrations to original data only for local activation after a usable result; never copy the review database over original records. Preserve new writes and take a fresh backup before activation. No push/public deployment.

Accumulate one proportional verification pass: backend tests for decimal/discount arithmetic, replay/conflict/concurrent payment/refund limits, append-only and tenant/branch/realm/link isolation, immutable issued records, consent/source rechecks, deduplication, scheduling/timezone, retry/unknown/provider callback behavior; migration application/drift; scoped Ruff and ESLint; one production build including TypeScript; and a paced browser journey for invoice → partial payment → balance → authorized refund/credit, patient statement, reminder preview/cancel and mobile forms. Use synthetic records and mocked provider transport only.

Respect the user's testing preference: log failures with reproduction, impact and evidence in `docs/operations/error-log.md`; do not enter another broad test/repair loop. If the build is blocked, keep the current working app active and report the limitation. Verification does not imply tax correctness, real card processing, real SMS delivery or clinical validation.

## Decisions for review

PHP single-currency ledger, staff-recorded payments/refunds, separate credit notes, administrator-only refunds/credits, existing verified guardian access, and preview-first SMS with configurable Twilio transport are implementation assumptions chosen from the current brief. The user approved native implementation. The completed source and verification limits are recorded in the Batch 4 operations report.

## Implementation references

Use the maintained provider SDK's signature validator against the exact configured callback URL; message acceptance and delivery are distinct provider states. Follow the official [Twilio Message resource](https://www.twilio.com/docs/messaging/api/message-resource) and [outbound status callbacks](https://www.twilio.com/docs/messaging/guides/outbound-message-status-in-status-callbacks). The conservative unknown-timeout/reconciliation policy above is our duplicate-avoidance design decision, not a claim that the provider guarantees exactly-once submission.

## Graphify and Jev design evidence

Graphify queried the existing frontend graph during Batch 4 discovery, locating the notification, follow-up and workspace owners. That graph covers frontend code only; Django financial/communication code does not exist yet and no backend graph coverage is claimed. The graph query is a navigation aid, checked against the actual Django source and master brief.

After the user's explicit request to use both tools throughout the work, Jev 0.7.0 / TypeSafe `jev-1.13.0` evaluated a sanitized design summary with mutually explicit priorities: ledger atomicity, delivery ambiguity and access scope. It selected `ledger_atomicity` with confidence 0.94 (593 input / 49 output tokens). Accordingly, the implementation plan should lead backend verification with concurrent payment/refund and replay invariants while retaining access isolation and delivery ambiguity tests. This is a prioritization judgment, not evidence that the design or future implementation is correct. No patient data or secrets were submitted. Raw output is retained under ignored `.impeccable/review/batch4/jev-design-priority.json`. The user subsequently authorized implementation; this judgment remains prioritization evidence only.
