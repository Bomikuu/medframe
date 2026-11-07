# Medframe shared interaction contract

Visual rules live in [DESIGN.md](DESIGN.md). The master brief and approved clinical design own business/security policy.

## Canonical owners

| Capability     | Canonical owner                                      | Source of truth        | Allowed variants                                    | Verification                            |
| -------------- | ---------------------------------------------------- | ---------------------- | --------------------------------------------------- | --------------------------------------- |
| Button         | `apps/web/components/ui/button.tsx`                  | DESIGN.md              | Primary, outline, ghost; busy and disabled          | Browser journeys and axe                |
| Form           | `apps/web/components/form-field.tsx`                 | Approved clinical spec | Typed email/password/OTP fields; grouped by step    | Foundation browser tests                |
| Password       | `apps/web/components/password-input.tsx`             | UX-CONTRACT.md         | Current/new password, accessible reveal             | Sign-in and reset tests                 |
| Select/Listbox | `apps/web/components/ui/select.tsx`                  | DESIGN.md              | Authored Radix organization selector                | Keyboard organization switching and axe |
| Checkbox       | `apps/web/components/ui/checkbox.tsx`                | UX-CONTRACT.md         | Recovery-code acknowledgement                       | MFA browser journey                     |
| Session        | `apps/web/lib/auth/client.ts`                        | Approved clinical spec | Clinical session, MFA challenge, recovery bootstrap | PostgreSQL security and browser tests   |
| Authorization  | `services/api/medframe_apps/organizations/policy.py` | Approved clinical spec | Explicit membership, permission, branch scope       | PostgreSQL tenant tests                 |

Auth transport is owned by `apps/web/lib/auth/client.ts`; typed GraphQL transport by `apps/web/lib/graphql/client.ts`. Both use the fixed same-origin proxy. Backend policy remains authoritative.

## Authentication flow

Password verification issues only a five-minute MFA challenge. First enrollment shows an authenticator QR/setup key; no recovery credential can bypass initial TOTP verification. Successful MFA rotates the token into a clinical session. New recovery codes appear once and require acknowledgement before the UI continues.

Existing staff can use a current authenticator code or one-time recovery code. Preserve leading zeros by treating codes as strings. On expired challenges return to sign-in with a clear message. Never put tokens, passwords, setup keys, or recovery codes in URLs, analytics, persistent client storage, or notification messages.

Recovery requests always use the same account-existence-neutral message. Reset links carry the short-lived token in the URL fragment; the reset screen captures it in memory and removes the fragment. A completed reset revokes existing sessions and preserves the MFA requirement.

## Forms and feedback

Each authentication step owns a focused form. `noValidate` disables browser validation bubbles; React Hook Form/Zod owns inline errors and first-invalid-field focus. Labels remain visible, errors use text and `aria-invalid`, and helper IDs exist before references are added. Passwords support paste and managers. Never trim passwords.

Pending buttons stay the same size and cannot be submitted twice. Failed requests preserve safe input and explain retry/restart. Alerts are inline; no browser alert/confirm/prompt APIs are used. Profile avatar uploads use circular choose/change/remove affordances through the private persisted image pipeline; clinical image previews retain full framing.

## Workspace states

Cookie presence only controls the initial route redirect; the API always authorizes data. An expired session redirects to sign-in. A user without active organizations sees an actionable no-membership message. API failures show a retry action. Organization switching clears the previous workspace immediately and ignores superseded workspace responses. Returning focus refreshes authorization; denied/revoked access clears workspace content. Navigation between future clinical modules must preserve these rules.

## Accessibility and responsive behavior

English interface; organization timezone defaults to Asia/Manila. Use native input types/autocomplete and an authored Radix organization select. A skip link reaches main content. Use real headings, landmarks, focus outlines, visible errors, and keyboard-operable controls. Light is the default; dark/system modes are explicit saved preferences and reduced motion suppresses transitions. Desktop sidebar becomes normal-flow organization/navigation controls on mobile; it cannot clip forms or hide actions.

## Verification boundary

Django Batch 1 adds patient CRUD, versioned consultations/finalization/amendments, 2D/3D dental findings, treatments, private scanned documents, branding, personal preferences, and real notifications. Browser checks exercise successful enrollment/login, failure retry, refresh, organization switching, logout, recovery messaging, light/dark accessibility, and narrow layout.

## Patient workflows

Authority: the approved clinical design and `docs/superpowers/plans/2026-10-18-medframe-patient-management.md` own patient permission and lifecycle rules. The API remains authoritative.

| Capability                           | Canonical owner                                                   | Behavior                                                                                                                                                                       |
| ------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Patient directory / pagination       | `features/patients/patient-directory.tsx`                         | Server cursor pagination; explicit submitted search; clear resets query and cursor. Sensitive search text stays in memory, outside URLs/storage.                               |
| Patient forms                        | `features/patients/patient-form.tsx`, `components/form-field.tsx` | Identity/contact/emergency/guardian groups, inline validation, input retained on error, busy submit, explicit save. Successful create/edit opens the persisted patient record. |
| Date                                 | `components/ui/input.tsx`                                         | Native date-only input, browser-owned calendar/locale; application owns validation and calendar-date serialization.                                                            |
| Select/Listbox                       | `features/patients/form-controls.tsx`                             | Existing authored Radix Select, shared tokens, labeled trigger, keyboard popup.                                                                                                |
| Textarea                             | `components/ui/textarea.tsx`                                      | Nonresizable, content-sized, adequate initial height; full-width clinical text.                                                                                                |
| Confirmation / unsaved changes       | `features/workspace/safety-provider.tsx`                          | Radix AlertDialog, app-owned text, focus restoration, least-destructive initial focus; beforeunload only on actual unload.                                                     |
| Patient history / clinical revisions | `features/patients/patient-timeline.tsx`                          | Server timestamps with explicit timezone, immutable version detail, bounded load-more.                                                                                         |
| Patient access                       | `features/patients/patient-access.tsx`                            | Explicit grant/revoke confirmation naming the clinician; no client-side clinical bypass.                                                                                       |
| Async feedback                       | `features/patients/feedback.tsx`                                  | Shared loading, inline error/retry, conflict and live success; clear private data on denied request.                                                                           |
| Scrollbar                            | `app/globals.css`                                                 | Global token colors, standards baseline plus engine fallback; forced-colors uses system defaults.                                                                              |

Organization UUID is nonsecret URL context. Patient search terms, contact details, and clinical input never go into query strings or browser storage. Patient links preserve organization context; switching organizations returns to the directory. Unavailable/denied clinical data is an error, never an empty medical history. Missing review states remain "Not reviewed"; only an explicit clinician submission records none reported.

## Django Edition amendment contract

Authority: `docs/requirements/medframe-django-edition.txt` and `docs/superpowers/specs/2026-10-18-medframe-django-amendment.md`. Existing patient/auth interaction contracts are migration regression requirements. These connected capabilities are implemented in the active local Django workspace; production-build/cutover verification is recorded in `docs/operations/django-batch-1-verification.md`.

Batch 1 keeps one organization/patient context and centralized safe drafts/version/request keys across its forms. Branding preview is explicitly unsaved until Save; Cancel restores the persisted effective theme; Reset previews defaults before Save. Light is the new default, with saved dark/system choices. Widget visibility/order does not affect authorization. Encounter saves/finalization/amendments, dental findings, procedures, and document links share explicit version/state rules. Draft findings render only as encounter draft overlays until finalized. No patient/encounter file is exposed through a public frontend path.

The user requires native work without subagents. No per-component approval or partial-scaffold handoff splits the integrated batch.

## Connected clinical owners

| Capability          | Canonical owner                                               | Contract                                                                                                                          |
| ------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Appearance          | `features/branding/theme-provider.tsx`, `appearance-page.tsx` | Validated scoped preview; save/cancel/defaults; optimistic versions; personal mode and dashboard layout.                          |
| Consultation drafts | `features/consultations/encounter-editor.tsx`                 | One aggregate version; serialized autosave; explicit save; memory-only recovery; stale-request generation guards.                 |
| Clinical lifecycle  | `medframe_apps/encounters/services.py`                        | Completed review before finalization; immutable original revisions; reasoned attributed amendments.                               |
| Dental selection    | `features/dental/dental-editor.tsx`, `dental-3d.tsx`          | Same persisted tooth/surface IDs in both renderers; full keyboard/2D alternative; labeled schematic asset.                        |
| Files               | `features/documents/`, `medframe_apps/documents/`             | Bounded private upload; quarantine until real clean scan; fresh authorization and short-lived download; exact immutable versions. |
| Treatments          | `features/treatments/`, `medframe_apps/treatments/`           | Ordered versioned proposals/plans; completed status requires matching finalized clinical evidence.                                |
| Notifications       | `features/workspace/notifications.tsx`                        | Actual user/clinic-scoped records, safe labels, persisted read state.                                                             |

Selected files and active uploads participate in navigation protection. Consultation completion waits for a selected file to be uploaded or cleared. Quarantined attachments cannot become finalized evidence. Historical links resolve exact encounter/chart/history/document revisions; current history remains explicitly labeled as current where no preserved context exists.

## Clinical versions and patient access

- `features/records/record-filters.tsx` owns clinic-local date, literal text and structured record filters. Applying/clearing filters resets a signed keyset page; form instances have unique IDs. Filter labels are distinct from clinical-entry labels.
- `features/dental/dental-chart-grid.tsx` owns keyboard tooth selection for editor/history/portal variants. `chart-view.tsx` accepts authorized snapshots only. No missing finding implies recovery.
- Template prompts use the existing encounter save/version/IME/request-scope owner. Dirty input must save successfully before guidance application; an error preserves it. Optional labels create an empty observation value, never a clinical fact.
- Plan edits, ordering and follow-ups use expected versions and replay keys. Preserve user input on failures/conflicts; completed evidence is immutable. Version histories never invent pre-migration changes.
- `features/documents/document-preview.tsx` accepts an authorization callback, fetches private bytes into memory, and destroys PDF/Blob resources on closure or scope change. A preview failure retains an independently authorized original download.
- `features/portal/portal-provider.tsx` owns the active verified relationship, separate patient client, private scope clearing, focus/30-second authority refresh and simpler navigation. Staff and patient entry use native explicit sign-in through the shared auth owner. Unsaved forms use `SafetyProvider` before realm or relationship switching.
- Verification/invitation controls are separate from clinician release preview/publish/withdraw controls. Only previewed selections are published; a changed source requires another preview. Record versions and published payloads remain immutable.
- Patient reports are separate submissions with review receipts. Preference writes preserve unrelated staff data. Revocation/withdrawal denies subsequent requests and clears inaccessible UI state; previously delivered/downloaded bytes cannot be recalled.

## Clinic operations contracts

Scheduling, appointment and queue writes use version checks and request receipts. Operations forms retain inputs on conflicts, and clinical handoff surfaces missing provider/branch/grant prerequisites before starting care. Shared operation feedback lives in `features/operations/controls.tsx`; mutation state/replay and WebSocket refresh live in `features/operations/use-operations.ts`. FormField/Input own native date and time controls; FormSelect owns single choices; SafetyProvider owns confirmations and dirty navigation. No drag-only calendar or queue reordering. Patient screens expose only own bookings/tickets plus anonymous aggregate counts. Live refresh uses opaque branch invalidations and authorized snapshots; disconnected polling is explicit every 30 seconds. Existing role and clinical-grant boundaries remain authoritative.

## UI revamp interaction owners (October 19, 2026)

- ClinicShell owns compact Sidebar navigation and guarded account/organization changes. PatientOverview owns URL-backed tabs and guards dirty tab exits. EncounterEditor retains one FormProvider/form, force-mounted hidden tab panels, composition handling, save/lifecycle state and uploads.
- ClinicalEntry owns a local per-entry edit snapshot. Use entry retains values in the unsaved consultation; Cancel restores that snapshot (and removes an unfinished new blank entry). Saving/finalizing remains explicit in EncounterEditor. No nested portalled form or clinical mutation is introduced.
- EntrySheet uses the existing safety confirmation. Upload closing passes only its upload draft key so it cannot discard unrelated SOAP notes. Private preview Dialog closing aborts transfers, releases bytes/object URLs and unmounts PDF rendering. Fresh authorization, scan gating and full image framing remain with the original owners.
- Patient directory sorting/filtering is global over current demographic authority. Its new signed string cursor binds actor, organization, query, sort, branch, current membership permissions and active patient grants. The original UUID clinicPatients endpoint remains compatible. Presentation-only table/cards preference is keyed by current user and organization; patient data is never persisted in browser storage.
- Sonner is supplemental confirmed-write feedback; errors, conflicts and save/lifecycle status stay inline. Staff and portal authentication flows and realm separation are unchanged.

## Anatomical dental replacement contract

The anatomical replacement is active locally after the user authorized its blocker repairs. Actual verification, remaining coverage limits and rollback are recorded in `docs/operations/anatomical-dental-verification.md`.

- The permanent model uses explicit FDI metadata for 32 distinct source tooth meshes. The optional detailed molar represents FDI 26 only. Mesh array order and screen side never establish identity.
- The model and conventional 2D selector share selected-tooth state. Clinical surfaces are recorded through the existing labelled surface inputs; imported geometry does not supply validated clinical surface segmentation.
- Findings, current-visit procedures and finalized tooth history stay with their existing GraphQL/RHF/revision owners. Camera, jaw, isolation and educational reference state never write clinical records. An absent finding is not a healthy diagnosis.
- Missing-tooth visibility reflects exact active missing/absent terms. Educational reference anatomy can reveal a hidden tooth without altering the record. Proposed/completed care retains explicit statuses.
- Hidden encounter tabs preserve registered values but do not mount the 3D viewer. Primary dentition uses the correct 20-tooth 2D fallback until suitable anatomy is installed. Read-only clinical content retains interactive view controls without enabling writes.

## Dental editor point notes (local review)

- Consultations default to the viewport dental workspace. Radix Dialog owns focus/escape; Back to consultation returns to Notes without discarding RHF values. Save/version/IME/permission handling remains in EncounterEditor.
- Comment stores a clicked mesh-local point and whitelisted asset version; it never infers a clinical surface. Drags do not create pins. Individual tooth navigation and the 2D chart remain keyboard alternatives.
- Unposted note text is local, navigation guarded and explicitly added/cancelled before the editor save action. Added notes use existing consultation save/finalization; a preview is not saved evidence.
- Current draft edits/resolution remain distinct from read-only historical notes. Exact JSON revisions/chart snapshots own coordinates; the normalized finding index retains clinical fields. Comparison includes anchor changes, and invalid asset/point/tooth combinations are rejected.
- This local implementation has a logged browser coverage gap. See `docs/operations/dental-editor-verification.md` and EDITOR-001/002 before changing verification status.

## Reference-guided editor revision

`use-dental-viewport.ts` is the shared view-state owner for the tooth rail, canvas tools, camera navigation and preview strip. Display numbering can change between FDI/Universal; selected keys, surfaces, anchors and backend writes remain FDI. Header actions call the existing encounter save/completion/finalization owners and retain their permission/IME/upload gates. Inspector Notes remains separate from clinical findings; surface cards show tooth identity previews and do not infer surface segmentation. REF-001 is repaired and the reference editor is active locally. Five focused browser assertion groups pass, but REF-003/004 remain visual defects; do not present this as complete mobile or viewport acceptance.

## Visual reconstruction contract — October 19, 2026

- The current reconstruction brief supersedes the old purely white/Inter defaults. Manrope/Jakarta and refined semantic tokens are appearance presets; existing explicit saved choices and preview/save/cancel remain valid.
- EntrySheet owns wide, guarded entry panels and provides cancel/complete actions to embedded booking. Successful backend booking closes the panel; failed booking preserves fields. Container-width queries own multi-column fields.
- RecordFilterForm owns compact search/type/actions, advanced Collapsible controls and applied removable chips. Applying/removing/clearing resets the caller's keyset pagination. No private search text is persisted in browser storage or URLs.
- DocumentCollection owns table/card rendering; DocumentHistory pages authorized existing versions. Existing private-byte preview/download/quarantine permissions remain unchanged. Uploaded-by and clinic timezone are authoritative server data, never guessed.
- ClinicalLocaleProvider owns clinic-time formatting for both staff and patient surfaces. Identity/session context remains owned by their existing separate providers.
- Shared status badges always include text; colors convey actual workflow state. Clickable surfaces have hover/focus feedback, and static information remains static.

## Header clinic selection

`features/workspace/clinic-switcher-dialog.tsx` owns the account-menu Clinic &
branches dialog, reusing Dialog and FormSelect. Selection is staged until Switch
clinic; Cancel/Escape/Done keep the current workspace. Current authorized branches
are informational, with filtering still owned by each branch-specific page.
`workspace-provider.tsx` remains the organization source and switching owner;
SafetyProvider confirms unsaved changes before returning to Patients. The account
trigger receives focus when the modal closes. No global branch filter or clinical
authorization is inferred from the selection UI.

## Shared patient portrait editing

`features/patients/profile/patient-photo-dialog.tsx` is shared by the profile
header and Clinical Station. UploadControl owns the private clinical-image
transfer/scan; the existing versioned stations/portrait endpoint selects/removes
the same-patient clean image. Profile control is circular, with a camera badge,
Upload/Change and explicit Remove confirmation; focus returns to the circular
control. Removal unlinks the profile display and preserves the original file.
Photo changes reload the existing profile summary. Existing clinical/document
permissions remain authoritative; no new public object or patient-image field.

## Patient actions hub

`features/patients/profile/patient-actions-dialog.tsx` centralizes the patient's
write launchers in a permission-filtered card modal. The profile header has one
Patient actions button; its camera shortcut opens the same hub. The explicit
`PatientRecordBrowse` context suppresses write launchers in profile tabs without
changing permissions. It defaults to normal behavior outside profile browsing.
Read links/downloads/filters stay contextual. Clinical and financial server
services continue to authorize every request.

Native forms keep validation, version checks, idempotency and saves. The canonical
EntryFormActions adapter supplies guarded Cancel and confirmed completion when a
form is embedded in the hub instead of another Sheet. Only one editing workspace
is mounted; server-confirmed completion clears that workspace's registered dirty
state, returns to the cards and refreshes summaries. Back/Close still ask before
discarding dirty work. Parent Close is inside the sticky modal header to remain
reachable. Dedicated full-page patient/consultation editors retain their layouts.

Appointments use a server-side patient filter before pagination, existing branch/
provider scope and a pinned patient in BookingForm. Reschedule and Check in select
an existing booked appointment and use native versioned actions. Payments select
an issued patient invoice and use PaymentForm; no charge or online transfer is
implied. Service readers retain a view card even without workflow-write rights.

## Header branch and patient lookup — October21

WorkspaceProvider owns the permitted current branch and branch-carrying workspace URLs; ClinicSwitcherDialog is its header control. Appointments and default operations setup consume that branch. Backend membership/provider/patient checks remain authoritative. Shared PatientSearchDialog owns debounced current-branch suggestions: navigation callbacks open a patient/consultation destination; form callbacks select an explicit patient. Never silently select the first result. Instant booking uses its own authenticated, idempotent native room action and returns link/PIN together, without scheduled date/slot/duration fields or a fabricated reservation. See appointment-flow-verification.md for observed flows and limits.

## Header-only page context — October21

Clinic page branch context belongs exclusively to WorkspaceProvider.branchId and ClinicSwitcherDialog in the header. Billing/operations setup defaults, dashboard, directory, services, communications, review and clinical Station consume it. Branch changes keep the unsaved-work guard and remount branch-scoped UI state to clear stale pagination/panels. Compact signed-in Station headers reuse HeaderBranchControl; delegated devices show assigned context read-only. Record/device/staff branch assignments, service branch availability and public queue configuration remain genuine persisted settings. Patient-specific operations pin the record's actual branch. Preserve server authorization; never infer broader access from the selected header value. See header-branch-verification.md for source inventory, observed UI and limits.

## Fast patient and assisted terminals — October22

On an approved non-strict patient kiosk, exact patient UUID/clinic reference/email identifies one branch patient and opens a short device-bound terminal session without password or repeated task codes, per the user's explicit policy. Portal username means email. No public patient directory, partial matching or portal/clinical login is implied. Finish/change patient and inactivity clear the patient state. Setup must be cleared while resetting the device boundary so stale reception polls cannot discard new setup. Strict patient mode retains its existing verification flow.

Authenticated staff assistance searches/selects a permitted branch patient and uses the native kiosk actions directly. Keep the staff wrapper mounted across patient changes; every staff-selected session request reauthorizes current staff membership/identity, with billing.read for bills. Returning to patient mode signs staff out. Device functions, live approval, native transaction/version/idempotency owners and audit source distinctions remain authoritative.

## Shared feedback and terminal continuity — October22 Phases1–2

Generic load/error/refresh messaging does not promise draft preservation; form owners name their real save state. Transient query refresh may retain the same scoped data, while rejected access including STATION_REQUIRED clears it. Expired and restricted recovery keep distinct actions. Google helper copy follows configurable clinic assurance rather than promising a mandatory authenticator.

One TerminalPatientContext owns patient identity, reference, entry-method wording and clearing across the kiosk journey. Staff Change patient retains staff mode; Sign out of staff mode discloses browser-tab scope and keeps device pairing. Normal patients retain identifier-only multi-task sessions; strict patient mode remains separate. Completed actions list only native confirmed ticket/appointment results, deduplicate returned identities, stay in memory and clear with patient/proof boundaries. A cashier ticket never implies confirmed payment. Existing native transactions, session maximums, device/functions/role checks and audit remain authoritative.

### Clinical overview and floating assistant continuity

The profile reads existing permission-scoped history/summary facts before demographic totals; unreviewed is distinct from none reported. Recent-care navigation reuses the native encounter owner and honors its editing lease. Narrow chart return controls say Notes with the accessible name Back to consultation. The assistant overlays without changing the editor grid, keeps a 44px close target and restores its connected opener after dismissal. Sending remains disabled until separately integrated. Phase3 visual evidence does not establish GPU, dirty-exit or new-write acceptance.

### Appointment and room continuity — October22 Phase4

Clinic and portal appointment/queue pages use explicit manual refresh under the temporary user policy; online-room updates remain separate. Schedule day/week views share override precedence. Appointment detail keeps the selected patient/provider and native edit/version checks, with full time range/timezone and recorded reason. Instant information labels the creation reference and manual closure; scheduled information labels appointment time. Room snapshots are authoritative, invalidations are coalesced, and backend reauthorization confirms expiry/extensions. No transport optimization is proof of media/internet readiness.

### Financial decisions and preview clarity — October22 Phase5

Issued-period invoice navigation uses issued dates. Current outstanding/due/overdue/future links keep branch and currency while carrying report dates separately from unrestricted invoice dates. Native obligation projection chooses matching invoices before pagination; displayed filtered totals remain whole-invoice balances. A future installment does not become due because it appears in a list.

Installment preview reuses server integer totals, month-end anchors and final-remainder allocation. It writes nothing and is shown only while its input fingerprint matches the form. Save/Issue retain case/version/agreement validation. Proposed draft totals, issued charges, recorded payments, returned refunds and current obligations have distinct labels. Invoice/installment dates use written DateInput. No preview or cashier continuation implies a charge or confirmed payment.

### Setup and access continuity — October23 Phase6

Staff invite/manage/account setup shows a reusable access summary derived from current native role metadata and billing overrides. Summaries describe workspace, branch, clinical tools and billing powers but never grant patient records. Self-access controls stay read-only; server permissions, version checks and Station restrictions remain authoritative. New step headings receive focus, named switches expose their meaning and modal dismissal returns to the opener.

A created/queued invitation is not delivered or activated. Fresh platform clinic links may be copied from their authorized create/replacement response; existing hash-only links retain replacement recovery. Patient pending review retains a copyable reference and explains later portal verification/account setup, without implying a booking. Save/exit preserves clinic details, not unfinished passwords or verification inputs. Administrator readiness reports safe configuration facts only, with local Mailpit clearly distinguished from actual external delivery.

### Request recovery and resumed setup — October23 Phase7

Classify GraphQL domain or JSON transport error codes before HTTP copy fallbacks. Request-security403 and rate limits are not assertions of lost patient access; true access/session denial stays distinct. Protected read data is still discarded on any HTTP401/403 or native denial. Never replay writes or sign out automatically from a generic request failure. Share only pending native CSRF GETs, bound acquisition and discard settled tokens. Read refresh retains one queued invalidation so mutation completion is not lost.

Paused clinic setup must revalidate through native bootstrap/proof/draft owners before choosing saved setup, contact verification, account verification or closed-invitation recovery. Failure to resume must remain visible. A malformed Billing setup response is a recovery state, not endless loading.

## October 23 module improvements, Phases 1–2

- Shared search fields use `components/application/search-field.tsx`: separate icon/text slots, accessible clear control, composition-safe Enter. Remote catalog searches debounce for 300ms; clearing resets immediately. Patient queries remain in memory; only non-sensitive sort/filter/tab choices use `features/workspace/use-url-state.ts` and native history, retaining organization/branch context.
- Daily workspace retains the last successful result only within the same organization/branch while refreshing; loading and transient failures are nonblocking. Rejected authorization clears retained data. This is presentation retention, not offline mutation support.
- Optional GraphQL portrait IDs follow the existing clinical patient scope and clean same-patient portrait selection. Demographics-only access retains initials; secure image requests independently reauthorize.
- Consultation save/review presentation reuses the single encounter form, existing serialized autosave, version checks, explicit finalization and editing leases. Counts are review aids, not clinical completeness gates.
- `DocumentScanState`, `ClinicalSelectionState` and `DiagnosticProgress` explain native facts. A clean scan is not a clinical endorsement; result review is not patient publication; chart selection creates no separate clinical record.

## Operations and financial review continuity — October 23, 2026

- Appointment calendar date/view/status/provider and Queue provider use validated non-sensitive URL state. Patient selections and opaque page cursors remain in memory. Staff Appointment/Queue reads remain manual; refresh retains the same filter/page scope.
- Date-override impact is a read-only preview through the native `scheduling.windows` owner. A closure wins; otherwise provider date hours precede branch date hours and weekly windows. Preview never reserves a slot or bypasses the locked mutation's reservation checks.
- Provider setup indicators describe profile, specialty and current/future weekly windows only. They are not credential verification, slot availability or patient authorization.
- A department journey shows permitted loaded stages from one native visit. Stage completion, clinical finalization and financial settlement remain independent. Device approval is not a live connectivity claim.
- Cashier day review uses native scoped payments/refunds by their own recorded dates. Refund grouping identifies the original payment method, not the unrecorded return method. The local cash-count worksheet is not a saved accounting close and does not include other till movements.
- Catalog installment examples use integer cents and explicitly identify final rounding. Patient invoice preview/issue remains authoritative for dates, snapshots and allocations. Refund confirmations read the native source payment; no independent financial history is manufactured.
## Patient tasks and administrative review — October23 module Phases5–6

- Portal Home combines own next appointment, consultation queue and complete issued-invoice obligations through native portal-link authorization. Released clinical records remain explicitly separate. Due, overdue and future sums retain currency and native financial semantics; a cashier/room link creates no payment or clinical access.
- SMSGate verification, reminder transport and invitation email are different channels. Configuration, queued, preview, accepted, delivered and read are not interchangeable. Unknown outcomes do not justify duplicate delivery. Patient identifiers/opaque cursors remain in memory; non-sensitive delivery filters may use URLs.
- Only pending onboarding logos auto-check: serial capped backoff, cancelled by logo identity/state/unmount. Unavailable states and exhausted cycles offer explicit manual checking. Saved setup fields remain owned by the existing draft state.
- Media, room admission/access and shared-model connection have independent status. Doctor permission and local patient view-only choice remain visible; temporary pointing never edits the clinical record. Existing server admission/expiry/permissions govern reconnect.
- Specialty documentation previews identify built-in content revision separately from saved clinic templates, capabilities and credentials. Publication review is a read-only aid before explicit native publish, never proof of safety, delivery or privacy from search indexing alone.
- Anatomy/dental first selection mounts their editor; visited editors retain their mounted state under one clinical form. Documentation composition may split into focused components without splitting autosave/version/lifecycle ownership.
- Backup inventory is read-only. Table-name similarity is not schema/source/configuration equivalence or deletion authorization. Preserve baseline, verified recovery boundaries, unknowns and private storage; never restore rehearsal data over original.
