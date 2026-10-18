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
