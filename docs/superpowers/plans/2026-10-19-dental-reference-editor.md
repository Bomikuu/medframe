# Reference-guided dental editor

User direction: match the supplied editor screenshot's surrounding interface while preserving the existing 3D model. Use individual tooth images or existing anatomical assets. Work natively, no subagents; readable components, Prettier and Tailwind. Preserve current clinical/save/permission/history owners and the prior build. Verification is one focused accumulated pass; log issues without a repair loop.

Reference: `/tmp/codex-clipboard-c34d3e71-7556-46fb-968e-c643cf2f38df.png`. Mode: Operate. Direction is pinned by the screenshot: compact patient/action header, consultation navigation, organized left tooth rail, spacious center canvas/toolbars and bottom view strip, structured right inspector with tooth preview and surface choices. Keep the white/navy/teal identity and current anatomy. Do not copy illustrative patient details or invent clinical measurements.

- [x] Preserve source/build and render 32 transparent tooth previews plus five view thumbnails from the licensed existing GLB. Record attribution/modifications; do not download additional assets unnecessarily.
- [x] Share viewport state between navigation and viewer. Implement working view tiles, jaw/isolation, label toggle, rotate/zoom/pan and canvas expansion. Measurement remains explicitly unavailable without calibration.
- [x] Add focused navigation/header/tooth-preview/surface components; retain existing RHF finding entries, point notes, read-only history and save/finalization callbacks. Use actual patient identity/status, never the sample image's fabricated data.
- [x] Format and run the single build/lint/detector pass. Build is blocked by REF-001, so browser confirmation did not run. Log REF-001/002; do not silently repair or retry.
- [x] Record actual results, maintain pending design/behavior docs and save reviewable source with rollback preserved.
- [ ] Pending user choice: add the missing shadcn Switch, perform one focused confirmation and activate locally, or leave findings deferred.
