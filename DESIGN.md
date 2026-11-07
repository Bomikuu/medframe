---
name: Medframe Clinical Workspace
description: A white clinical workspace built for focused patient care.
colors:
  navy: "#102A43"
  primary: "#102A43"
  medical-teal: "#0D9488"
  background: "#F7F9FC"
  surface: "#ffffff"
  muted: "#f8fafc"
  foreground: "#172B4D"
  supporting-text: "#586A80"
  border: "#E5EAF0"
  input-border: "#9AAABA"
  danger: "#b4233b"
  dark-background: "#101e2c"
  dark-surface: "#152637"
  dark-text: "#e8f0f6"
  dark-supporting-text: "#acbfce"
typography:
  headline:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Plus Jakarta Sans, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Plus Jakarta Sans, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: "20px"
rounded:
  control: "10px"
  panel: "12px"
spacing:
  compact: "8px"
  control-gap: "16px"
  form-gap: "24px"
  panel: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.control}"
    height: "44px"
  input:
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    height: "44px"
---

## Overview

Authentication uses the shared white, navy and Jakarta/Manrope form system. Staff and patient sign-in
share an unchecked Stay logged in checkbox and disclose the existing inactivity limit. MFA uses
the official shadcn Input OTP with six separate slots, numeric keyboard, full-code paste and
one-time-code autofill; recovery codes use an explicit alternate text field. Google uses its own
Identity Services button when configured, with clear loading/unavailable/error states and the
existing Medframe MFA step after Google identity verification.

**Creative North Star: A confident clinical desk.** Medframe is an Operate surface for clinicians documenting patient care. A cool neutral application canvas, white task surfaces, strong Manrope headings, Jakarta UI text, navy actions and teal selection make a recognizable clinical product. The October 19 reconstruction supersedes the earlier plain white visual system while preserving product behavior and customization.

The local Django application implements these tokens; current build, browser limitations, visual self-review and local cutover evidence are recorded in `docs/operations/visual-reconstruction-verification.md`. The October 22 user-supplied doctor illustration now accompanies the Medframe wordmark through shared Brand/BrandMark components. Saved clinic logos identify the organization in its selector and preserve their proportions.

## Colors

`apps/web/app/globals.css` owns default semantic CSS properties and Tailwind mappings. Django `medframe_apps/branding/services.py` validates/persists structured organization and personal settings. `features/branding/theme-provider.tsx` applies those values to the CSS owner before displaying the loaded workspace; portalled controls share the same root variables.

Precedence is platform defaults → clinic branding → permitted personal preferences. Light is the default independent of the operating system. Dark/system mode is explicit and saved. Primary actions require readable white labels in light mode; dark mode derives a pale action color with a navy label. Accent-based selection/focus mixes retain legibility. Clinical danger and warning meaning remain independent of branding. Color always accompanies text, status, or selection state.

The page canvas is #F7F9FC; sidebar, header and content cards are white. `muted` supplies the secondary gray surface. Shared inputs keep a stronger visible boundary than panel borders. Never introduce arbitrary CSS, scripts, external font URLs, or unvalidated property maps through settings.

## Typography

Manrope headings and Plus Jakarta Sans body/UI are loaded with next/font/google and self-hosted by Next.js. The default medframe preset pairs them; Manrope-only and Jakarta-only presets are available. Explicit legacy Inter/Source Sans 3/Noto Sans choices remain accepted and loaded. Standard body/control text is 15px, secondary is 13px, and the large preset is 16px. Page headings are 28–32px with bounded heading presets; section headings use 20px/600 and metrics 34px/700. Clinical paragraphs and textareas use generous explicit leading and preserve whitespace. Keep long text within a readable measure and allow Unicode names and notes to wrap.

## Layout

The desktop shell has a 248px default sidebar, adjustable between 224px and 280px; collapsed mode is 72px. Navigation uses the configured shadcn/Radix Sidebar: desktop icon collapse and a Sheet below 768px. Narrow screens retain a compact 64px header; navigation never wraps above the content. Main content is contained by default, with an explicit full-width preset. Header/density presets change spacing while retaining usable controls.

Patient forms separate identity, contact, emergency, and guardian information. Date, phone, sex, FDI identifiers, and structured statuses occupy widths appropriate to their content. Patient records use URL-backed permission-gated tabs. Consultations use persistent notes/diagnoses, dental, procedures and document tabs, with a patient context rail at desktop width and a disclosure below. Entry sheets preserve the single RHF aggregate; changing consultation tabs does not unmount registered sections. Long forms use normal document scrolling. Dashboard widget visibility, order, and widths are persisted per user and clinic.

## Elevation & Depth

Panels use restrained borders and flat white surfaces. An optional subtle shadow is `0 4px 12px rgb(15 45 74 / 0.06)`. Popups and protected-focus dialogs may use their shared elevated treatment. Do not wrap every clinical subsection in another card.

## Shapes

The default base radius is 8px; the current Tailwind mapping produces 10px `rounded-lg` controls and 12px `rounded-xl` panels. Radius presets change the central base rather than separate screen styles. Avatar controls and previews are circular. Clinic logos preserve proportions; medical images and documents preserve full framing.

## Components

Use the existing shadcn/Radix button, field, input, Select, Checkbox, Textarea, and AlertDialog owners. Lucide icons come only through `components/icons.ts`. Single-select popups remain authored; dates retain the accepted typed native date input, with full shrinking control width. Interactive controls retain visible keyboard focus, real labels, errors, and useful pending/disabled states.

`features/workspace/safety-provider.tsx` owns confirmations, navigation protection, and memory-only drafts. Save feedback distinguishes unsaved, saving, saved, paused/offline, conflict, completed, and finalized. Finalization and amendments preserve attributed revisions; a preview or selected image is not saved evidence.

The 2D chart is the full keyboard alternative to 3D. Both consume the same finding identifiers and surface vocabulary. The active permanent viewer uses Dundee anatomical GLBs with 32 explicitly mapped FDI tooth meshes and a detailed FDI 26 reference. Preserve source morphology and restrained material feedback. The model-first workspace places selected-tooth Findings/Treatments/History alongside the model on wide screens and below it on narrow screens. Surface selection remains conventional labelled controls because the assets have no validated surface segmentation. Primary dentition retains its 20-tooth 2D chart. Views, jaw visibility, isolation, reset and reference previews explain recorded data rather than diagnosing.

Private upload controls report real transfer/scan state, preserve uncropped clinical files, and allow only clean authorized downloads. Exact document versions stay attached to historical encounters. Logo/avatar previews use the same protected pipeline.

## Do's and Don'ts

- Preserve clinical readability, shared tokens, predictable navigation, and grouped expected-input fields.
- Verify default white, explicit dark, keyboard/2D, failures/conflicts, long content, and narrow layouts with synthetic data.
- Keep proposed treatment distinct from completed evidence and draft findings distinct from finalized history.
- Use the supplied brand mark unchanged. The editable illustration SVGs are simplified traces, not original vector source artwork. Never invent anatomical validation, diagnoses, metrics, notifications, or compliance claims.
- Do not crop clinical imagery into avatars or expose files through public object URLs.

## Clinical Batch 2 interaction owners

`features/dental/dental-chart-grid.tsx` is the shared keyboard chart in the editor, comparisons and portal; `chart-view.tsx` is its read-only snapshot composition. `reference.json` is generated from Django's FDI reference. The earlier schematic v1/v2 files remain preserved but are no longer the primary renderer. Anatomical asset provenance and calibration/validation limits live in `assets/dental/ATTRIBUTION.md`.

Record filters distinguish search criteria from clinical entry fields and use unique form IDs. Template guidance is visibly separate from entered facts. Plan history and patient releases show version/as-of information; patient reports remain labeled as submitted information.

The simpler portal uses the same validated tokens and shadcn/Radix owners. Its display preferences expose only mode/density. Theme changes apply tokens atomically through `useAppearanceTokens`; a short `data-theme-changing` phase suppresses intermediate color interpolation. Clinical semantic colors remain fixed. Private previews share `features/documents/document-preview.tsx`, retain full image framing, render one bounded PDF page at a time and provide accessible text plus original download fallback.

## Clinic operations

The operations agenda and queue extend the focused clinical desk with divided rows and grouped forms. Appointments, Queue, and Schedules are explicit navigation destinations. Date/time controls use the established native typed Input inside FormField; single choices use the canonical Radix FormSelect. Confirmation remains owned by SafetyProvider. Queue estimates show a range, setting-based explanation, update time, and disconnected fallback. Operational actions never imply clinical finalization. Patient appointments/queue retain the separate portal identity and authorized relationship switcher.

## Approved UI revamp — October 19, 2026

Shared composition lives in `apps/web/components/application`. Registry primitives are generated with the existing `radix-nova` shadcn configuration, using `radix-ui`; registry virtual `cn` imports resolve to the existing `@/lib/utils`. Existing Button/Input/Select/Checkbox/Textarea remain canonical. Sonner observes the existing root data-mode instead of installing a second theme authority. TanStack owns table column visibility; the server owns directory order, filters and keyset pagination.

Patient identity uses circular initials only when no authorized photograph is supplied. Clinical media keeps its full framing. Status badges always show readable text. Headers sit outside panels, page gaps are 24px, panel padding is 16–24px, corners use the existing 8–10px token family. Metric values are exact scoped query aggregates. A role without clinical read does not mount clinical widgets or patient tabs. The Dental Chart tab shows the existing finalized chart, separately from unfinalized consultation findings.

## Full dental editor (local review)

The local dental-editor extension opens across the viewport: individual teeth on the left, a large central canvas and a scrollable inspector on the right. Mobile keeps the canvas primary and exposes the inspector explicitly. Select and Comment tools have visible pressed states; numbered pins use existing navy/white interaction tokens and canonical Radix popovers. The header retains patient context, return navigation, real save feedback and the existing draft action. Do not shrink this editor back into a consultation card. Browser/visual acceptance is pending; see `docs/operations/dental-editor-verification.md`. Existing tokens and `.impeccable/design.json` remain unchanged.

## Reference-guided editor revision

The user's supplied editor reference pins the next surrounding layout: compact real-patient header and consultation navigation; ordered jaw/FDI tooth rail with an optional Universal display; central tool/camera controls and bottom preview strip; right tooth identity, surface choices and Findings/Treatments/History/Notes. Existing navy/teal/white tokens and the 3D anatomy remain authoritative. Source-derived transparent tooth previews are attributed Dundee renders. Measurement remains unavailable without calibration. This revision is active locally after the authorized REF-001 repair. REF-003/004 viewport/mobile visual defects and detector text-size advisories remain deferred rather than canonized as design choices or new tokens. See `docs/operations/reference-editor-verification.md`.

## Comprehensive visual reconstruction — October 19, 2026

Authority: `docs/requirements/medframe-visual-reconstruction.txt`. This replaces conflicting old appearance choices. The app remains an Operate surface; no marketing world or invented dashboard data is introduced.

The shared token owner remains globals.css, mapped to Tailwind through @theme. ThemeProvider applies validated clinic and user overrides, including separate heading/body font variables. ClinicLocaleProvider formats clinical timestamps in the authorized clinic timezone in both realms. OrganizationType and portal workspace expose this existing setting; document records expose existing uploader display names only after the existing authorization boundary.

MetricCard owns numeric summary emphasis and optional truthful navigation, with icon tints for blue/teal/amber/green roles. Dashboard widgets preserve visibility/order/width preferences and use different column proportions and compact actionable summaries. Patient identity is one compact surface with circular initials, concise metadata, primary consultation action and a secondary menu. DocumentCollection owns actual table/card presentations; version history uses the existing authorized paginated record query.

EntrySheet defaults to a 680px side panel, full-width on mobile. Its content is a container-query boundary. Booking and patient fields respond to panel width, not global viewport width. Shared select values truncate safely, labels remain outside controls, and actions wrap. Existing RHF owners, validation, unsaved guards and backend saves remain authoritative. Advanced record filters live in a Collapsible disclosure; applied filters are removable chips.

The dental editor owns 100dvh height. Its canvas has an explicit mobile height and local stacking context; model labels/pins stay below the mobile inspector. Header actions wrap and retain 2D/keyboard alternatives. All color/status changes are presentational and imply no new clinical diagnosis.

## Batch 4 financial communication surfaces

Billing uses a branch-scoped ledger list and a statement/action split on wide screens, stacking on narrow screens. Financial fields keep decimal-string entry with explicit PHP units, separate charge descriptions, quantities, discount and dates. Issuance, manual receipts, credits and refunds use distinct actions and confirmations; issued lines remain presentation-only. The patient statement shares the authoritative renderer while omitting staff reasons and internal fields.

Communications uses explicit patient/recipient selection before consent or reminder entry, safe fixed-message previews, purpose/channel choices and a real delivery queue. Preview is visibly labeled not sent; accepted and delivered remain separate. Unknown outcomes instruct reconciliation and have no automatic retry action. Patient reminders provide a separate opt-out destination. Existing semantic tokens, typography, shadcn/Radix primitives, Sheet geometry and profile/clinical-media rules are retained.

These surfaces are active locally in `.next-batch4` after the authorized trigger repair. Six focused desktop/mobile browser groups pass, including payment/refund/credit balances and the patient statement; the documented browser and history-scaling limits remain. See `docs/operations/django-batch-4-verification.md`.

## Batch 5 diagnostic extension — saved, inactive

Diagnostic request/inbox/selection and result/release UI extends the existing clinical desk and shared shadcn/Radix/Tailwind owners. Clinical files retain full framing; no new raster assets or visual identity were introduced. The development direction/unfinished finish verdict is in `.impeccable/surfaces/diagnostics.md`. Production prerender is blocked and no browser visual acceptance was performed; see `docs/operations/django-batch-5-verification.md` and deferred B5-001 through B5-005. This records source intent rather than a verified rendered design.

## Batch 5 activation evidence

Batch 5 now runs locally as `.next-batch5` after authorized blockers were repaired. Clinician reviewed-result desktop, center report/upload mobile and released diagnostic patient report mobile were inspected in the actual persisted workflow. They retain the existing clinical desk/shadcn forms and explicit center-vs-clinician authorship. Ten responsive captures across bounded confirmations show no recorded page overflow; the older mobile portal tab-strip limitation remains. No further polish or visual-world change was performed. Prior inactive/source-only notes are historical; B5-005 scope gaps remain. See docs/operations/django-batch-5-verification.md.

## Anatomy workspace extension

Batch 6 retains the clinical Operate system with a structure navigator, large neutral model viewport and grouped finding inspector. Teal denotes selection, not pathology. Camera labels use patient perspective; the anatomy vocabulary and exact mesh versions remain clinical metadata. Expansion uses the existing consultation form owner. Patient releases default to static reference/list presentation and disclose selected notes. The six 1440/390 captures establish readable patient history/release layouts and a working desktop pin workflow; expanded mobile/tall-inspector overlap remains deferred. See `.impeccable/surfaces/anatomy.md` and `docs/operations/django-batch-6-verification.md` for the partial visual verdict and limitations.

## Reference-guided anatomy editor

The user's October19 anatomy reference supersedes the earlier anatomy composition. A full-width patient/save bar and fixed viewport frame contain a grouped left navigator, large model canvas with floating camera controls and real camera thumbnails, independently scrolling findings inspector, and a right Medframe AI preview dock. Tablet/phone secondary panels use shared shadcn Sheets. The AI panel contains local-only preview text and disabled send/attachment actions; it generates no diagnostic advice. Clinical records and the existing save/completion/finalization lifecycle remain authoritative. This refines the anatomy surface within the existing visual world; it does not replace the application design system. Actual staged verification and minor deferred refinements are recorded in `docs/operations/anatomy-reference-ui-verification.md`.

## Shared toggle appearance

The October 20 explicit global-toggle request uses one shared pill track/thumb appearance for form Checkbox and Switch primitives, with the incumbent navy selection, input-border neutral, visible keyboard focus and disabled/invalid states. Checkbox retains its checkbox and indeterminate/form behavior; Switch retains switch semantics. Selection menus and mutually exclusive radio choices keep their native patterns. Appearance settings use the same shared control rather than raw native checkboxes. Device/department form state continues to save through its existing owner. See docs/operations/device-station-refinement-verification.md for actual scope and verification limits.

### Clinic websites — Batch 7

The builder remains an Operate surface in the clinical design system. Public clinic pages are a separate Persuade surface with explicitly authored copy, bounded navy/teal/forest/clay palettes, modern sans or editorial serif typography, generous section spacing and optional approved clinic imagery. Preview uses container responsiveness; the public hero overrides the dashboard-only h1 scale. Empty sections stay hidden publicly. No automatic patient/provider-record content, fabricated social proof, clinical images, arbitrary HTML/CSS or tracking scripts. See the Batch 7 spec and actual verification for publication/privacy and custom-domain limits.

## Phase5 setup and reporting clarity

The first-run checklist promotes one real next action and precedes empty metrics.
Setup review preserves name/email casing and uses explicit provider/day labels;
clinic logos keep proportions through the existing private preview. Templates
show standard/enabled/historical specialties with save/dirty/discard feedback.
Reports use explicit inclusive completed-day ranges and equal previous periods;
current balance snapshots have their own as-of clinic date/time. Date changes
apply on request, keeping old report context until applied. Shared white/navy/teal,
shadcn forms, Tailwind and exact accessible tables remain authoritative. Actual
verification and retained visual limits are recorded in the Phase5 evidence.

## Patient profile clinical overview

The doctor-facing default is Overview, with explicit prior tab links preserved.
Five permission-filtered groups replace the flat section row; detail tabs remain
under Clinical, Charts, Care & billing and Records. The existing clinical snapshot
leads identity/contact information. Allergy attention keeps actual review text;
semantic blue/teal/amber/green accents and restrained Lucide icons add hierarchy.
Existing clinical/draft/authorization owners remain. Profile surface/evidence:
`.impeccable/surfaces/patient-profile.md` and
`docs/operations/patient-overview-refinement-verification.md`. Large financial
value wrapping on narrow phones and remaining guard browser acceptance are deferred.

## Header workspace selection

Clinic & branches lives in the header account menu and opens a focused shared
Dialog. The sidebar picker is removed. Authorized clinic selection is staged until
Switch clinic; current permitted branches are informational, preserving existing
page-specific branch owners. Cancel/Escape preserve context; closing restores
account-trigger focus. The existing workspace navigation/unsaved-change guard stays
canonical. No new global branch semantics or visual world. All three focused
browser groups pass in one round; one lint warning remains deferred. Actual
runtime/preservation: docs/operations/header-workspace-switcher-verification.md.

## Patient profile photo editing

The circular patient avatar is an editable camera control for authorized clinical
writers with document permission. Upload/Change opens the same protected editor
as Clinical Station; separate Remove opens confirmation and unlinks the profile
pointer while retaining the original file. Patient photo previews/display are
circular; clinical originals retain full framing. Shared shadcn Dialog/UploadControl,
private scans/downloads, version checks and backend permissions remain canonical.
Two profile browser groups have staged passing evidence; three existing Station
backend checks stop before photo assertions with403, logged without repair.
See docs/operations/patient-photo-upload-verification.md for actual limits/runtime.

## Central patient actions — current profile contract

One Patient actions button and its circular-photo shortcut open the same searchable
card directory. Clinical care, Visits & payments and Patient record use existing
navy/teal/information/financial tokens. This supersedes earlier direct write-button
placement in header/tabs. Profile tabs browse records; native editing forms and
confirmations live in the action workspace or their dedicated editors. Read links,
filters/downloads and form Save/Cancel remain contextual. Permissions are native;
read-only context is presentation only. Existing clinical/financial/portal/file
mutation owners, version checks and locale remain. Native appointment/invoice
selection keeps patient identity, availability and received-money semantics explicit.

A sticky header contains the canonical Close target. Five groups have staged
passing browser evidence and3 appointment-scope tests pass; completed reschedule
and final Continue/service-reader-card browser acceptance remain unverified.
See docs/operations/patient-actions-hub-verification.md for actual tools, failures,
activation repair, source-only refinements, preservation/runtime and rollback.

## Shared loading presentation

LoadingInformation centers its copy, section icon and visible teal spinner. LoadState centers this shared presentation in the available content region; clinic bootstrapping centers it in the viewport. Existing slow-request/retry and accessible status behavior remain. Spinner motion respects reduced-motion preferences.

## Clinic onboarding experience refinement

The introduction is a photo-led white card with a generic generated clinic reception, replacing the simulated app screenshot. Quiet outlined circles frame the page. Setup uses a shared card shell, interactive saved/unlocked steps, a reduced-motion-aware active dot, and a compact six-step phone navigator. Specialty cards use restrained Lucide icons and explicit selected checks. Forms show field errors and save/network feedback; email/phone normalization keeps canonical server values. Verification uses separate digit boxes, explicit busy/sent/error states and a resend countdown. Password guidance separates the required length from optional variety suggestions; native server password/MFA policy stays authoritative. Day-specific hours use existing draft JSON and native PracticeDay rows with legacy common-hour fallback; no schema migration. Contextual help explains each step, save/resume and local development mail.

## Session recovery presentation

Expired-session recovery uses the shared centered RecoveryState card: shield icon, heading, explanatory text and an emphasized realm-correct sign-in action. Retry/back remain secondary; workspace/sign-out controls use the More recovery options disclosure. Portal bootstrap/recovery fills the available viewport and has no dangling sign-in link. Existing session policy and recovery mutation owners remain.

## Contextual page-level errors — supersedes earlier recovery actions

Expired staff/patient sessions show one realm-correct Sign in action; Station expiry opens the code-entry Station instead. No Back to collection control remains. Advanced browser reset is available only for blocked/unknown access, never alongside the expired-session sign-in action. No-clinic/no-patient-connection states explain the signed-in context and suppress a workspace action that would loop. Shared AccessRequired and RecordUnavailable extend RecoveryState; compact embedded failures avoid a second card. Framework not-found and unexpected/root-layout failures use the same visual hierarchy and native home/retry actions. Kiosk/TV connection errors keep their device-specific controls and public-display typography. Field-level validation remains associated with the affected field.

## Clinic setup — reference layout refinement

The October 20 onboarding reference guides the existing setup flow: a compact Medframe/help header, connected icon step rail with true saved completion count, a wide bordered form card and a contextual “Why this matters” rail. The background uses sparse teal circles and diagonal lines. Preserve the canonical step order and native autosave/account guards. Desktop uses three columns from xl; tablet retains a navigation rail with expandable guidance after the form; phone uses six compact step icons and one content column. Guidance describes actual setup behavior rather than promising configured clinical permissions or communications. No pre-account avatar menu is fabricated.

Clinic setup save status and Save and exit belong in the persistent page header. Keep the actual form-owned save/status handlers via the header slot; do not duplicate persistence logic. At phone widths, use a second compact header row. Account/review exit actions use the same header and existing guards.

Onboarding specialty selection uses descriptive multi-select cards with a teal border/background and explicit selected check, not color alone. Keep descriptions in presentation metadata; catalog codes and clinical authorization are unchanged. Search by name or care description preserves hidden selections.

## Patient-first registration

Public branch registration is email-first: contact ownership code in six separated cells, minimal patient details, then an explicit clinic-review state. Use the onboarding circle/line canvas and white/navy/teal cards, without a staff shell. Do not imply verified email is verified patient identity or permission to see records. Distinguish registration pending/accepted/declined from account activation. Mobile verification remains unavailable until SMS configuration. Staff use Patients → Registration requests for one reusable branch link and a focused review modal; accepted requests use native invitation/account/MFA flows. Duplicate matches require explicit authorized linking and an identity/guardian attestation. Do not expose matching records to the applicant or invent new clinical access.

Registration supports configured SMSGate contact verification and the shared official Google sign-up component. Disabled options explain missing configuration and leave email available. Mobile proof asks separately for an invitation email and labels that email unverified. Google first-factor proof still leads to clinic review and native account/MFA activation; existing accounts are never merged by matching email alone. SMS status distinguishes queued/gateway acceptance from confirmed delivery.

Contact entry uses the shared PhoneInput: separate calling code (default Philippines +63), numeric keyboard, digits filtered on entry and paste, spaced national display and compact international form values. Do not require patients to type the +63 prefix twice or include the local leading0. Other calling codes remain editable; SMSGate verification stays PH-mobile-only. Email inputs consistently remove spaces/lowercase and retain existing validation; PH clinic postal code is four digits. Profile/contact forms share the same control rather than unrelated masks.

Patient profile photos use a single circular preview and direct upload. A successful clean upload automatically becomes the portrait through the existing versioned endpoint; no clinical-image gallery, second image selection or Use selected photo action. Keep the old portrait until replacement succeeds, show scan/update/error status, and keep Remove photo. The original private image stays in the clinical record; profile display alone is circular. Hide editable document labeling for this fixed patient-photo upload context.

Reason fields use shared context-specific suggested answers with explicit selection/checkmarks and Other for custom text. No default reasons, automatic diagnoses or placeholder audit assertions. Preserve required/optional semantics and original form ownership. Start consultation is a compact dialog at the existing consultation-start route, retaining patient/provider/queue context, allergy/medication review, draft/unsaved guards and the native encounter mutation. Closing returns to the patient record/directory. The clinic-wide parallel/intercepting modal slot was removed during navigation recovery; it is not the current interaction contract.

Forgot-password entry and confirmation share the same staff/patient component and correct realm return link. Use restrained key/mail icons, explicit entered-email/change action, link-expiry/latest-message guidance and a resend control with 60-second client cooldown. Per the October20 user amendment, unknown/inactive account emails produce an explicit inline error; only a successful request advances to the requested-link state. Backend throttling stays authoritative. On native localhost development with Mailpit, clearly explain captured email and link its inbox; hide this help in production. Do not claim email delivery from request acknowledgement alone. The user explicitly requested missing-account notification in recovery.

### Workspace loading consistency

Clinic and Clinical Station startup gates share `WorkspaceLoading`: full-viewport centering, one loading group, stage-specific title and short copy within the same container. Keep native access gates separate; avoid a new visual screen per gate. Render existing recovery states on failure. Page-section loading stays within its section and action progress stays on its button; do not animate a second Refresh icon during initial section loading. The Next development badge is hidden so it cannot compete with product progress. See `docs/operations/unified-loading-verification.md` for scope and actual visual acceptance.

### One clinic Dashboard

Dashboard now owns reporting formerly split with Analytics. Use one branch/date selection, bookings/patient activity first and Financials second. Prior-period charts must plot actual prior daily values and name both date spans. Patient stock and financial balances are current snapshots; registrations/bookings/payments are date-based flows. Preserve scoped totals, explicit no-baseline wording, optional clinical widgets and exact tables. See `.impeccable/surfaces/clinic-analytics.md` and actual bounded verification.

### Staff administration and onboarding

Staff & Access unifies membership/doctor-profile/module settings under clinic administration. Circular private portraits and compact access summaries lead to focused Manage/Invite modals; role/active/Station-only controls use Switch. Staff invites use recipient verification, resumable profile, native identity/MFA and final authorized acceptance. Full permitted tools, approved-Station-only mode and billing level remain distinct from patient grants. See `.impeccable/surfaces/staff-access.md` and actual verification before claiming authenticated acceptance.

Provider availability/calendar follows .impeccable/surfaces/provider-calendar.md: day/week time grid and agenda, explicit configured hours/timezone, booking selection separating scheduled identity from actual queue service, native action owners, and a semantic weekly schedule table. CALENDAR-001 records short-block secondary text clipping; no complete authenticated visual/behavior acceptance claim.

Online appointment rooms follow .impeccable/surfaces/online-appointments.md: patient PIN entry, native doctor entry, dominant video with compact controls/timer and a shared chat/files rail. Ending and leaving use separate confirmations. Only entry/conversation/files presentation and missing-room recovery have visual evidence; native in-call behavior remains CALL-001.

Scheduling now follows the weekly/month refinement in .impeccable/surfaces/provider-calendar.md.
Use written dates (November 11, 2026) for user-facing date labels; keep
ISO values for transport and date comparisons. Shared DateInput owns written scheduling entry
labels with a native platform calendar, and DurationChoice owns suggested visit lengths plus Other.
Apply this convention to touched legacy workflows rather than claiming a completed global retrofit.
Calendar day numbers remain numeric within a clearly named month/year. Native schedule, reservation,
version and permission owners remain authoritative.

Online appointment refinement retains the current clinical desk tokens. CallWorkspace owns
room layout; CallStage owns media framing; ConversationPanel is presentation with the native
CallConversation request owner. Show media connection separately from camera preference, preserve
drafts when the panel is hidden, and label file scans explicitly. Use the shared Dialog/FormSelect
for device settings and written dates/clinic timezone. See .impeccable/surfaces/online-appointments.md
and actual bounded evidence; synthetic UI does not establish a validated live clinical call.

Online appointment waiting rooms separate PIN acceptance, device preflight, doctor admission and
appointment start. Use the shared room surface guidance for optional self-reported readiness, local
microphone meter and explicit speaker confirmation. Pending patients have no conversation/media
access. Public connection metadata describes configured profile only. See actual phase evidence in
docs/operations/call-admission-readiness-verification.md; hardware/native/internet acceptance is open.

Online appointment continuity uses actual connection-quality/reconnect feedback and a mounted,
collapsible doctor clinical overlay. Reuse clinical saves/leases/versions and patient context rather
than parallel notes. Review/share next steps explicitly; the end view retains already-delivered
instructions and directs released records and follow-up to the native portal. Room expiry remains
authoritative. See .impeccable/surfaces/online-appointments.md and actual phase evidence.

Doctor Station patient actions follow .impeccable/surfaces/clinical-station.md: stable patient header,
circular native portrait, safety overview, authorized recent patients, guarded switching and one
searchable grouped hub shared with the open consultation. Native clinical/visit/payment owners remain;
services are read-only, payments require existing doctor/account/device authority. Exclude refunds/
admin/access grants. Synthetic visual evidence only; native acceptance remains STATION-ACTIONS-001.
See docs/operations/station-patient-actions-verification.md for actual scope/evidence/graph limitations.

Clinic sign-in settings follow .impeccable/surfaces/clinic-security.md. Use three accessible native
radio cards for Strict, Password only and Remember for30 days; show selected/current/effective modes,
password-confirmed changes and explicit inline saved/error/conflict feedback. Keep browser trust
opt-in in the existing six-cell MFA form and separate from Stay logged in/session expiry. Native
permissions and assurance are authoritative. Existing clinics default Strict; platform accounts stay
Strict. See docs/operations/clinic-sign-in-policy-verification.md for actual bounded evidence/limits.

Reference-guided Provider schedules uses .impeccable/surfaces/provider-calendar.md: weekly table,
compact real window rows and resource/date panels with in-page section navigation. Preserve existing
shell/navigation, written dates, native scheduling rules and permissions; use circular initials when
provider photos/specialties are absent. ScheduleSection owns this surface's section header variant,
while DateAvailability retains native form persistence and exposes reusable fields/list. Phone page
overflow is deferred as SCHEDULE-REF-001; native acceptance stays002. See actual phase evidence.

Provider schedules now reuse StaffAvatar and the current staff portrait returned by native scoped
setup, with circular compact framing and initials on absent/failed loads. Keep private image access
and current-provider visibility; never use patient-document image IDs for staff portraits. See
schedule-provider-photo-verification.md for actual fallback-only visual evidence and native gaps.

Doctor/patient identity fields reuse PersonAvatar/PersonIdentity with circular private photos or
initials, and typed FormSelect person options that retain names/references and typeahead text.
Do not derive identity type from a label or broaden photo access. Calendar live changes invalidate
snapshots by revision; background updates retain mounted content and block stale actions without
replacing the selected record with a loading panel. See appointments-live-identity-verification.md.

Appointment changes open AppointmentEditorDialog in the current viewport using the original
BookingForm owner, current booking date and clear read-only identities. Room entry states exact
appointment/opening dates and timezone; Request reschedule opens only an authorized patient's
matching booking in the portal and requires native confirmation. It does not imply a pending request
was sent. See appointment-edit-room-recovery-verification.md for actual visual/native gaps.

Month appointments keep fixed-height cells and one small person preview. Date/count/View all opens a
scrollable, paginated day list using native date/provider/status scope; details and editing reuse their
existing owners. Preserve calendar context on close. See calendar-day-modal-verification.md.

Pre-admission appointment entry now uses the supplied split reference: generated decorative navy
clinic interior on desktop, focused schedule/PIN/reschedule card and secondary doctor entry/help.
Phone keeps a compact brand and six responsive code boxes. Image uses native static import and HTML
text; exact opening dates/permissions remain factual. See waiting-room-reference-verification.md.

Online appointment rooms now use a focused full-viewport shell, preserving the established clinical tokens and dark media surface. Shared shadcn overlays expose secondary tools; the single mounted nonmodal conversation dock avoids draft loss and keeps call controls reachable. This surface exception replaces earlier natural room-page scrolling, without changing ordinary clinic page layout. Evidence: docs/operations/focused-call-workspace-verification.md.

Interactive call models preserve the full-viewport room: shared model fills the stage, ongoing media stays mounted in a collapsible tile, and chat retains its existing owner. Doctor focus uses teal, patient pointer amber, with explicit role labels. Shared shadcn tools expose Parts, camera views and selection modes. Patient view-only is the default, and meaningful transitions use in-room notices rather than camera-event toast noise. Generic presentation remains separate from saved clinical data. See docs/operations/interactive-call-models-verification.md for scope and actual native/GPU limits.

## Appointment lookup and current branch — October21

Current branch selection belongs in the header's Clinic & branches dialog. Appointments consumes that branch without another selector. PatientSearchDialog is the shared modal suggestion owner for navigation and booking selection, with circular portraits/placeholders and explicit states. Appointment summary cards use existing semantic icon tints and border/shadow hover without implying a click action. Instant booking shows its actual link/PIN immediately and labels manual closure instead of presenting a scheduled interval. Existing shared primitives and clinical record owners remain authoritative; see docs/operations/appointment-flow-verification.md for limits.

## Branch context placement — October21

Remove duplicated page-context branch selectors and their empty panels. The header chooser is the shared owner across clinic screens; compact signed-in Station uses the same dialog through HeaderBranchControl. Device-bound Station context is read-only. Persisted Assigned/Registration/Device branch fields and service/website configuration remain distinct from page context. Branch transitions retain the unsaved-work guard and reset branch-scoped collection state. Actual verification and deferred subtitle follow-up: docs/operations/header-branch-verification.md.

## October 22 interface cleanup

Use one result count per collection view, one primary open destination per consultation card, and a single entry control for each diagnostic request form. Group invoice lookup and filter totals with invoices. Avoid an outer panel around already-contained calendar/queue content; retain real task boundaries. Device connection instructions belong in an expandable native disclosure. Shared page headings reserve enough width for their title before action groups wrap. Preserve essential clinical, consent, financial and access distinctions when shortening copy. See `docs/operations/ui-cleanup-verification.md` for actual review coverage.

October 22 follow-up: keep empty select choices visibly named while retaining their domain values, omit cursor footers with no destination, distinguish initial and filtered empty states, and let selected Appearance tabs carry their own section name. Reuse written-date controls for report/invoice filters and keep loading copy specific to the route while preserving the shared container. See ui-refinement-verification.md for actual acceptance and date-entry uncertainty.

### Contextual illustration library — October 22

Use `MedframeIllustration` for decorative onboarding, records, appointments, documents, staff and notification empty states. Keep illustrations secondary to instructions and actions; retain compact Lucide icons for controls and clinical status. Same-origin SVG `<use>` instances inherit `--mf-*` palette variables; their path data stays outside JavaScript. The original traced shapes and skin colors are preserved. The library is decorative, never a patient portrait or clinical anatomical model. See `apps/web/public/illustrations/medframe/README.md` for source and palette details.

### Patient terminal modes — October22

Patient-facing entry has one exact ID/clinic-number/email field and one Continue action in a calm bordered card, with the supplied patient illustration supporting the task on desktop. Staff assistance has an explicit authenticated search and selectable identity rows with circular placeholders. Once selected, both modes reuse the existing large action cards and native journey screens. Do not imply that an ID-only terminal session is a verified portal account login. Keep patient switching, busy/recovery states and inactivity clearing visible; no patient directory appears in public mode. See terminal-workflows-verification.md for actual native visual coverage and limitations.

### Shared feedback and terminal refinement — October22 Phases1–2

Preserve the existing centered loading/recovery composition and contextual refresh notices; generic copy cannot guarantee draft preservation. A single terminal patient bar carries identity/reference/entry-method context across menu, review and result. Clear-patient actions differ from explicitly labeled staff sign-out. Confirmed-action summaries are quiet divided rows rather than a second tile grid, and never label a cashier ticket as payment. Details and remaining visual limits are recorded in improvements-phase-1-2-verification.md.

### Clinical overview hierarchy — October22 Phase3

Patient Overview leads with recorded clinical context and recent saved care, with upcoming appointments alongside. Demographics/contact support and activity totals are secondary expandable information. Preserve the five record groups and centralized Patient actions modal. A saved draft must not imply live treatment or current editing ownership.

### Narrow scheduling — October22 Phase4

Below the desktop breakpoint, weekly availability becomes a day selector and provider-hours list. Keep the seven-day table on desktop. Both read the same native closure/override/effective-date rules; hours are not a promise of bookable capacity. Keep screen-reader labels inside positioned scroll boundaries rather than hiding global document overflow.

### Setup and team access — October23 Phase6

Use a quiet, divided access summary directly before staff invitation/save/account decisions. Keep workspace/branch and billing/clinical capabilities distinct, with grant/device limits visible. Delivery and call configuration belongs in progressive disclosure, not another metric grid. Patient request status leads with its actual state, a copyable reference and concrete next steps. Preserve the existing white/navy/teal world, circular identity controls, semantic status colors and focus-visible behavior; no new animation or decorative setup shell. See improvements-phase-6-verification.md for scoped visual evidence and open acceptance.
