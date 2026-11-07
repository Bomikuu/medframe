# UI cleanup — October 22, 2026

## Delivered

Native refinement of the existing white/navy/teal Medframe interface, with 64 route wrappers inventoried and their feature owners mapped in `ui-cleanup-route-inventory.md`. The inventory is source coverage, not a claim that every role, state and route was browser-tested.

- Shared page headers give titles more room before actions wrap; heading typography and flow-layout spacing are quieter. Existing grid-owned spacing is retained.
- Shared empty states no longer paint another tinted card inside their containing panel.
- Patients show one result total for the chosen view, rather than repeating it above and below search.
- Appointments/Queue remove the outer card around already-contained calendars, metrics and tickets. Manual refresh remains explicit; live subscriptions remain paused. Repeated calendar instructions are removed, while timezone, loaded-page limits, day counts, filters and day-list behavior remain.
- Diagnostics has one native New request header action instead of two entry buttons. The same EntrySheet/form/save callbacks remain, scoped to the existing authoring permission and clinical context.
- Consultation cards use the patient-name link as their single open destination; authors, timestamps, status and version remain.
- Billing patient lookup and filtered invoice totals are grouped with invoices; financial comparison charts and current balances remain separate. Patient lookup is shown to invoice managers. No money movement, calculation, ledger or mutation owner changed.
- Services removes the repeated catalog heading and aligns search with its availability filter. Schedule, communication, appearance and specialty guidance is shorter.
- Dashboard names the selected branch instead of listing all organization branches. Header branch help now accurately applies to all clinic pages.
- Device connection guidance is a native keyboard-operable disclosure. Pairing, verification-phrase approval and doctor/reception distinctions remain available. Header destination labels are shorter.
- Patient portal record/report headings group their explanatory copy, retaining clinic-review distinctions.
- Room-entry PIN cells are 44px high on phone / 48px at larger widths, capped at a 20rem group. Instant-room copy describes manual closure; scheduled-room copy describes its end time and extension.

Clinical save/finalize/amendment, patient actions, portrait controls, access warnings, appointment admission, financial limitations, unsaved-change guards, roles/MFA and backend authorization remain with their original owners. No backend/schema/migration, real account or permission changes. The pre-existing clinic-shell width edits were not touched.

## Preservation and runtime

- Fresh encrypted checkpoint: `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261022-032344-a89bd41`.
- Isolated restore: `medframe_django_ui_cleanup_20261022_c27a6b`; 167 tables verified; source database was not restored or replaced.
- Current pre-edit working copies of all 23 touched source files are saved under ignored `.medframe-runtime/ui-cleanup-before`; exact file manifest is `.medframe-runtime/ui-cleanup-files.txt`. These preserve dirty source that a Git bundle alone does not include.
- A new synthetic organization, branches, provider, patients and appointment supplied the native visual entry. Only those synthetic identities/sessions were deactivated afterward; their history is retained. No review data was imported over original records.
- Temporary `review-ui-cleanup` routes were removed; original Next configuration was restored byte-for-byte. The narrow temporary framing exception no longer exists. Review tabs were closed and the phone viewport override reset.
- Root `./medframe` owns local activation on `.next-local-dev` and original `medframe_django`; frontend restart clears the temporary route module graph. No build was produced.

## Actual tool use

Design-taste supplied audit/preservation/restraint guidance; Impeccable supplied product-UI distillation and craft guidance. Medframe's established fonts, tokens, Lucide and shadcn components were preserved. Impeccable context launcher returned permission denied; PRODUCT.md, DESIGN.md and UX-CONTRACT.md were read directly instead. No launcher install/permission changes.

Graphify's existing root graph was queried first (`PageHeading OperationSection EntrySheet ClinicShell`, budget 240); its stale 1,150-node graph was not treated as current source truth. A focused corpus was refreshed from 31 source files: 180 nodes / 388 edges, deterministic AST extraction only. Final query `PageHeading OperationSection InvoiceCollection DeviceSetupGuide`, budget 350, found 77 nodes and displayed 11; 66 were truncated. This graph does not cover every route or prove runtime behavior. Direct source inspection governed implementation.

Jev received public design descriptions only, with no records, credentials or private attachments. Two `jev choice` calls selected `focused` cleanup and `visual` review, confidence 1.0 each, model `jev-1.13.0`. Usage: 379/33 and 388/31 input/output tokens. These are prioritization judgments, not verification.

## Bounded visual review

No builds, TypeScript checks, lint suites or automated tests were run. Prettier formatted the touched supported files. One manual browser pass with a narrow continuation to clear prefetched UI covered:

- Desktop 1280 × 720: Appointments, Patients, Queue, Diagnostics, Services, Devices & Stations, Billing, Dashboard, Consultations, Schedules, Staff & Access, Security, Specialties, Appearance, Communications, a synthetic patient profile, Templates, Clinic website and Patient Stations.
- Full result content was observed for the directory, queue, diagnostics empty state, service empty state, device guide, financial overview, Dashboard, consultation empty state, schedule grid, security controls, appearance, communications, profile and Patient Stations. Staff/Specialties/Templates captures include initial loading/form presentation, not full acceptance of their data or saved mutations.
- Native device help expansion was observed. A refreshed native page confirmed one diagnostic header action and shortened device destinations.
- RoomEntry was rendered with an isolated local synthetic state fixture (no call integration): desktop and 390 × 844 phone. Phone DOM width was 390px, scroll width 375px, PIN control height approximately 44px. This does not verify PIN redemption, camera/media, admission, call timing or cross-device behavior.
- Browser error log inspection returned no errors at the two sampled checkpoints. This is not an exhaustive no-error claim.

The first patient-heading locator exceeded its 5-second navigation deadline, while the next native snapshot showed the loaded directory. It was a review timing mismatch, not an application repair. An early diagnostic capture showed a blank status trigger although accessibility exposed All statuses; retained as UI-CLEANUP-001. No broader repair loop was performed.

Portal authenticated content, invitation/onboarding steps, all detail/editor/error states, every authorization variant, full clinic phone layouts and saved financial/clinical mutations were not exhaustively browser-verified. Their route owners and shared patterns were reviewed in source. Existing deferred findings remain deferred.

Final activation: `./medframe start --only frontend --dist-dir .next-local-dev` reported Ready on localhost:3000. Launcher status confirmed API 296426, worker 296744, scheduler 296745, media 296746 and web 349590 running; infrastructure healthy. No production build or automated test was run.
