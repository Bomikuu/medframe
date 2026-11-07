# Error-page consistency — October 20, 2026

## Scope and behavior

Source review covered standalone error/access returns, explicit unavailable/expired headings, authentication recovery, portal and clinic bootstrapping, onboarding/invitations, clinical record readers, financial/diagnostic/service/settings permission gates, Station access and kiosk/display connection failures. Inline validation/mutation errors remain at their fields. Full protected-route behavior was not exhaustively exercised.

Removed the shared Back to collection/Back to Station action and collection-return copy. Expired sessions now have one Sign in again action for their native realm; delegated Station expiry uses Open Station/new clinician code. Sign-out clears the existing browser/device session and remains inside Advanced recovery for blocked/unknown access. It is absent from expired-session UI. Portal sign-out returns to patient sign-in; the logout endpoint and device-clearing semantics are unchanged.

RecoveryState now supports full-page headings and compact embedded presentation. AccessRequired explains permissions without a futile sign-in/retry prompt; RecordUnavailable supports existing read retries where supplied. Missing clinic/provider/patient connection and invalid data screens reuse these owners. No-connection states suppress Open my workspace to avoid returning to the same missing connection. Onboarding and patient/reset invitation states explain the next step. Platform capabilities request failures are described as unavailable, rather than falsely asserting a missing administrator role, and retain the existing read refresh.

Added app/error.tsx, global-error.tsx and not-found.tsx using the installed Next16.4.2 retry prop and required global html/body/CSS. No exception messages, stack traces, private paths or identifiers are displayed. Root-layout fallback uses a system font if root font variables are unavailable. Kiosk/display and paused Station states preserve native retry/device/code owners. No backend/schema, account, credential, MFA, grant or clinical/billing mutation change. No subagents, external messages or deployment.

## Visual-only verification

Per the latest user preference, no build, automated test, typecheck, lint or design detector ran. Prettier formatted the named authored files. Native unauthenticated /portal visibly shows only Sign in again; native unmatched route shows the custom404; /onboarding/setup shows the unavailable invitation card. A temporary synthetic in-memory /error-review fixture rendered the actual access-required, unreadable-record, session-check and unexpected-error components for desktop/390px phone review. The temporary route was removed. Screens show readable headings/descriptions/icons and appropriate actions without horizontal clipping. No account, sign-out, password reset, clinic completion or financial action was submitted. The unexpected-error UI was previewed; actual framework exceptions/root-layout failures were not deliberately triggered. Other permission-restricted variants, all device states, keyboard/theme/locale matrices and successful reauthentication remain unverified.

Local .next-local-dev remains served by the existing root launcher on port3000; no restart or production build was needed. Original data, prior source, user-owned clinic-shell width changes and previous task changes remain intact.

## Tools and limits

Graphify queried the older graph for SessionUnavailable/LoadState/error/not-found/access-denied and returned truncated shared dependencies. Source inspection resolved owners, then a focused AST corpus was refreshed under graphify-out/error-pages: 43 source files; 649 nodes; 1632 edges; zero external extraction tokens. The known Station entry parser limitation remains (line150, only2 symbols extracted); that file was inspected directly and no graph completeness is claimed. Jev0.7.0/modeljev-1.13.0 received sanitized engineering state only and chose contextual actions over universal action duplication (confidence0.98;386 input/37 output tokens). The result is advisory, not a verified permission or test result. Existing unrelated deferred findings were not repaired.
