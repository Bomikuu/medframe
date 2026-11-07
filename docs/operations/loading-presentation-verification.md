# Loading presentation — October 20, 2026

The prior shared loading owner had no spinner or icon and was constrained by a left-aligned bordered wrapper. LoadingInformation now shows a centered Lucide section icon within a visible teal spinner, centered status copy and the existing slow-request/retry state. LoadState supplies route-relevant icons and centers the loading region; clinic bootstrap wrappers center the state in the viewport. Error/recovery actions and backend authorization remain unchanged. Motion respects reduced-motion preferences.

Verification followed the latest user preference: no production builds, typechecks, lint, automated tests or design detector. Prettier formatted changed supported files. Visual browser review rendered the actual shared LoadState under SafetyProvider through a temporary local preview, inspected at the browser default 703×900 and at 390×844. Both captures show centered text and a visible icon/spinner without clipping. The temporary preview route was removed. Authenticated end-to-end transitions and slow retry activation were not exercised.

Local activation uses the existing launcher: stopped only the frontend, then ran `./medframe start --only frontend --dist-dir .next-local-dev`. Next development mode compiles requested routes; no production build command ran. Backend services, original database, credentials, permissions and the pre-existing user width change were untouched. Next added its development type paths to tsconfig.

Graphify: queried existing graph with `graphify query 'LoadingInformation loading icons Icon' --budget 700`; the older graph matched icon relationships but was truncated and lacked current loading coverage. Verified source and refreshed five relevant files in graphify-out/loading-feedback using local AST extraction:56 nodes/100 edges, no external extraction tokens. This is a focused graph, not whole-app coverage. Jev0.7.0 auth status succeeded without exposing credentials. Sanitized UI-only choice selected shared loading presentation over routing/auth rewrite (confidence1.0, modeljev-1.13.0,360 input/31 output tokens). Model judgment was advisory, not verification.

Returning to login also exposed a separate plain-text session-check state. LoginSessionBoundary now reuses LoadingInformation with a ShieldCheck icon and centered copy; its authentication request/timeout/redirect behavior is unchanged.

The live login session-check state was visually captured after this change and shows the centered spinner, shield icon and readable status. No automated assertion was run.
