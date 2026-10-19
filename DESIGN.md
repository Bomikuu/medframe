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

The local Django application implements these tokens; current build, browser limitations, visual self-review and local cutover evidence are recorded in `docs/operations/visual-reconstruction-verification.md`. The original concept-11 logo asset is unavailable. A Lucide HeartPulse medical symbol accompanies the Medframe wordmark without claiming to reproduce that original asset. Saved clinic logos identify the organization in its selector and preserve their proportions.

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
- Do not claim the companion mark reproduces the unavailable original logo; never invent anatomical validation, diagnoses, metrics, notifications, or compliance claims.
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
