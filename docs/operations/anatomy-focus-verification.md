# Anatomy sidebar camera focus — October 19, 2026

The user requested that selecting a structure in the sidebar reveal its surface automatically, including posterior regions, with a little zoom. This is a frontend-only extension of the active reference editor. Native execution only; no delegated work, migrations, new integrations or database replacement.

## Behavior

- Sidebar structure selection chooses front/back/patient-left/patient-right from anatomical surface labels, centers the registry bounds, and moves about 1.4× closer than the whole-model fit. Large structures retain enough distance to fit. Remaining meshes stay visible; isolation is still explicit.
- Posterior, gluteal, scapular, vertebral and dorsal-hand regions use the back view. Anterior/palmar regions use front; lateral regions use their canonical patient side. Unclassified structures default to front. These are display rules, not changes to clinical anatomy or side metadata.
- Re-selecting the same structure restores its camera after manual navigation. Mobile closes the navigator after selection. Manual model clicks keep the current camera. Fit/Reset clear contextual focus and isolation; layer changes clear the previous focus. Existing manual presets/zoom remain available.
- No saved findings, model coordinates, asset identifiers, permissions or AI behavior changed. The assistant remains an unconnected preview.

## One bounded verification pass

- Production build and TypeScript passed with `.next-anatomy-focus`.
- Scoped ESLint: zero errors, one existing unused Bot import warning (ANAT-REF-003); left deferred.
- Prettier passed the changed source/harness. Next's newly extended tsconfig needed normalization and was formatted with Prettier. Git whitespace check passed.
- `scripts/review-anatomy-focus.mjs` passed eight registry orientation cases and contextual distance/centering checks at three aspect ratios. Browser assertions passed four cardinal orientations, repeat selection, full-model reset and phone drawer dismissal. Actual rendered teal mesh pixels were visible near the viewport center in all five captures checked, rather than relying only on a selected preset label.
- Desktop 1742×980 and phone 390×844 viewport captures show the selected posterior arm without manual rotation. No document horizontal overflow, page errors or GraphQL mutations. The synthetic clone consultation's full queried content/version/status/revision remained identical before/after navigation.
- Raw ignored evidence: `.impeccable/review/anatomy-focus/` (build/lint/format, browser JSON/log, three whole-viewport and five canvas captures, graph and Jev output). No broader backend suite or repeat browser sweep was run.

The surface rules and eight fixtures are not an exhaustive anatomical/occlusion assessment of all 425 structures. Hidden internal structures may still need isolation or manual orbit. Existing narrow-sheet, toolbar and thumbnail limitations remain recorded under ANAT-REF-003; no unrelated repair was attempted.

## Actual Graphify / Jev use

Before editing, the existing frontend graph query traced StructureNavigator/AnatomyEditor/Camera/AnatomyScene: 169 reachable nodes, 22 shown under the 600-token cap. Direct source inspection established the callbacks and framing behavior. The refreshed code-only graph at `graphify-out/frontend-anatomy-focus/` covers 234 TS/TSX files, 1,141 nodes, 5,509 edges and 39 communities. A follow-up query reached 70 nodes, showing 17 under the 450-token cap. AST-only extraction used zero external extraction tokens; generated clients, documents, models/assets, tests/scripts and builds are excluded. One icon barrel yielded no symbols. Numeric cohesion, manifests, reports and costs are preserved in the graph output. No backend graph rebuild was necessary.

Jev CLI 0.7.0 authenticated through its stored key; sanitized architecture/results only were submitted to jev-1.13.0. Planning chose `contextual` (confidence 1.0; 418 input/43 output tokens); release review chose `activate` (confidence 1.0; 461 input/39 output tokens). These are model judgments, not verification or authorization. No credentials, patient data, private reference attachment or clinical content were sent. Impeccable guidance was applied directly using the existing product/design/anatomy surface context; its previously failed launcher was not rerun.

## Local activation / rollback

Web port 3000 now serves `.next-anatomy-focus`, PID 387899, tool session 62658. Runtime log: `/tmp/medframe-anatomy-focus-web-runtime.log`. Login returned HTTP 200; original API health returned HTTP 200. Original API PID 252111, worker 252112, beat 252114 and original `medframe_django` remain in place. Review traffic used `medframe_django_batch6_20261019` through ports 3001/8001; those review servers were stopped after the pass.

Previous source remains commit `6f7d7b8`; `.next-anatomy-reference` remains intact as the immediate UI rollback artifact. To roll back the UI, stop only the current web process and run the preserved reference artifact against the original API on port 8000. Do not replace the original database with the review clone. The earlier `checkpoint/pre-anatomy-reference-2026-10-19` remains preserved. No push or external deployment occurred.
