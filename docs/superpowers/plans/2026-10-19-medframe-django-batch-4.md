# Medframe Batch 4 Implementation Plan

Execution: native in this chat, without subagents. The user reviewed the written design and explicitly requested “proceed implementation.” That instruction authorizes this execution; no further per-task approval is needed. Accumulate verification once at the end; log failures without a repair loop.

**Goal:** Deliver authoritative financial records and permission-scoped patient statements together with consent-based reminder coordination and truthful transport states.

**Architecture:** New Django billing/communications apps own transactions, arithmetic, immutable history and dispatch. Explicit Strawberry adapters feed the existing generated frontend client and shadcn/Tailwind surfaces. Financial writes never modify clinical evidence.

**Tech Stack:** Existing Django/PostgreSQL/Strawberry/Celery/Redis, Next App Router/TypeScript/RHF/Zod/shadcn/Radix/Tailwind, optional Twilio SDK.

**Spec:** `docs/superpowers/specs/2026-10-19-medframe-django-batch-4-design.md` (approved by user execution request).

## Global constraints

- PHP, integer minor units, decimal strings, half-up percentage discount; maximum PHP 9,999,999.99; at most 100 lines and quantity 1–999.
- Issued invoice/lines and financial ledger are immutable; credits and refunds are separate attributed events. Explicit staff realm, tenant and branch scope; live PortalLink for patient views.
- Stable UUID request keys and invoice version checks; lock aggregate before financial decisions. No overpayments, excess credits or over-refunds.
- Consent and confirmed contact are prerequisites to reminder dispatch. Preview transport by default, no external messages during development/tests. Unknown provider acceptance cannot auto-retry.
- Preserve `.next-reconstruction`, source baseline/tag and original database; develop/migrate on `medframe_django_batch4_20261019`. Native only. Prettier/Ruff and focused readable modules.

## Review focus

1. Concurrent payment/refund and replays: test original-result replay, changed-key payload conflict, two competing payments and payment-specific refund limits.
2. Staff financial access must not grant clinical access; test different branch/clinic, patient realm against staff, revoked PortalLink and draft exclusion.
3. Issued invoice changes through raw ORM/Admin: test protected issued fields/lines, append-only events, and scoped references at database boundary.
4. Duplicate delivery after timeout/worker crash: test lease recovery to unknown, no blind retry, callback duplicates/out-of-order handling and accepted-vs-delivered distinctions.
5. Consent/source changes between scheduling and dispatch: test opt-out/recipient revision, cancelled/rescheduled appointment, completed follow-up, settled balance and timezone trigger bounds.

## Connected tasks

### 1. Financial domain and persistence

Files: create `services/api/medframe_apps/billing/{apps,models,inputs,calculations,policy,invoices,payments,queries,admin}.py` and migrations; modify settings, role defaults and Admin registration.

Interfaces: `money(value: str) -> int`, `draft_totals(lines, discount_kind, discount_value) -> dict`, `invoice_totals(invoice) -> dict`; `invoice_action(request, organization_id, action, data, request_id) -> Invoice`; `billing_setup(...)`, `invoice_page(...)`, `invoice_detail(...)` return authorized JSON.

- [x] Write `tests_django/test_billing.py`: exact example/rounding/invalid money, replay and stale version, immutable issue, payment/credit/refund/void invariants, branch/realm/tenant denial, concurrency.
- [x] Implement models, validated inputs, services and append-only/scope SQL; additive permission migration updates existing roles without replacing roles/permissions.
- [x] Staff-only manual financial actions with audit and unique numbering; bounded scoped reads and patient-safe serializers.

### 2. Consent, reminders and transport

Files: create `services/api/medframe_apps/communications/{apps,models,inputs,policy,preferences,reminders,delivery,providers,tasks,views}.py` and migrations; modify runtime/settings/URLs and operations/follow-up integration owners.

Interfaces: `communication_action(request, organization_id, action, data, request_id) -> dict`; `communication_page(...)`; `schedule_reminder(...)`; `dispatch_due()`, `schedule_automatic()`; `send_sms(recipient, body, callback_url) -> provider result`.

- [x] Write `tests_django/test_communications.py`: consent/contact, bounded templates, source checks, timezone/dedup, preview, retry budget, lease/unknown, callback signature/state and no PHI in payload/logs.
- [x] Implement encrypted preferences, versioned settings, durable reminder/delivery/event records, known safe templates and explicit preview transport.
- [x] Implement task claim/lease and bounded I/O, provider adapter and signed callback; preserve authentication mail independently. Reconcile automatic appointments/follow-ups on beat, including stale-source cancellation; no automatic billing chase.

### 3. Authorized API, notifications and portal

Files: create `services/api/api_graphql/{billing,communications,portal_billing}.py`; modify staff/patient schema composition and workspace notifications; add `apps/web/lib/graphql/financial.graphql`.

Interfaces: named billing/communications setup/page/detail queries and action mutations; patient `myBilling`, `myInvoice`, `myCommunicationPreferences` and revoke action. Cursor reads use existing signed bounded pagination.

- [x] Add realm-isolated adapters, patient-safe projections and permission-resolved notification targets; paginated unread filtering and bounded per-item/bulk reads.
- [x] Export schema and regenerate existing frontend contracts; no arbitrary clinical CRUD.

### 4. Billing and statement UI

Files: create `apps/web/features/billing/{schema,use-billing,billing-page,invoice-form,invoice-detail,payment-form,patient-billing,portal-billing}.tsx` (schema/hooks use `.ts` as appropriate); routes `/clinic/billing`, `/clinic/billing/[id]`, `/portal/billing`; modify shell/patient/portal navigation and icons.

- [x] Branch-scoped searchable invoice list, real totals, status/date filters and invoice creation with patient search.
- [x] RHF/Zod divided form for patient/context, line items, discount and due date; decimal strings and server preview; no client-authoritative totals.
- [x] Immutable issued statement, financial event history and permission-gated payment/credit/refund/void Sheets with explicit money-movement wording, pending/error/conflict and stable retry keys.
- [x] Permission-gated patient Billing tab and live-link patient statements; draft/staff-only fields excluded.

### 5. Communications UI and settings

Files: create focused modules in `apps/web/features/communications/`, `/clinic/communications` route; modify existing notifications and follow-up/appointments actions where needed.

- [x] Search/source lookup for eligible appointment/follow-up/invoice, safe reminder preview, schedule/cancel/retry with actual state and timestamps.
- [x] Consent/contact confirmation with opt-in checkboxes and proper phone input; defaults-off appointment/follow-up settings; patient revoke option.
- [x] Notification dates/links and per-item read/unread filter without synthetic counts or public clinical content. Preserve current theme and guarded forms.

### 6. One bounded verification and local release

- [x] Format changed source with Ruff/Prettier. Apply migrations only to review clone. Run one targeted Django billing/communications/notification invocation, migration drift, scoped Ruff/ESLint and one `.next-batch4` production build including TypeScript. Expected success is zero errors; log all failures without repair/retry.
- [x] If build succeeds, run one paced browser journey against isolated clone/transport at desktop and 390px: invoice/partial payment/refund-credit/portal statements/reminder preview-cancel and view screenshots. No live money/messages.
- [x] Refresh relevant Graphify scope and record honest coverage; Jev structured review on sanitized implementation summary, not patient data. Persist tool outputs/usage and actual test results.
- [x] Initially blocked by B4-001; the subsequent “activate” request authorized its additive repair and focused confirmation. Fresh encrypted checkpoint/verified restore saved; all original rows preserved; five additive migrations applied and local web/API/worker/beat activated. Never restore review DB over source.
- [x] Update verification/error log/PRODUCT/AGENTS, commit without push. Final report names delivered work and remaining limitations.

## Initial completion state (before activation)

Connected source implementation and one verification pass are complete. Build/TypeScript/ESLint and clone migrations/drift pass. Backend has 13 passing tests and seven errors at the financial entry trigger; Ruff has five E501 findings. Browser has four passing groups and one cancellation-locator failure, with payment posting deliberately skipped. B4-001 through B4-004 are logged without repair/retry. Original database and local runtime were not activated or changed. See `docs/operations/django-batch-4-verification.md` for evidence and remaining activation work.

## Authorized activation complete

The user subsequently requested “activate”. Repair `0ab67de` resolves B4-001 through an additive corrective trigger migration, wraps B4-002 literals and corrects the B4-003 harness selector. One focused confirmation passed 20 backend tests, Ruff/drift and six browser groups, including partial payment/refund/credit/reload and matching patient statements. Existing passing frontend build/TypeScript/ESLint artifacts were reused because frontend product code was unchanged. Graphify was traced/refreshed and Jev prioritized preservation using sanitized state; evidence is saved. A fresh encrypted backup/verified restore and row fingerprints confirmed all 4,475 original rows across 73 tables before resuming traffic. All five additive migrations and local web/API/worker/beat activation succeeded. SMS remains preview-only, B4-004 remains deferred, and no public deployment occurred. See `docs/operations/django-batch-4-verification.md` for actual evidence and runtime.
