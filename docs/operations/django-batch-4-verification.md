# Django Batch 4 — implementation and single-pass evidence

Date: October 19, 2026 (Asia/Manila). Branch: `codex/django-financial-batch-4`.

**State: implemented in source and built successfully, but blocked from local activation.** The existing application remains on `.next-reconstruction` at port 3000 with its prior API process at 8000. Financial posting fails at a new SQL trigger, so Batch 4 migrations were **not** applied to the original database. No repair/retest was performed after the one verification pass.

## Connected implementation

The user approved the [written design](../superpowers/specs/2026-10-19-medframe-django-batch-4-design.md) with “proceed implementation.” Execution followed the [native plan](../superpowers/plans/2026-10-19-medframe-django-batch-4.md) without subagents or additional approval gates.

- New Django `billing` app: PHP decimal-string input converted to integer minor units; bounded consultation/procedure/other line items, fixed/percentage discounts, authoritative totals, draft/issue/void, unique invoice numbers, staff-recorded cash/bank/other payments, partial payments, payment-specific refunds, separate credit notes and computed outstanding/refundable balances. Issued statements and financial history are protected by append-only/scope/amount triggers. **The shared entry trigger has B4-001 below; payment and credit posting are not usable yet.**
- Financial mutations use staff realm, active permission/clinic/branch scope, expected aggregate version, invoice locks and UUID request receipts. Clinical source references require clinical patient access; financial authority does not grant access to notes. No action changes clinical finalization.
- New Django `communications` app: confirmed encrypted recipient, explicit per-purpose/channel consent, optional verified portal recipient, versioned defaults-off automation settings, source-version/dedup checks, durable delivery attempts/events and actual states. Follow-up instructions remain in the existing clinical model and are excluded from messages.
- Preview transport is default. The optional Twilio adapter has bounded network calls, sanitized error codes, no implicit SDK retries, signed status callbacks and separate accepted/delivered states. Ambiguous timeouts/expired sending leases become unknown and are not automatically resubmitted. Actual dispatched/previewed message text is encrypted for historical inspection. No real SMS, online payment or money transfer occurred.
- Celery dispatch/scheduling tasks keep I/O outside financial/delivery locks, cap attempt counts, recheck consent/current source/current authority and suppress stale work. Appointment reminders are 24 hours before; follow-up reminders are 09:00 clinic time; both automation defaults are off. Billing reminders are explicit. Existing authentication mail remains separate.
- Staff GraphQL billing/communications queries and action mutations; separate patient-only statements/preferences/notifications with live PortalLink checks. Contracts were exported from Django and existing generated clients updated.
- New staff `/clinic/billing`, `/clinic/billing/[id]`, `/clinic/communications` and patient `/portal/billing`, `/portal/reminders`; patient Billing tab and permission-gated shell navigation. Readable Tailwind/shadcn/Radix forms separate patient, charges, dates, discounts and financial confirmations. Statement/history and delivery state are real records. Payment/refund wording explicitly describes money already moved elsewhere.
- Notifications have actual unread totals, paginated/unread views, per-item/page read actions, times and permission-resolved record links. Portal reminders support opt-out. Reminder queue changes can be refreshed with its explicit Refresh control; no realtime finance/delivery transport is claimed.

The installed SMS dependency is Twilio 9.12.0 with its locked transitive dependencies. Configuration names are `SMS_LIVE_ENABLED` (default false), `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` and optional `TWILIO_STATUS_CALLBACK_URL`. Credentials remain server-side; no new credentials were placed in the environment or Git. Live configuration/delivery was not verified. SDK/callback behavior follows the official [Message resource](https://www.twilio.com/docs/messaging/api/message-resource) and [status callback documentation](https://www.twilio.com/docs/messaging/guides/outbound-message-status-in-status-callbacks); these references do not prove real delivery.

## One accumulated verification pass

| Check                                        | Actual result                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Four additive migrations on the review clone | Passed                                                                                                  |
| Migration drift                              | Passed: no changes detected                                                                             |
| Production build including TypeScript        | Passed, `.next-batch4`                                                                                  |
| Frontend ESLint                              | Passed, zero errors/warnings                                                                            |
| Scoped Ruff                                  | Failed: five E501 findings in new notification/reminder string literals, B4-002                         |
| Targeted backend invocation                  | **20 run: 13 passed, 7 errored**, 6.705 seconds                                                         |
| Browser                                      | **Four groups passed, one failed at its final cancellation-state selector**; B4-003                     |
| Browser geometry                             | 20 captures, 1440px and 390px; no recorded page overflow, field overflow or label overlap               |
| Browser page errors                          | None recorded                                                                                           |
| Payment/credit/refund browser posting        | Deliberately skipped after the established backend blocker; no guard bypass or repeated failing request |

Backend command ran `tests_django.test_billing` and `tests_django.test_communications` once, using dedicated `medframe_django_batch4_test`, Redis DB 4, broker DB 5 and a dedicated channel prefix. The seven errors all identify `billing_entry_guard()` referencing `NEW.payment_id` while executing on a different ledger table. Tests that errored before their later assertions do **not** establish those assertions passed. Partial-payment totals, successful payment replay/concurrent posting, refund limits under real writes and credit-adjusted patient statements remain blocked.

The passing cases cover decimal validation/rounding; staff clinic/branch/clinical boundaries and receptionist adjustment denial; explicit consent/phone validation and encrypted storage; source/contact revision suppression; scheduling dedup/cancellation/immutable delivery events; preview without provider calls; unknown timeout/lease suppression; capped known-preacceptance retries; accepted versus delivered; signed callback and terminal-state dedup; private portal notification/opt-out; clinic-time follow-up automation/dedup; and financial notification authorization. Automatic appointment rescheduling/cancellation scenarios and concurrent delivery-worker claims were not exercised by these tests. This is narrower than exhaustive scope/concurrency/transport acceptance.

Browser groups passed staff MFA/billing list, server-calculated draft and issue with immutable statement/payment panel geometry, patient realm issued statements, and patient opt-out. The communications group saved confirmed consent, previewed a safe follow-up message, scheduled it and clicked/confirmed cancellation, then timed out looking for exact `Cancelled` while the badge source text is `cancelled` with CSS capitalization. Read-only clone inspection found one delivery in `cancelled` state; no selector change or second browser run occurred. The group remains reported as failed.

Screenshots inspected include staff billing and invoice views, mobile draft/payment/consent/reminder forms, communications, and patient statement/reminders. Long forms were sometimes captured at the current input-scroll position; these do not prove top-to-bottom keyboard or scroll acceptance. Narrow statement tables retain contained horizontal scrolling. The older tab-resize advisory remains applicable to the patient navigation. No exhaustive accessibility audit, full 1024/768 matrix, production deployment, live SMS, tax/accounting certification, online gateway, populated paid/refund UI or full historical clinical regression was performed. Source review additionally identified unbounded per-invoice history serialization, B4-004.

No failed test, lint rule or trigger was disabled or suppressed. No second test/build/browser attempt or post-failure product repair was made. Prettier and Ruff formatting/import ordering were applied before checks; Next's generated tsconfig formatting was normalized afterward without semantic changes.

## Graphify and Jev: actual use

Graphify first queried the existing frontend graph to locate notifications, follow-up, portal, patient, request and Sheet owners. Its bounded output was truncated, then checked directly against source. A backend graph was then added and both scopes refreshed:

| Scope          | Files | Nodes | Edges | Communities | External extraction tokens |
| -------------- | ----: | ----: | ----: | ----------: | -------------------------: |
| Frontend       |   208 | 1,150 | 4,852 |          45 |                          0 |
| Django backend |   253 | 1,607 | 6,729 |          91 |                          0 |

Frontend artifacts: ignored `graphify-out/{graph.json,graph.html,GRAPH_REPORT.md,manifest.json,cost.json}`. Backend: `graphify-out/backend-batch4/` with the equivalent report/graph/HTML and its own manifest/cost summary. Reports retain numeric community cohesion and extractor confidence labels. Backend extraction includes 669 extractor-inferred relationships; these are not asserted as proven runtime behavior. Nine backend and two frontend code files yielded no symbols. Generated frontend contracts, assets/build output and non-code documents are not a complete semantic corpus. The maps do not analyze SQL trigger semantics and did not establish financial correctness.

Backend traces include `invoice_action()` → `staff_member()` / `get_invoice()` / `replay_request()` / `check_version()` / `record_financial_action()` and `dispatch_due()` → `preflight()` / `send_sms()` / `transition()`. Trace locations/confidence are retained. An attempted CLI help query was interpreted as a query with no matches; the backend-specific trace used the documented local graph traversal fallback. A cache-root stat-index warning was retained; graph data/report were produced and no missing endpoint IDs were found in saved edges. No subagents were used for extraction.

Jev 0.7.0, authenticated TypeSafe `jev-1.13.0`, received sanitized design/implementation summaries only. Design choice: `ledger_atomicity`, confidence 0.94, 593 input / 49 output tokens. Implementation choice: `financial_workflow`, confidence 0.98, 604 input / 47 output tokens. Phase total: **1,197 input / 96 output tokens**. These selections prioritized backend concurrency/replay and the financial browser journey; they are judgments, not verification. No private patient data, credentials or clinical attachment was sent to Jev.

Evidence directory: ignored `.impeccable/review/batch4/` contains raw tool outputs, graph summaries/reports/trace, build/lint/Ruff/backend/migration logs, browser harness/report and screenshots. `/tmp/medframe-batch4-*.log` are the original logs. The single browser harness is `/tmp/medframe-batch4-browser.cjs`.

## Preservation and runtime

- Baseline source: `8b059fa` / `checkpoint/pre-batch4-2026-10-19`. Design/preference commits `b6c4f70` and `efb5da4` precede implementation.
- Private encrypted checkpoint: `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-094413-8b059fa`; its historical filename prefix is unchanged. The verified source bundle/config and encrypted dump remain private.
- The helper restored `medframe_django_batch4_20261019` and reconciled all **73 baseline table counts**, without writing the original database or plaintext dump. Only this clone received the new migrations and synthetic browser fixture financial/consent records. Its dedicated synthetic staff membership gained the administrator role in the clone for finance testing; original roles/passwords/MFA were not changed.
- No original migration/cutover occurred. Existing web session `11815` / PID 919515 and API session `79636` / PID 919261 remain on the prior activated runtime. Their logs remain `/tmp/medframe-reconstruction-{web,api}-runtime.log`. Existing infrastructure/workers/beat were left alone; no rehearsal worker consumed jobs.
- Review API/web on 8001/3001 used the clone, isolated throttle/channel/broker configuration and forced-disabled SMS. Those temporary servers were stopped after the one browser run. `.next-batch4` is an inactive review artifact; `.next-reconstruction` is preserved.
- Current source includes unapplied Batch 4 migrations. Restarting backend/beat from this branch against the original database is **not** the preserved baseline runtime; continue with the clone until activation is explicitly completed. Use the saved baseline source/artifact for a baseline restart, rather than silently applying incomplete finance migrations to original data.
- To activate after authorized repairs: use an additive corrective migration for the existing rehearsal trigger, perform a focused confirmation under the user's chosen limit, take a fresh original checkpoint, then apply the complete additive migration chain to original data and switch local servers. Never restore the clone over original records or discard subsequent writes. No push or public deployment occurred.
