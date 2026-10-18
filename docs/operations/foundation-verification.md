# Foundation verification

Verified locally on October 18, 2026. Scope: foundation only, using synthetic staff and no real patient records.

## Results

| Check                          | Result                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| PostgreSQL backend suite       | 26 tests passed, plus 2 recovery-outbox tests passed                                                               |
| Production-build browser suite | 2 journeys passed, including mandatory MFA, recovery messaging, retry, organization switching, refresh, and logout |
| Accessibility                  | Axe found zero violations on sign-in and all four desktop/mobile light/dark workspace states                       |
| Independent review             | Ship at the documented local-foundation scope; both reported defects resolved                                      |
| Formatter                      | Prettier check passed; Python Ruff format/check passed                                                             |
| Frontend lint/types            | ESLint and TypeScript passed                                                                                       |
| GraphQL contracts              | Offline backend schema export and code generation passed                                                           |
| Migration lifecycle            | Isolated test database downgrade to base, clean upgrade to head, and Alembic drift check passed                    |
| Production web build           | Passed with Next.js 16.4.2                                                                                         |
| Compose configuration          | Validated with the optional application profile                                                                    |
| Premium UI static audit        | Strict mode passed with zero findings; see premium-audit.json                                                      |
| Runtime dependency audit       | Zero findings with npm audit --omit=dev                                                                            |

The two independent-review findings were an inconsistent per-user lifecycle lock order and a numeric-only mobile keyboard for hexadecimal recovery codes. Identity operations now lock the user before session/reset rows and revalidate afterward. Deterministic PostgreSQL tests overlap reset/MFA and two reset links. Existing-account verification now uses a text keyboard and recovery-aware hint; enrollment retains numeric OTP entry.

Both API and web Docker images built successfully. The API container imported the application and connected to PostgreSQL/Redis; the pruned production web container served the sign-in page successfully.

## Lighthouse measurement

One mobile Lighthouse run against the production sign-in surface recorded performance 93, accessibility 100, best practices 96, FCP 1.21s, LCP 2.61s, total blocking time 204.5ms, and CLS 0.014. LCP is slightly above the 2.5s target and remains a performance follow-up. This lab run is not field INP evidence. The login is intentionally excluded from indexing; public-site SEO is outside this milestone.

## Implementation adaptations

- The user selected native execution. Implementation stayed in the current checkout on codex/clinical-foundation; an independent reviewer checked the finished code and screenshots.
- Related setup and commits were consolidated. Regression tests were added incrementally; the original plan's pre-implementation test-failure sequence was not followed for every task.
- The runtime CSS token source remains canonical. DESIGN.md and the Impeccable sidecar record actual shipped values; UX-CONTRACT.md and premium-ui.json record shared control ownership.
- Profile-image uploads are recorded as circular avatar controls for the later real upload slice. There is no decorative or nonfunctional upload control in this foundation.
- The development-only upstream braces advisory remains in lint/codegen tooling. Production dependencies audit clean; no incompatible override was used.

## Remaining boundaries

Patient management, clinical encounters, immutable consultation revisions, dental charting, medical documents, the patient portal, and all later roadmap modules remain unimplemented. The foundation is not approved for real medical information. Production perimeter, recovery operations, encrypted backups/restore, audit retention and monitoring, trusted-client throttling, clinical/privacy review, approved logo, and anatomical assets remain as documented in production-readiness.md.

CI configuration is provided; hosted CI has not run because this branch has not been pushed. Local browser screenshots and Lighthouse output are generated under ignored test-results/. Authentication traces/videos are disabled to avoid retaining secrets.
