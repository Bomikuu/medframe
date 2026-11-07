# Headerless sign in refinement

October 23, 2026. Native implementation of the user's request to remove the login header, relocate the logo, remove default Google account-matching prose, and refine patient/provider sign in. No agents, builds, automated tests, typechecks or lint runs. Six edited/new TypeScript sources were formatted with Prettier.

## Changes

Both `/login` and `/portal/login` now use one focused SignInLayout. The existing Medframe logo sits centered above the form; there is no page header or repeated tagline footer. The form retains its patient/provider heading and uses consistent width, spacing, semantic surfaces and responsive padding. Role-specific supporting text retains clinic account provisioning and registration review requirements. Cross-role links remain accessible44px targets.

The shared login form has tighter field spacing, a patient-appropriate email placeholder and larger remember/recovery hit areas. AuthFlow's heading wrapper uses a div instead of a header and tighter spacing. This presentation change also applies when that existing flow is embedded, with unchanged callbacks, native validation, authentication, MFA, browser memory and error handling.

The Google component no longer supplies the quoted default explanation. Explicit caller-provided descriptions, official Google button/loading/error/unconfigured states and native identity handling remain. Recovery and invitation pages keep their existing outer layouts. No backend/configuration, schema, password, MFA, permission or original clinic data was changed.

## Preservation and local activation

Exact pre-edit sources are private in `.medframe-runtime/headerless-login-before`. New source owner: `apps/web/features/auth/sign-in-layout.tsx`. Fresh encrypted checkpoint `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261023-111106-a89bd41`; separate restore `medframe_django_login_ui_20261023` verified167 tables with source_written=false. No database migration or source database restore was needed.

Existing native development runtime served the changed sources through the root launcher's running frontend/API. Browser review confirmed the new native entry routes locally; no production artifact was built, serving build deleted, service configuration changed or temporary review route/account created.

## One bounded visual pass

Provider and patient entry pages were inspected at1280×900 and390×844. Both displayed the centered logo and appropriate heading without a header. Staff-to-patient and patient-to-staff links reached the correct native entry pages. Account/work email placeholders, recovery links, stay-signed-in policy and Google button remained. Provider phone read-only DOM observation showed header count0, removed explanation absent and client/scroll widths375/375; patient phone also showed header count0 and375/375. Supporting controls wrap vertically on narrow screens rather than overflowing.

Captures: `.medframe-runtime/login-provider-desktop.jpg`, `login-patient-desktop.jpg`, `login-provider-phone.jpg`, `login-patient-phone.jpg`. Existing browser autofill appeared; no credential was entered, sign-in submitted, password revealed or Google account chosen. MFA/recovery submission, authenticated redirects, dark/clinic themes and assistive-technology acceptance were not re-exercised. Tab closed and viewport reset after inspection.

Google's SDK logged `The given origin is not allowed for the given client ID.` This is recorded as SIGNIN-UI-001 without OAuth configuration repair or a working Google-authentication claim. The native form rendered normally; button presence is not authentication acceptance.

## Actual Graphify Jev and design use

Initial root graph query `AuthLayout LoginForm GoogleSignIn`,450-token budget:1150-node historical graph,87found/15shown/72cut. Refreshed an AST-only8-file source corpus in `.medframe-runtime/headerless-login-graph`:36nodes/62edges. Query `SignInLayout LoginPage GoogleSignIn AuthFlow`,450-token budget:30found/16shown/14cut. Direct source inspection verified current relationships; no backend/runtime coverage is implied by the graph.

Sanitized Jev choice compared the requested shared headerless surface/default-prose removal with promotional layout and authentication-policy expansion. Modeljev-1.14.0 chose focused, confidence1.0;394input/31output tokens. No private record, credential, attachment, identifier or real error payload was sent. Judgment supported scope, not verification.

Impeccable polish/Operate/craft-floor guidance and current Product/Design context preserved the existing clinical brand. The earlier session launcher failure was not rerun or bypassed. This was a bounded UI refinement, with no new backend subsystem, external message or public deployment.
