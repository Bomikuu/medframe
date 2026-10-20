# Central patient actions — October20,2026

Active locally on codex/patient-actions-hub, implementation8b167ba,
artifact .next-patient-actions, BUILD_ID DrgTIIVx65jzCGKEvIggF.
Baselinefc1777e, checkpoint/pre-patient-actions-2026-10-20 and .next-patient-photo
retained. Direct user authorization to centralize patient actionables in a card
modal; native implementation/review, no subagents or separate chats.

## Implemented scope

One Patient actions header button replaces the record/edit/start/more buttons.
The circular photo camera opens the same hub. Searchable cards group Clinical
care, Visits & payments and Patient record. The complete catalog has20 possible
actions; real permissions and photo state determine what is shown:

- Start/continue consultation; review/update clinical history; treatment plans and
  follow-ups; diagnostic requests.
- Book/reschedule/check in appointments; admit walk-ins; record a received payment;
  manage invoices/adjustments; review/start services and their payment agreements.
- Edit demographics; upload/version documents; change/remove profile photo; manage
  patient releases/reported information, verified portal invitations and clinical
  assignments; open the existing attributed timeline.

Existing native forms, schemas, version/request keys, server authorization,
patient grants, audited transitions and financial ledgers remain their owners.
Dedicated patient-edit and consultation editors keep their routes/layouts with
patient and organization context. Other workspaces render the existing components
inside the hub, including their native Sheets/confirmations where applicable.
Save/Cancel remain with the active form. The canonical EntryFormActions adapter
supplies guarded cancellation and confirmed completion to directly embedded forms.
One editing workspace is mounted; server-confirmed completion clears its dirty
registration, refreshes summaries, returns to cards and shows saved feedback.
Back/Close preserve Keep editing/Discard behavior. Photo operations retain the
same private clean-image selection/removal owner and original-file retention.

PatientRecordBrowse is presentation-only, defaults false outside profile tabs and
does not override permissions. Tabs keep read content, navigation/downloads,
filters and pagination while suppressing their write launchers. Explicit consumers
cover clinical history/consultation launchers, treatments/follow-ups, services,
new invoices, diagnostics, documents, releases/reports and access management.
Service readers retain a view-only service card and native case details, with
write controls still governed by the existing service permissions.

The appointment picker uses a native optional patient_id filter before pagination,
authorized patient lookup and existing branch/provider restrictions. Malformed
identifiers return a domain error. Requests without the filter retain existing
branch-list behavior. BookingForm can pin the actual profile patient independently
of setup-list pagination. Reschedule/check-in first select an existing booked
appointment with its native version. Payments select an issued invoice for the
same patient, use the original PaymentForm/review and refresh after confirmed save.
This records money received externally; no live charge/transfer/provider integration.
No model/migration, original permission, credential/MFA or AI changes.

## Actual tools

Impeccable's incumbent Operate, layout/color and craft-floor context, PRODUCT,
DESIGN/UX-CONTRACT, frontend AGENTS and installed Next navigation/client-fetching
guidance were retained. The earlier session launcher failure was not retried.
The user explicitly requested action cards; this is a focused operational modal,
not a new visual world. Shared Dialog/Close, Button/Input, EntrySheet/forms,
PatientAvatar and native locale/semantic tokens remain. Tailwind and Prettier used;
Ruff formats/checks the narrow Python changes. User main-width edit untouched.

Graphify first queried frontend-patient-photo with PatientOverview EntrySheet
InvoiceCollection BookingForm, budget900:494 reached,32 shown,462 truncated.
Actual source/permission/flow owners were inspected independently. Final refreshed
deterministic AST graphs:

- frontend-patient-actions:395 TS/TSX files,1939 nodes,9230 directed edges,
  49 communities.
- backend-patient-actions:373 Python files,2132 nodes,9116 edges,147 communities.

Frontend app/features/components/lib excludes generated GraphQL/proxy.ts; backend
config/api_graphql/medframe_apps includes migrations. Tests/scripts/docs/assets,
private state and runtime data excluded. Known partial station-entry.tsx line150,
symbol-free icons and10 backend modules remain. Zero external extraction tokens;
these graphs do not verify runtime/security. Relevant native call paths were
source checked; no invented whole-project coverage.

Jev0.7.0, configured key availability established earlier without exposure.
Generic engineering-only state, no patient/fixture/credential/private attachment
content. Modeljev-1.13.0 chooses reuse_owners at1.0 confidence (436 input/47 output),
then scoped at1.0 (436/34). These informed implementation/evidence boundaries,
not correctness facts. Outputs /tmp/medframe-patient-actions-jev.json and
/tmp/medframe-patient-actions-review-jev.json.

## Bounded verification and limitations

Final production build/TypeScript and staged scoped lint/format checks pass.
Structural builds ran during native-form integration, the necessary Close repair
and final source consolidation; this is not one clean initial-build claim.
An intermediate source-edit assertion stopped a form-context insertion before
completion; it was completed before browser verification. No dependency changes.
Logs /tmp/medframe-patient-actions-{final-build,lint,last-lint}.log.

One targeted backend pass:3 new tests pass in1.155s. They establish patient
isolation before pagination with unchanged unfiltered branch behavior, foreign-
clinic denial and malformed UUID domain handling. Native transaction services were
not rewritten; no claim that all booking/payment services were freshly retested.
Ruff import-order correction/format scoped to the changed source/test only.

One initial four-group synthetic browser pass, then one focused three-group
confirmation; no third browser round:

- Initial native launches/unsaved group passes patient-scoped edit/start routes,
  clinical dirty form Keep editing/Discard, document-sheet opening/closing and
  shared photo dialog handoff. Read-only-role group passes write-card exclusion.
- Initial central group passes modal1440/1024/390 bounds, Escape/focus and medical/
  services/billing suppression, then stops on a wrong Documents heading. Focused
  confirmation uses Documents & imaging and passes document/treatment/access
  suppression and direct Close clicks/focus return at1440/390.
- Initial reschedule/payment group reaches the correct booked appointment and
  native form, then stops because the selected date has no available times. The
  confirmation passes that honest disabled-slot state, native Cancel and patient-
  pinned new-booking Cancel. No schedule changes or completed reschedule claim.
- Independent focused payment confirmation records a synthetic1.00 manual receipt
  through native invoice review/acknowledgement; backend response confirms success
  and the hub returns to cards. No original record or real money movement.

Five distinct groups have staged passing evidence; initial failures retained.
No page exceptions in either round. Initial captures exposed the default Dialog
Close under the sticky header. The standing local-activation authorization covers
this functional blocker: the default target is disabled and canonical DialogClose
is inside the header. Focused hit testing passes; no global z-index rewrite.
PATIENT-ACTIONS-001/002/003 contain reproduction/evidence and remaining limits.

Final consultation-history Start/Open gating and Continue card, plus service-reader
card visibility/copy, were source-consolidated after the browser confirmation.
Those last small changes have final build/lint/source evidence only; no fresh
Continue/service-reader-card browser claim. No comprehensive save/revoke/export/
scan-failure/dark-mode/all-role acceptance claim, broad suite or unrelated repair.
Older deferred Station403, editor/phone/balance and other issues remain deferred.

Review uses medframe_django_station_kiosk_review_20261019 on8001/3001, fresh native
synthetic staff sessions and a review-only custom read role/grant. The prep script
first omitted a required organization_id in that synthetic grant and was corrected
before the browser run. No original roles/grants/accounts changed or fixtures
imported. Browser logs /tmp/medframe-patient-actions-{browser,confirmation}.log;
captures output/playwright/patient-actions/. Review listeners/browser stopped after
evidence. The new route/user-role coverage is not a clinical validation claim.

## Preservation and activation

Root services paused for encrypted checkpoint, verified source bundle/private
configuration and isolated restored clone (154 tables verified):
/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261020-153938-8b167ba,
medframe_django_patient_actions_activation_20261020. Capture/check fingerprints
preserve every6706 original row across154 tables before traffic resumes. Private
manifest patient-actions-original-fingerprints-20261020.json. No migrations;
manage.py migrate --check passes. Independent encrypted original-storage checkpoint
and new isolated bucket restore verify51 objects, originals not written: private
patient-actions-storage-20261020 directory and
medframe-review-patient-actions-preservation-20261020 bucket. User main layout
block verified byte-identical; its uncommitted patch retained0600 in checkpoint.
No original credential/MFA/role reset or clone restored over original.

Active via ./medframe start --production --dist-dir .next-patient-actions:
original medframe_django; web3000 PID2904111, API8000 PID2903920, worker2904109,
scheduler2904110. web.json confirms artifact; login3000/API readiness8000 HTTP200.
Service health is not an additional original-patient logged-in browser test.
Previous source/build/checkpoints retained. No push, public deployment, messaging,
live payment or AI integration; UI rollback never implies restoring old DB state.
