# Workflow / finance improvements — Phases 1 and 2

User approved these two phases of the improvement roadmap on October 20, 2026,
with native execution and Impeccable. Both were delivered together and activated
locally. No subagents or separate chats. Later roadmap phases are not included.

## Delivered behavior

Implementation `48d6bb0`, branch `codex/workflow-finance-improvements`. Baseline
`8fe288e` / tag `checkpoint/pre-workflow-finance-2026-10-20`; previous production
artifact `.next-batch8` remains intact. The user's uncommitted clinic-shell width
change is preserved byte-for-byte and included in the built artifact, but is not
in the implementation commit. A private copy is `/tmp/medframe-improvements12-preserved-width.patch`.

- Invoice details return at most 20 payments and 20 non-draft financial events,
  newest first, with signed deterministic `(created_at,id)` keyset pages. Cursors
  bind organization, invoice, invoice version, realm and list kind. Each staff or
  portal page rechecks current native scope. Changing the invoice invalidates an
  older cursor; the UI provides a return to newest entries.
- Refund selection uses its own eligible-payment query and pagination, with the
  selected payment retained across pages. It is independent of the displayed
  payment page. Refund availability uses the full native refund ledger.
- Totals remain full-ledger aggregates. The installment projection now reads the
  native aggregate totals instead of materializing every payment/refund for one
  invoice. Existing Due/Upcoming/Settled filters and service payment links remain.
- Payment entry reviews the received amount/date/method, projected outstanding,
  remaining amount due today and next unpaid obligation. The preview uses the
  same integer obligation calculation as the statement, requires the current
  version and payment permission, and writes nothing. Existing acknowledgement,
  exact-version checks, idempotency, posting and financial integrity guards own
  the actual entry. Agreement issuance/terms and concurrent-issue owner unchanged.
- Staff and connected patients can open a recorded-payment confirmation and
  print it. It includes source payment, original received amount/date/method,
  current refunds, retained amount, invoice state/version and outstanding balance.
  Printing re-fetches current authorized data. No unrecorded payment confirmation,
  new fiscal receipt numbering, online charge or payment provider was introduced.
- Reusable review tooling prepares fresh synthetic native records/sessions,
  uses current private metadata and independent exact-role browser groups, and
  saves real Download events before parsing files. Click paths are documented in
  `docs/operations/daily-workflow-click-paths.md`.

## Bounded verification and retained limits

One accumulated targeted check:

- Ten backend cases pass: seven new history/review/confirmation cases and three
  existing installment reporting cases. Includes 25-payment history, full totals,
  cursor isolation/version invalidation, older eligible refund, refund reopening
  coverage, preview/post equality without preview writes, invalid/stale entries,
  current staff/tenant/payment denial and portal redaction/revocation.
- Production build/TypeScript, scoped ESLint and Ruff pass; migration drift check
  reports no changes. Supported files formatted with Prettier/Ruff. The helper's
  initial broad-exception lint finding was narrowed to expected parse/file/assertion
  failures, followed by a focused helper-only Ruff check. No broad retest.
- One nine-group browser pass and one three-group confirmation: eight distinct
  groups have staged passing evidence, zero page exceptions. These cover CSV,
  historical JSON/review invalidation/grant-revoked denial, draft/uninvoiced/void
  service context, partial payment review/native settlement and schedule filters,
  long-history paging/refund/confirmation, workflow financial exclusion,
  operations clinical/export exclusion and portal statement/confirmation.
- Actual saved CSV parses (8,566 bytes); exact-revision JSON parses (1,026 bytes),
  contains the preserved SOAP and excludes the unpublished amendment and unselected
  dental section. The revoked download returns 404. No attachment response.text().
- New finance screens were captured at 1440/1024/390; inspected payment and
  confirmation captures show existing typography/surfaces and contained tables.
  Full-page captures do not establish complete keyboard/scroll acceptance.
- The printed A4 PDF contains only confirmation text, including original PHP5,000,
  refunded PHP1,000, retained PHP4,000 and balance PHP53,700, but spans **five pages**.
  Print pagination remains deferred as IMPROVE-003; no physical printer acceptance.

Initial clinical groups stopped at the default dental dialog. The focused
confirmation navigates Clinical notes and passes historical export, but the
application-of-guidance group then stops on its inner summary inside collapsed
`Consultation template & prompts`. Specialty selection and edited starter saving
succeed; **no browser claim that applying guidance preserves SOAP**. The native
application owner was unchanged. IMPROVE-002 records the remaining harness
acceptance gap. The future helper and click path now include opening that parent,
but were not run a third time. The long-history initial named-region locator was
corrected to its actual unnamed section and passes the one confirmation.

The first fixture wrapper used DATABASE_URL, which Django deliberately maps to a
separate default database. Its pre-mutation database assertion rejected the run;
no fixture writes occurred. The wrapper now sets DJANGO_DATABASE_URL and
DJANGO_DATABASE_NAME explicitly. The prematurely opened review API received only
an anonymous login/session lookup before restart against the isolated review DB.
No authenticated original-data review or fixture import occurred.

Raw evidence: `/tmp/medframe-improvements12-{build,tests,lint,browser,browser-confirmation}.log`,
`/tmp/medframe-improvements12-downloads-initial.json` (historical missing JSON),
and ignored `output/playwright/improvements12/` captures/CSV/JSON/PDF.
Review database `medframe_django_station_kiosk_review_20261019`, API8001/web3001;
no review worker. Fresh records/metadata/session files remain private outside Git.

## Actual Graphify / Jev / design use

Graphify queried the existing Batch8 graphs first for native invoice/payment,
export/template and portal relationships; direct source then confirmed the
unbounded serializer, scopes, posting and shared statement consumers. An initial
vocabulary helper used unavailable `python`; it was corrected to `python3`.
Existing vocabulary was verified and refreshed queries use only existing tokens.
Deterministic AST refresh:

| Corpus                  | Files | Nodes | Directed edges | Communities |
| ----------------------- | ----: | ----: | -------------: | ----------: |
| frontend-improvements12 |   371 | 1,863 |          8,717 |          60 |
| backend-improvements12  |   369 | 2,104 |          8,967 |         140 |

Scoped frontend app/features/components/lib excludes generated.ts; backend
config/api_graphql/medframe_apps includes migrations. Tests, scripts, docs,
private/runtime/assets and frontend proxy.ts are outside this graph corpus.
Known extraction limits: partial station-entry.tsx at line151 and symbol-empty
icons/backend modules. Refreshed queries reach 677 frontend /511 backend nodes,
truncated to 700-token budgets. Zero external extraction tokens. Graph coverage
is not proof of permission or clinical correctness.

Jev CLI/auth succeeded. Sanitized implementation-boundary choice selected
`native_ledger`, confidence1, model jev-1.13.0,390input/36output tokens. Final
reporting judgment selected `honest_limits`, confidence1,426input/36output. Only
generic engineering state was sent, no patient information, cookies, credentials
or private attachments. These are prioritization/reporting judgments, not tests
or authorization. Logs `/tmp/medframe-improvements12-{jev,review-jev}.json`.

Impeccable used the direct existing PRODUCT/DESIGN/Operate/craft-floor context
after the previously reported launcher failure. Preserved the clinical white,
navy/teal typography, native shadcn controls and Tailwind. No launcher retry,
asset download, new design system or AI integration.

## Local preservation / activation

Fresh encrypted checkpoint and isolated restore:
`/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261020-124113-48d6bb0`,
clone `medframe_django_improvements12_activation_20261020`, 153 tables verified;
source_written=false. Source bundle verified; private configuration/backup out
of Git. It was never restored over the original database.

After stopping original API/web/worker/scheduler, full original fingerprints
captured/checked **6,387 rows across 153 tables**, all preserved, before traffic
resumed. Manifest:
`/home/micxsz/.local/share/medframe/checkpoints/improvements12-original-fingerprints-20261020.json`.
No schema migration needed. Fifty-one original objects encrypted/restored and
verified in `medframe-review-improvements12-preservation-20261020`; originals
untouched. Private manifest/bundle:
`/home/micxsz/.local/share/medframe/checkpoints/improvements12-storage-20261020`.

`./medframe start --production --dist-dir .next-workflow-finance` owns API8000,
web3000, worker and scheduler. Artifact BUILD_ID `rIyGIFhnvsqUv8eolzKq-`.
Login and API readiness both HTTP200; all four services running. Original
accounts/passwords/MFA/memberships/patient grants untouched; synthetic review
records/sessions were not imported. No live messages/money movement, public
publication/deployment/push or unrelated editor/dependency repair.

Rollback retains source baseline/tag and `.next-batch8`; there is no schema change
for this phase. Never restore the review database over original data. Older
unrelated findings remain deferred.
