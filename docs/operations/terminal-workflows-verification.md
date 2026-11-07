# Patient and assisted terminals — October 22, 2026

## Implemented scope

The user requested two clear terminal modes and explicitly chose identifier-only patient entry without a password or extra code. Normal approved kiosks now accept an exact patient UUID, clinic reference or email. Portal usernames are email addresses; there is no separate username field. Ambiguous and missing matches share a generic recovery message; public partial-name/directory search is absent. Matching is restricted to the device's branch. No portal account or staff login is created by patient entry.

Patient identification opens the existing device-bound kiosk session: two-minute API inactivity and ten-minute absolute lifetime, explicit Finish/change patient, current device/function restrictions, native booking/check-in/queue/bill owners and existing idempotent confirmations. Normal mode permits multiple tasks in that session. Existing strict-mode patient code-per-task behavior remains. The normal identifier-only policy means someone who knows an exact identifier could open its short kiosk session on an approved device; this is the user's selected fast-terminal behavior, not strong identity verification.

Authenticated staff mode searches branch patients by name, reference or contact details and selects a record to open the same action screens on the same terminal. It no longer forces the staff operator through the send-to-another-kiosk workflow. Staff selection requires current native staff assurance and appointments.manage; every subsequent staff-selected session request repeats authorization and identity checks. Bill access additionally requires billing.read. The source staff membership/user and device approval remain live dependencies. Strict patient code repetition is skipped only for this reauthorized staff selection. Existing separate Patient Stations reception assignment tools remain available.

The staff wrapper remains mounted across patient changes, preserving its two-minute interaction timeout; returning to patient mode signs out the assisting staff session. The patient session is a separate HttpOnly device-bound cookie. Exact-ID entry is not labeled as in-person verification or a full patient-portal login. Source methods are distinguished in audit events. No clinical chart access, payment-provider integration, permission grants or AI integration was added.

The UI uses existing Medframe branding, editable supplied patient illustration, shadcn controls, Tailwind tokens and circular identity placeholders. Patient entry has one clear field; staff mode has an explicit search and large selectable result rows. Existing review, confirmation, ticket, registration and bill screens are reused.

## Preservation and activation

Pre-edit source copies are private in `.medframe-runtime/terminal-workflows-source/`. The first checkpoint attempt could not connect because the local Docker infrastructure was stopped. Infrastructure was started using the existing launcher helper; the successful encrypted checkpoint is `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261022-182132-a89bd41`. Isolated clone `medframe_django_terminal_workflows_20261022_f9d673` verified 167 tables with `source_written=false`. No original-database restore or migrations were applied.

The existing `./medframe` launcher started API, worker, scheduler, media and web on the original database. API remains loopback8001; the unrelated project at8000 was untouched. Web uses `.next-local-dev` at localhost3000. No dependency additions, original account/password/MFA/grant changes, private-storage edits, public deployment, external messages or live money movement occurred.

Manual review created a synthetic clinic, two patients, departments, an approved kiosk fixture and an existing-style MFA-complete synthetic staff session. This is fixture preparation, not acceptance of MFA or physical device approval. The synthetic patient created one native laboratory walk-in ticket. After review, only synthetic device credentials/patient sessions/staff sessions were revoked, and synthetic membership/user/clinic deactivated. Audit and synthetic patient/visit history were retained. Original identities were not altered. The browser used a credentialless iframe, leaving the user's ordinary cookies/session intact.

Temporary localhost-only keyed bootstrap/preview routes and narrowly scoped SAMEORIGIN preview headers were removed. The exact pre-preview Next configuration was restored. Owned frontend restart clears the temporary route/module graph. No builds, automated tests, TypeScript/lint suites or repeated broad verification were run. Prettier formatted the five changed/new UI sources; Ruff formatted Python sources only.

## Graphify and Jev

Initial root Graphify query `KioskContent AssistedKiosk useKiosk` returned no matches; source inspection governed implementation. The refreshed focused AST corpus contains eleven kiosk UI and native identity/view/service/reception sources: 121 nodes, 279 edges, no extraction warning returned. Query `open_terminal patient_session AssistedKiosk`, budget1000, found99, showed31 and truncated68. The corpus was refreshed again after the focused boundary repair, retaining121/279. This is scoped source relationship evidence, not whole-repository coverage or runtime/security verification.

Planning Jev received sanitized public fast-terminal design context only: exact-ID entry on an approved kiosk, short scoped session and authenticated staff assistance. It selected `scoped`, confidence1.0, jev-1.14.0, usage452 input /34 output tokens. Completion Jev received sanitized descriptions of observed flows and explicitly unverified acceptance areas. It selected `bounded`, confidence1.0, usage394 input /31 output tokens. No actual identifiers, names, credentials, images, codes or private attachments were transmitted. These judgments guided scope/reporting and are not verified findings.

## Bounded native visual evidence

One native in-app-browser pass exercised the real `/station/kiosk` and Django routes with synthetic records; one necessary activation-blocker correction was confirmed in that same bounded continuation.

- Desktop1280×720: patient ID entry, welcome artwork, exact field/help, enabled action menu and explicit source/reference presentation rendered. Entering a synthetic clinic reference opened the correct patient without password/code.
- Native walk-in: selected Laboratory, reviewed and confirmed, received L-001. Do another task opened the same patient's bills without another code; native empty-bill state rendered. No charge was attempted.
- First Finish/change patient exposed a stale reception-boundary race: reset retained the old setup while receive polling restarted, and its403 discarded the fresh setup. The necessary activation repair clears setup immediately during reset, pausing receipt polling until the new boundary is loaded. Staff Change patient then returned to an empty search, and a later public Finish returned to the entry field with the old patient removed.
- Existing synthetic staff session remained available after patient-mode use. Staff terminal resolved Dr. Morgan Example, searched Alex, selected the synthetic result and opened patient action cards directly. No new staff sign-in or external handoff was required in that flow. This establishes staff menu/search/selection/switching, not a second complete staff booking/payment transaction.
- Return to patient mode completed staff sign-out. Exact synthetic email subsequently opened the correct patient without any remaining staff authentication dependency.
- Phone390×844: entry form remained usable, desktop illustration hidden, no horizontal overflow (document clientWidth375/scrollWidth375, reserved scrollbar within390px viewport). Exact email submission and subsequent Finish succeeded.
- Final browser error-log sample was empty. Review tab closed and viewport override reset.

Timeout expiry, strict-mode code enforcement, denied-role/revocation/ambiguity/race cases, separate portal-link email, UUID entry, registration, booking, appointment check-in, hardware printing, digital payments and a full keyboard/accessibility audit were not visually exercised. No security or complete end-to-end acceptance claim is made. Non-blocking duplicate Change patient controls in the staff menu and older bill-loading wording are logged in TERMINAL-WORKFLOWS-002; no extra polish cycle followed.

Final activation: owned frontend restart completed with web PID206224 on `.next-local-dev`; API180925, worker181113, scheduler181114 and media181115 remained running. Launcher Ready/status confirms localhost3000 and backend127.0.0.1:8001. The temporary routes are absent, and the serving frontend started after exact header configuration restoration.
