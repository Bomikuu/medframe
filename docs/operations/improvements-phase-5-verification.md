# Phase 5 — Financial decisions and installment clarity

October22,2026. Native implementation of the next authorized improvement-roadmap phase. No subagents, builds, automated tests, typechecks, lint suites or benchmarks. Prettier formatted supported sources; Ruff formatted Python. This is a read/presentation refinement using the existing ledger and mutation owners, without a new payment connector or money movement.

## Implemented

- Dashboard retains operations first, financials second, completed-clinic-day comparison charts and exact-data alternatives. Issued-period invoice navigation uses issued dates, not invoice creation or payment dates. Current outstanding/due/overdue/future actions retain the authorized branch/currency, carry the report context separately, and leave invoice dates unrestricted for current balances.
- Invoice-specific filters validate balance timing, date basis and currency. Tenant/branch scope is applied first. The native obligation projection selects matching issued invoices before pagination; a final invoice due date is never used as a proxy for overdue installments. Cursor binding includes the typed criteria. Existing record-filter callers retain the created-date default; only the optional internal field argument was added. Matching invoice lists show whole-invoice balances, rather than only the selected obligation bucket.
- Billing exposes created-versus-issued date controls, current balance meaning, URL-backed drill-downs and clearing. A report-linked Billing view can release its inherited period using Change comparison period. Patient-profile embedded invoice collections retain local filters and existing patient/read-only behavior.
- Existing JSON BillingPreview now returns an optional installment preview using the original integer `draft_totals` and `build_schedule`. It creates no invoice/case/obligation. A missing case ID is accepted only for preview arithmetic; native Save/Issue still validate service/case ownership, snapshot/version and agreement digest. Financial-patient and billing.manage scope remain required. No GraphQL schema operation signature or migration changed.
- The preview shows proposed total, deposit, financed amount, regular/final monthly amounts, first/final dates and the complete proposed schedule. A response is displayed only while its input fingerprint matches current form fields. Server month-end and final-remainder rules are reused, not duplicated in browser floating-point arithmetic.
- Shared written DateInput now renders invoice/installment dates. Draft statements say Proposed draft total and explain no payment is due before issue. Issued/void wording remains distinct. A permitted linked invoice can navigate to the native patient's Services section. Service payment context separately labels recorded payments, returned refunds, net received and current obligations.

No issue/payment/refund/credit service, permission rule, authentication policy, ledger allocation algorithm or existing agreement-confirmation owner was replaced.

## Preservation and setup

Fresh encrypted checkpoint `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261022-231706-a89bd41`; isolated clone `medframe_django_phase5_20261022_a27bd9` restored/verified167 tables, source_written=false. Exact pre-edit sources/configuration are in ignored private `.medframe-runtime/improvements-phase5-source`. The original clinic-shell width snippet and unrelated dirty changes remain untouched.

One new synthetic clinic/user/membership, two branches, patients and service catalog/cases supported native draft, partial installment, overdue and settled invoice fixtures. Native catalog/case/invoice/issue/payment services prepared these records; no original clinic or account was modified. A fixture-local patched clock supplied a historical issue/payment date for the overdue comparison case, not an application clock change or test suite. Native issue digest confirmation was fixture preparation, not evidence of human agreement review. All ledger entries are synthetic records of fictitious settlement; no external money moved.

The existing backend group was restarted through `./medframe` for the read-only Python changes. Its migration readiness check applied nothing. Temporary localhost-only review routes opened actual product routes in credentialless iframes with a fixture-prepared staff assurance session; this does not prove real MFA completion. User browser credentials were not replaced.

## One bounded native visual pass

Desktop1280×900, phone390×844 and tablet768×1024 were sampled in one connected review pass. No extra product repair/retest loop followed the later recovery failure.

- Dashboard displayed historical period issued value₱1,000/payments₱250 and separate current outstanding₱110,750.01/due₱10,750/overdue₱750/future₱100,000.01. Existing graph/date comparisons remained. The issued-period link opened the one historical issued invoice with partial balance₱750, proving this path used its historical issued date despite current creation. Currency/branch/report context were visible in the native link/controls.
- Current overdue navigation cleared invoice date bounds and retained the report period separately. It returned the matching partial invoice and₱750 whole-invoice balance. Clear filters restored the issued/settled/draft list. Phone document client/scroll widths were375/375; the edit dialog measured375px wide within its390px viewport, with a359px scroll content area.
- Existing draft review displayed a proposed charge and zero amount due before issue, with Issue disabled until native acknowledgement. The native Edit invoice draft form showed written deposit/first-month dates. Calculate on server produced total₱120,000.01/deposit₱20,000/financed₱100,000.01/regular₱4,166.66/final₱4,166.83 for24 months. Expanded schedule showed January31→February28→March31, retaining the anchor day. The existing saved schedule also showed February29,2028 and final December31,2028.
- Changing the deposit to zero removed the prior preview and displayed Fields changed. Recalculation showed financed₱120,000.01, regular₱5,000 and final₱5,000.01 with24 proposed payments. Native Save draft succeeded; the refreshed saved schedule showed the24 zero-deposit monthly rows and final₱5,000.01. No browser Issue or payment action was submitted. Screenshot: ignored private `.medframe-runtime/improvements-phase5-installment.jpg`.
- Issued installment details separately showed charge₱120,000.01/payments₱10,000/refunds₱0/outstanding₱110,000.01 and the native obligation schedule. Patient services navigation opened the correct patient's Care & billing→Services list. Its expanded service-payment panel was not sampled.
- A later direct return to Billing displayed This record is unavailable. The page console sample had no errors. Read-only fixture inspection confirmed clinic/user/membership active and ClinicalSession present/unrevoked/unexpired; this does not establish the cause or close the failure. No retry/repair loop was attempted. Future-filter and empty-branch checks were not completed. See IMPROVEMENTS5-001.

Remaining acceptance: browser Issue/acknowledgement submission, genuinely new uncreated-case preview, actual refunds/credits and service-payment-panel rendering, zero/empty branch, future-only filter, denial/revocation/cursor races, arbitrary delayed preview response, full dark/custom themes/keyboard and high-volume behavior. Due filters reuse the native projection across all scoped candidates before paging; no query-volume/performance benchmark or broad financial/security acceptance is claimed. No builds, automated tests or live financial transactions.

## Graphify / Jev / design

Initial existing root query `graphify query 'FinancialOverview AnalyticsPage InstallmentEditor ServiceBilling InvoiceForm' --budget 1000` used the stale1150-node graph; only InvoiceForm matched,165 found/30 shown/135 cut. Source inspection governed newer relationships.

Refreshed local AST-only corpus:22 relevant files,184 nodes/430 edges. Query `graphify query 'InvoiceForm InvoicePreview invoiceListHref draft_preview filter_current_balance BillingRecordFilter' --budget 1000` found150/shown30/cut120. This is limited source coverage, not runtime proof; no LLM/private attachment extraction.

Jev CLI0.7.0 auth-status returned ok:true without exposing its key. Sanitized choices compared reuse of native schedule/projection owners with browser arithmetic/final-due-date approximation. Modeljev-1.14.0 selected native, confidence1.0, usage422 input/31 output. This is prioritization, not verification. No patient information, credentials, ledger records or private attachments were sent.

Existing Impeccable context had failed earlier in this session; it was not rerun. Product/design context and clarification/craft-floor guidance were read directly. Existing navy/teal/white tokens, grouped fields, written dates and native identity components remain the visual authority.

## Cleanup / activation

Final fixture deactivation, review-route/config removal and launcher readiness are appended below. No schema/migration/original credential/MFA/grant/private-storage changes, public deployment, live payment, email/SMS or AI integration.

Synthetic ClinicalSession revoked; only the exact synthetic user, membership and clinic were deactivated. Their fictitious ledger/audit records remain; no original data was deleted. Review metadata expiry is zero. Temporary `app/review-phase5` routes were archived privately and removed; `next.config.ts` exactly matches its saved pre-phase bytes. The browser review tab was closed and viewport override reset.

`./medframe stop --only frontend` and `./medframe start --only frontend --dist-dir .next-local-dev` completed. Launcher reported Ready at http://localhost:3000 with API http://127.0.0.1:8001. Final lifecycle status: web745764, API717815, worker717984, scheduler717985, media717986 running; local DB/Redis/mail/scanner healthy and storage running. Unrelated port8000 was untouched. No new browser pass followed cleanup.

Phase5 implementation is active with partial acceptance and IMPROVEMENTS5-001 deferred. Roadmap/status/UX instructions reflect that boundary. Phase6 remains pending. Rollback requires restoring only the privately saved Phase5 product sources/removing its new product files, respecting all other dirty work, then restarting the corresponding native services; no database restore or migration rollback is needed for this schema-free refinement. Source rollback would not remove the retained synthetic review ledger/audit records.
