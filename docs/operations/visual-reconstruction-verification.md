# Visual reconstruction — October 19, 2026

## Delivered

This is the comprehensive UI batch requested in `docs/requirements/medframe-visual-reconstruction.txt`, implemented natively without subagents. It does not advance the backend roadmap.

- Manrope headings and Plus Jakarta Sans UI text loaded through `next/font/google`; cool canvas, white task surfaces, navy actions, teal selection, semantic status colors and readable secondary text. Appearance settings retain light/dark/system, layout/density controls and explicit legacy font selections.
- Stronger brand, organization/logo selector, sidebar navigation and compact account header; consistent staff auth, recovery and patient portal surfaces. The companion Lucide HeartPulse symbol does not reproduce the unavailable original concept-11 asset.
- Real-data dashboard metrics and purpose-specific widgets; consolidated patient identity/actions, directory and record tabs. No fabricated statistics or clinical content.
- Documents table/cards, advanced filter disclosure and removable criteria, file identity/status, guarded upload/version entry and authorized version history. Protected previews and full clinical image framing remain intact; profile controls are circular and clinic logos retain proportions.
- Booking reorganized into patient/provider, visit details, schedule and optional notes in a 680px desktop Sheet. Fields respond to container width; mobile uses one column with visible cancel/submit actions. Registration, schedules, templates, queues and consultation sections use the same form system.
- Dental editor CSS removes the inherited height cap, constrains HTML model labels below overlays, reserves a mobile canvas region and wraps actions. These source changes are shipped with the browser acceptance limitation below.
- Authorized workspace/portal responses expose the existing clinic timezone for displayed timestamps; document summaries expose the existing uploader name. Branding accepts the new font presets/default colors. No migration or new clinical service was introduced.

Actual shadcn/Radix primitives remain the component owners. Source uses Tailwind, focused React modules, Prettier and Ruff.

## Graphify and Jev evidence

Graphify was used to map shared form, shell, patient, theme and document owners before implementation, with vocabulary-expanded bounded queries verified against source. The final directed structural graph covers 188 tracked frontend files: **1,051 nodes, 4,212 edges, 43 communities, zero external extraction tokens**. No dangling graph edges were found. Generated GraphQL/build/public assets and the Django backend were outside that graph scope. Two files produced no symbols (`components/icons.ts`, `playwright.config.ts`), so the map is not an exhaustive dependency proof.

Graph artifacts are ignored at `graphify-out/graph.json`, `GRAPH_REPORT.md`, `graph.html`, with a saved incremental manifest and cost tracker. The report includes numeric cohesion, community labels, god nodes, surprising connections and suggested queries. Query outputs and the graph summary are retained in the review directory.

Jev 0.7.0 used authenticated TypeSafe `jev-1.13.0` with sanitized brief/source observations only. Its structured choice prioritized `form_geometry`, confidence 1.0; usage **580 input / 54 output tokens**. This is prioritization evidence, not visual or clinical verification. No patient data, credentials or private files were submitted.

## Actual verification

| Check                                    | Result                                                                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Final production build and TypeScript    | Passed, `.next-reconstruction`                                                                                                          |
| Final frontend ESLint                    | Passed, zero errors/warnings                                                                                                            |
| Scoped backend Ruff                      | Passed                                                                                                                                  |
| Branding and record-filter backend tests | 12 passed in 3.071 seconds                                                                                                              |
| Final route geometry sweep               | 128 route/width captures across 32 named views at 1440, 1024, 768 and 390px; no recorded page overflow, field overflow or label overlap |
| Booking interaction                      | Passed: widths, fields, unavailable-slot state, disabled submit and cancel                                                              |
| Registration Sheet                       | Passed: labelled fields and 1024px geometry                                                                                             |
| Documents interaction                    | Passed: advanced filters/chips, cards/table and history dialog                                                                          |
| Appearance interaction                   | Passed: dark preview, cancel restoration and font option availability                                                                   |
| Patient realm login                      | Passed with real password/MFA on review clone                                                                                           |
| Dental interaction                       | **Blocked/failed**: editor marker not found within 20 seconds; four staff HTTP 429 responses occurred late in the run                   |
| Local activation smoke                   | Django `/health` healthy and web `/login` HTTP 200                                                                                      |

The first build/lint found optional watched values and error-render/effect typing/lint issues. Those were corrected together. An initial browser sweep navigated too rapidly, hit the existing throttle and produced invalid captures; those are retained as failed evidence, not accepted layout checks. One UI correction batch addressed observed header spacing, tab styling, templates and avatar composition, followed by the final checks above. This exceeded the intended single verification attempt; no further broad rerun is planned.

The final sweep paces route navigation and isolates throttle counters with an external review settings module, retaining the application's 120/minute per-user GraphQL limit. Interaction reloads still produced four rate-limit responses. Their relationship to the dental timeout is plausible but not proven. The browser command therefore exits nonzero; this is not an all-green acceptance pass. No throttle weakening or counter deletion was used.

Current valid screenshots named in `browser-report.json` were inspected for dashboard, patient/directory/history/medical/treatments/access/shared records, documents, appointments/queue/schedules/templates, booking/registration, appearance, portal and login. Old dental screenshots left by the initial run are **not evidence for the final build**. No new clinical note, appointment or release was written to the source database for the sweep.

Coverage limits: no populated released portal snapshot was available in the synthetic fixture, so `/portal/records/[id]` was not captured. The blocked dental group also leaves consultation editor, exact clinical-history revisions, note persistence and mobile model/action/layer behavior unaccepted for this build. Automated geometry is not a full accessibility audit; no exhaustive keyboard, contrast, browser-matrix or tooth-by-tooth pass was performed. Google sign-in remains unconfigured without a client ID. See `error-log.md` for deferred findings.

Evidence: ignored `.impeccable/review/reconstruction/` contains `browser-report.json`, route inventory, screenshots, Jev JSON, graph summary/queries and build/lint/backend logs. Initial failed evidence remains separately named. Temporary harness: `/tmp/medframe-reconstruction-browser.cjs`.

## Preservation, activation and rollback

Branch: `codex/visual-reconstruction`. Source baseline/tag: `7c5bbee` / `checkpoint/pre-visual-reconstruction-2026-10-19`. Private checkpoint:
`/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-091413-7c5bbee`.
The checkpoint helper verified 73 table counts. The legacy source database was not written. Browser review used the separate clone `medframe_django_visual_reconstruction_20261019`; it was never restored over source data.

Local port **3000** now serves `.next-reconstruction` with `BACKEND_URL=http://127.0.0.1:8000` and `WEB_ORIGIN=http://localhost:3000`. API **8000** uses normal `config.settings.local` and the existing `medframe_django` database, with no review database override. Native sessions: web `11815`, API `79636`. Logs: `/tmp/medframe-reconstruction-web-runtime.log` and `/tmp/medframe-reconstruction-api-runtime.log`. No database migration, account/password/role reset, public deployment or push occurred. Infrastructure/workers were retained; review ports 3001/8001 were stopped after review.

The prior `.next-login-enhancements` artifact remains intact. For rollback, stop the two new local servers, run API source at the checkpoint and restart the prior web artifact with the same original origin/backend/database. No schema reversal or whole-database restore is required; preserve subsequent writes and keep backups private.
