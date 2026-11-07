# Reference-guided Station entry UI — October 22, 2026

## Design and scope

The user requested the supplied Station reference and explicitly invoked design-taste-frontend. This is a preserve-mode refinement of the existing public Station entry surface, using that skill's landing/entry composition guidance rather than replacing the product's design system. Design read: clinic staff/device setup; calm, airy navy/teal split layout, supplied brand/artwork and focused native pairing card. Dials: DESIGN_VARIANCE 4, MOTION_INTENSITY 2, VISUAL_DENSITY 3. Existing Manrope/Jakarta, Tailwind, shadcn/InputOTP and Lucide remain; no dependencies or generated artwork were introduced.

Incumbent audit: existing supplied pairing illustration and native approval/clinician/kiosk/display/recovery states; fixed-width code cells; plain two-column layout, full-width header divider and little background expression. Preserve state owners, security copy, eight-character constraints, code normalization, actual submit/approval/navigation and existing recovery actions. Target the reference's soft circles/dots, image-led left column, teal second headline line, elevated white pairing card and scoped roomier cells.

`StationEntryLayout` now owns static presentation, with decorative noninteractive circles/dots hidden from assistive technology. The compact transparent header retains the shared user-supplied brand. Desktop retains illustration/copy on the left and the real pairing state on the right. Mobile explicitly places the pairing card first, illustration/introduction below. Semantic theme tokens and muted dark variants remain; no animation library, continuous motion or extra data panels.

The pairing form adds an existing-family device icon, clearer heading/helper hierarchy, a label connected to the real input, an eight-column fluid code row, full-width primary action with busy feedback, and a quieter icon-assisted help footer. Recovery stays collapsed and its old top divider is suppressed locally, without changing the shared recovery component. Active-device and pending-approval branches retain their native owners.

Shared StationCode accepts optional `id` and `size="large"`; the default branch retains prior dimensions/corners and the same value/paste rules for other callers. No backend, pairing/session authority, polling policy, URL, expiry or physical-approval change. The reference's QR-scanner button was not reproduced as an inert control; the current native flow accepts pairing codes. No QR scanning or generation was implemented. The supplied scene's example code remains explicitly labeled decorative.

## Preservation and actual tools

Pre-edit touched source is preserved under private `.medframe-runtime/station-reference-source/`. Fresh encrypted checkpoint `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261022-134203-a89bd41`; isolated clone `medframe_django_station_reference_20261022_c6a914`, 167 tables verified, `source_written=false`. No original credentials/MFA/permissions/data resets, migrations or fixtures.

Initial existing-root Graphify query `StationEntry StationCode AccessCodeForm SessionRecoveryOptions` with budget 200 returned no matches. Current source governed inspection. Focused refreshed 9-source AST corpus: 52 nodes, 93 edges. Query `StationEntryLayout StationEntry StationCode SessionRecoveryOptions`, budget 240, found 29, showed 8 and truncated 21. Parser warning persists for ordinary StationEntry JSX copy containing Devices & Stations, now near line 149, with partial extraction/two symbols. Native page rendering does not share that error; this graph is not complete repository/runtime/asset-semantic coverage. The existing extraction limitation remains logged rather than changing working JSX to satisfy the graph parser.

Jev received sanitized public design context only, including the requirement to retain native pairing and avoid an inert scanner. Selected `preserve`, confidence 1.0, model jev-1.14.0, usage 415 input / 33 output tokens. No screenshot, patient information, credentials or private attachments were transmitted. The choice informed scope, not verified behavior.

## Bounded native visual evidence

One actual `/station` in-app-browser pass viewed the default light page at desktop 1280px and phone 390px. Desktop shows the supplied artwork, restrained patterns, two-color headline, recovery disclosure, native pairing card and all eight code cells; Connect is in the initial viewport. Entering synthetic `abcdefgh` normalized visibly to `ABCDEFGH` and enabled Connect. No submission was made.

Recovery was opened and closed; existing Open my workspace and Sign out of this browser actions were visible but not activated. The initial role=button automation locator did not match the native summary even though the accessibility snapshot labeled it a button; retargeting its visible text opened the disclosure. This was a locator correction, not an app-code repair or new visual round. Later browser fill('') removed one character rather than clearing all; no clearing behavior claim is made and no input-handler repair was attempted. The tab was closed without submitting any code.

Phone: card first at x16, y104, width343, bottom606px; eight fluid slots approximately34.1×44px. Document scrollWidth375px versus viewport390px/reserved scrollbar, so no horizontal overflow observed. Connect and the help text remain visible before the introduction/artwork. Screenshot confirms retained readable hierarchy and action spacing. Browser error sample empty. Viewport override reset and review tab closed; no temporary product routes were created.

No builds, automated tests, TypeScript/lint suites or Lighthouse/performance benchmark were run. Prettier formatted the three supported source files. Forced dark mode, other device states, actual invalid-code responses, approval, clinician entry, paired kiosk/display and keyboard-only full flow were not exercised; this is not end-to-end pairing acceptance. No visual defect repair loop followed the pass.

## Activation

Changes are active through the current `.next-local-dev` server's normal refresh. Owned launcher status: API1823124, worker1823256, scheduler1823257, media1823258, web1854463, infrastructure healthy. UI `http://localhost:3000/station`, original Django backend loopback port8001. No restart was necessary because no environment or temporary routes changed. Previous source copies provide selective rollback; do not reset the dirty tree or database. Other previously deferred issues remain deferred.
