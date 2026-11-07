# Daily-work dashboard reference redesign, October 23, 2026

## Delivered and active scope

The user's dashboard brief and screenshot govern this local dashboard redesign. It preserves Medframe's white/cool canvas, navy actions, teal interaction states, Jakarta/Manrope typography, sidebar and official existing shadcn/Radix controls. The reference informs the light cards and wide patient column with narrower attention rail; no sample identities, invented chart data, stock portraits or another brand's navigation were imported. Operate mode; design variance 3, motion 2, density 5. Design Taste explicitly excludes dense dashboards: only its brand-preservation, hierarchy and anti-clutter guidance was applied. Impeccable's established-world workflow and craft floor informed the implementation. The skill launcher was already unavailable in this session; existing PRODUCT.md, DESIGN.md and native sources supplied context.

Today is the default mounted view. Analytics mounts separately and keeps the existing date policy, calculations, interactive comparison controls, financial reporting and CSV owner. Zero-activity comparisons now use compact empty copy while preserving exact data controls. Zero prior baselines display “No previous-period data.” An isolated clinic-invitation link moved from Dashboard to Staff & Access, retaining the native platform capability check.

The header shows the clinic-local date, greeting, current branch through the existing switcher, native patient-search modal and registration link. Today includes four permission-aware summary cards, an eight-row visit preview and paginated View all, a task rail and paginated attention dialog, unfinished documentation, follow-up/diagnostic context, recorded provider hours and a compact authorized financial snapshot. Dental unfinished encounters include the existing patient dental-chart route. Appointments open the native appointment actions and editor lazily; no duplicate booking/check-in/payment mutation owner was introduced.

## Read boundary and count definitions

New read-only POST `/workspace/today` requires the native staff realm, workspace membership and a permitted branch. Delegated Station contexts are denied. Operation reads follow the existing own-provider vs. scheduling/reception scope; clinical rows require live scoped patient visibility and default to the current clinician unless clinic-management permission is present. Diagnostics use native request_scope; financial reads use native staff_member/invoice_scope and installment obligation projection. Private identity photo helpers remain authoritative.

Daily visits are represented in this order: today's queue tickets, today's appointments not already represented by those tickets, and today's clinically permitted encounters not already linked by those tickets. The null references are excluded from exclusion subqueries. Only explicit persisted links deduplicate; no patient-name or same-day heuristic merges separate visits. The selected clinic timezone defines day boundaries. Completed means today's represented visit records currently marked completed/finalized, not a claim of an independently recorded completion timestamp. Waiting duration is recorded arrival elapsed time, not an estimated waiting time. Cards aggregate full authorized querysets; previews and their page counts are separate. Filters and Refresh retain the selected filter in component state. No live subscription or interval reload was added.

Needs attention counts unfinalized consultations, due/overdue open follow-ups and results in results_available; earlier unfinished records remain separate from today's visit totals. Recorded diagnostic urgency is read only from the native validated routine/urgent field. Urgent result orders sort first, then overdue follow-ups, then recorded dates; no clinical urgency is inferred. Orders awaiting results remain a separate context and are not counted as reviewable results. Unknown/unimplemented assigned-task modules are not invented.

Today's recorded payment amount is gross payments by paid_date, using native integer-money conversion; outstanding/overdue amounts use the existing full installment-aware projection over issued invoices. Currency values are kept separate. These are recorded settlements and receivables, not profit or accounting revenue. Existing historical calculations remain unchanged.

## Preservation and runtime

Fresh encrypted checkpoint `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261023-130953-a89bd41`; separate restore `medframe_django_dashboard_reference_20261023` verified 167 tables with source_written=false. Exact pre-edit owners are preserved in `.medframe-runtime/dashboard-reference-before`.

No migrations, original credentials/MFA/roles/grants, original patient edits, public deployment, AI, live messages or payment movement. Synthetic review records were created only in a separately named local review organization and were never imported over original records. At cleanup, that organization's membership/user were disabled, its session revoked and metadata expired; historical synthetic evidence remains preserved.

`./medframe` owns local services on web 3000/API 8001 using the existing `.next-local-dev`. The temporary review route and credentialless frame configuration were removed, the exact normal Next config restored, and services restarted with final native source. No extra build artifact was created.

## Bounded visual evidence

No build, automated tests, lint or typecheck. Prettier formatted supported touched files and Ruff formatted only the new Python package.

One bounded native synthetic review, with implementation refinements and focused confirmation, observed:

- Six appointments, three tickets and two current encounters with explicit links produced **8 daily visit representations**, not the raw sum. One older draft stayed outside daily visits.
- Full summaries **Waiting 1 / In consultation 1 / Completed 2 / Needs attention 4** matched the seeded native states. Waiting selected its one row while retaining the complete summary totals.
- Attention dialog displayed all four tasks, including an overdue treatment follow-up and older documentation, with correct native destinations.
- A booking opened the existing Appointment & current care modal, including its exact scheduled time, correct patient, Check in/Edit controls and the different patient currently in service. No transition or booking mutation was submitted.
- Analytics displayed the native comparison range, prior period, exact-value controls, patient figures, financial overview and enabled CSV control. CSV contents and nonzero financial projections were not revalidated.
- Empty branch showed zero counts, honest visit/task/documentation empties and no fabricated availability.
- Desktop 1440×1000, tablet 1024×1000 and phone 375×844 were visually inspected. Tablet document width/scroll width was 1009/1009; phone was 360/360. Mobile order is summary, patients, attention, unfinished work, follow-up context, provider-hours context and finance. No horizontal document overflow was observed in these samples.
- Sampled browser console errors were empty.

Captures: `.medframe-runtime/dashboard-reference-desktop.jpg`, `dashboard-reference-tablet.jpg`, `dashboard-reference-phone.jpg`, `dashboard-reference-empty.jpg`. Captures contain synthetic names only.

DASHBOARD-REFERENCE-001 records limits: distinct-role/multitenant denial, concurrency/revocation, more-than-eight-row pagination, nonzero money/refunds, diagnostic result mutations/urgency ordering and CSV content are not exercised. Final dental-chart shortcut follows an already supported URL and specialty but direct browser navigation is unexecuted. Native Refresh temporarily replaces the daily body before restoring the selected filter and can return keyboard focus to the main region. Existing shared-header crowding at 1024px remains deferred, without unrelated shell repair. No comprehensive security, financial or clinical acceptance is claimed.

## Graphify and Jev

Queried the existing root graph first: 1,150 nodes, 257 related nodes found, 25 shown and 232 cut at budget 900. Verified current source because the root graph omitted new owners. A focused source-only corpus in `.medframe-runtime/dashboard-reference-graph` was extracted deterministically: initially 15 files, 106 nodes/217 edges; then 16 files, 110 nodes/229 edges, with 110 nodes/230 edges after the final urgency metadata refresh. The focused dependency query found 84 nodes, showed 13 and cut 71 at budget 450. No semantic/community or full-repository coverage is claimed. Graph extraction and source review are not runtime verification.

Jev judged a sanitized deduplication question only: model `jev-1.14.0` selected `linked` over adding raw totals, confidence 1.0; 389 input/31 output tokens. No patient records, identities, credentials, attachments or private data were submitted. This was a narrow design judgment, not proof of authorization or count correctness.
