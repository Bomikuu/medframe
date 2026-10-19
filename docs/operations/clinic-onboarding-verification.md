# Clinic invitation and onboarding — October 19, 2026

## Implemented and active locally

Branch `codex/clinic-onboarding`, implementation `8582eea`, build `.next-clinic-onboarding`, build ID `_ygPZTP6pupsU66Fm1n9C`. The user approved both design and implementation plan and requested native execution. No subagents, delegated reviews, pushes or public deployment were used.

Entry points:

- Platform invitation management: `http://localhost:3000/platform/clinic-invitations`.
- Invited recipient: generated `/onboarding/invite/<token>` landing; the token is exchanged through the restricted same-origin API and removed from the browser URL before setup.
- Resume: original invitation plus fresh recipient email verification restores the server draft. Account-bound drafts additionally require the same native account/MFA.
- Delivery is local SMTP/Mailpit only: SMTP 127.0.0.1:51025, inbox UI `http://localhost:58025`. No real external recipient was contacted by the agent.

The connected feature includes a distinct five-slide introduction, six-block email code, saved clinic/specialty/branding/practice steps, private raster logo quarantine/scan/promotion, existing/new native account and MFA handling, editable review, atomic idempotent clinic creation, platform invitation list/create/resend/revoke, real initial configuration and a dismissible first-run checklist. Clinical roles/ProviderProfile are not inferred from selections. Patient invitations and existing clinical workflows retain their original authorization paths.

After activation, the user explicitly selected `admin@medframe.example.com` for platform-administrator access. Its existing active membership received that role in an atomic audited operation, preserving its password, MFA, native account flags and clinical permissions. This authorized role addition happened after the cutover fingerprint comparison; no synthetic review account was copied into original data.

## Preservation and activation

Source baseline/tag: `5492a7f` / `checkpoint/pre-clinic-onboarding-2026-10-19`; previous active UI `.next-selection-focus` remains intact. The earlier Django/FastAPI checkpoints are untouched.

Before implementation, encrypted database checkpoint and restored review clone matched all 102 tables; 50 private objects were encrypted and verified into a separate review bucket. Review database: `medframe_django_onboarding_20261019`; bucket `medframe-review-onboarding-20261019`; broker/application/operations Redis isolated on DBs 10/11/12. Review identities, uploads, clinic and messages were synthetic. They were never restored over originals.

Before cutover, local writes were stopped and a fresh encrypted checkpoint/verified restore was taken at `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261019-172402-8582eea` (the existing helper retains its historical folder prefix). Restore clone: `medframe_django_onboarding_activation_20261019`; fresh storage restore bucket: `medframe-review-onboarding-activation-20261019`. Both checkpoints and configuration material remain private and out of Git.

Only `onboarding.0001_initial` and `0002_specialty_reference` were applied to original `medframe_django`. **All 4,923 original rows across 102 tables matched preservation fingerprints before traffic resumed. All 50 original private objects were restore-verified.** Added tables/reference rows and framework migration/permission metadata are separate from original-row preservation. No existing account password, MFA or clinical record was changed by cutover.

Runtime:

| Service       | PID    | Tool session | Configuration                                      |
| ------------- | ------ | ------------ | -------------------------------------------------- |
| Web           | 539557 | 47206        | port 3000, `.next-clinic-onboarding`, original API |
| Django API    | 539539 | 14032        | port 8000, original `medframe_django`              |
| Celery worker | 539547 | 8420         | original broker/data, concurrency 2                |
| Celery beat   | 539549 | 21357        | `/tmp/medframe-onboarding-original-beat`           |

Logs: `/tmp/medframe-onboarding-{web,api,worker,beat}-runtime.log`. Login and invitation-management HTML returned HTTP 200; API readiness returned 200 after startup. The first immediate API probe was 000 before the server became ready, retained as startup timing rather than a feature failure. Review web/API/worker/embedded beat were stopped afterward. Local SMTP is explicit; SMS remains disabled for live delivery.

## Actual bounded verification

- Production build/TypeScript passed after the recorded activation-blocker repairs. Prettier and final scoped Ruff pass; migration drift check reports no changes. Scoped ESLint has zero errors and three advisory warnings: two blob/private-logo img elements and one polling-effect dependency warning. No rules were suppressed.
- Initial accumulated backend run: **34/36 passed**. Two completion cases hit Pydantic's reserved-development-email restriction. Business contact validation now reuses Django's existing email rules; **both failed cases pass in focused confirmation**.
- One added PostgreSQL TransactionTestCase launches two simultaneous confirmations; **both return the same clinic** and exactly one organization exists. Thus **37 distinct cases have passing evidence across staged runs**, not a claimed repeated clean 37-case suite.
- Cases cover platform permission denial, hashed token/resend/expiry/revoke, session proof isolation/expiry, persisted partial drafts/conflicts, rejecting draft secrets, native MFA/new account and unchanged existing password, raster validation and scan selection, uniqueness/no early organization, normalized atomic completion/replay/no clinical role, rollback, name conflicts, additive theme compatibility, existing staff authentication/branding and patient invitation behavior. This is not exhaustive adversarial or production certification; signed-in email-session rotation, all notice/expiry edges and every individual reference choice were not separately browser accepted.
- Browser history is retained: initial bootstrap failed on a relative graphql-request URL; one continuation saw stale server chunk references; the next reached verified clinic/specialty state then hit a case-sensitive provider label in the harness; another resume used an older local mailbox code. The product correctly rejected that stale code. Correcting the harness to wait for a newly delivered message and observe the resend cooldown completed the remaining flow. No successful broad suite was rerun. See ONBOARD-001/002/003 for exact reproduction and boundaries.
- Final remaining browser result passes Save and Exit, a fresh browser context restoring server specialties, private scanned logo, live colors, practice settings, native account/MFA/recovery confirmation, review/Edit, clinic creation, correct workspace destination, persisted checklist dismissal and platform invitation creation. **Zero page errors** on that successful run. Introduction keyboard/dot controls, URL exchange, email blocks and initial clinic form were established in the earlier current-artifact run before its provider-locator stop; the final continuation skipped those already-exercised actions. Its combined group label must not be read as a second introduction run.
- Eight successful viewport captures span 1440×1000 desktop, 1024×768 tablet and 390×844 phone, all without document horizontal overflow. They establish the welcome/branding composition and logo controls; not every setup step was repeated at every viewport. The uploaded logo appears in the actual new clinic sidebar and selected colors in its real controls. Synthetic review creation was never replayed against original data for a smoke test.

Raw ignored evidence: `.impeccable/review/clinic-onboarding/` contains logs, browser JSON/history, screenshots, checkpoint/row/object preservation summaries, build and graph/Jev evidence. Private test fixture `/home/micxsz/.local/share/medframe/ui-review/clinic-onboarding.json` is not committed or printed.

## Graphify / Jev / design evidence

Existing frontend/backend graphs were queried first and source inspected. Final code-only graphs: backend `graphify-out/backend-clinic-onboarding/`, **275 Python files, 1,605 nodes, 6,578 edges, 96 communities**; frontend `graphify-out/frontend-clinic-onboarding/`, **259 TS/TSX files, 1,241 nodes, 5,964 edges, 42 communities**. They cover configured application code folders (including backend migrations), exclude generated frontend clients, test/script corpora, models/assets/documents/builds and runtime data. AST extraction uses zero external extraction tokens. Ten backend configuration/initializer files and one frontend icon barrel yielded no symbols. Numeric cohesion, reports, manifests/cost remain in graph output. Broad query vocabulary can match generic methods; direct source inspection established actual authorization, account, logo and completion entrypoints. The final impact trace reached 642 nodes, showing 24 under a 650-token budget, not exhaustive proof.

Jev 0.7.0 / jev-1.13.0 received sanitized architecture/results only. Implementation prioritization chose `boundaries`, confidence 1.0 (443 input/44 output tokens); activation review chose `local`, confidence 1.0 (500 input/39 output). These supplement the earlier design/planning calls; they do not replace source inspection, user authorization or tests. No credentials, patient information or private attachment text/image was sent.

Impeccable product/design/onboard/new-work/craft guidance was used directly; its previously failed context launcher was not rerun. The user prohibited subagents, so source/visual review and documentation were native. The approved Medframe world is preserved; only the scoped preview and additive brand-secondary configuration extend it. No AI integration was added.

## Remaining limits and rollback

- Development Terms/Privacy notices are clearly labelled; approved production legal content, deployment logging/redaction and production mail configuration remain operator work. No production readiness or compliance claim.
- Individual team invitations are explicitly upcoming, as the approved design states. Platform and patient invitations are separate implemented flows.
- A cleanup task and command are provided; no new automatic cleanup beat schedule has been enabled. Interrupted onboarding resumes via original invitation, not a newly issued independent resume secret. The pre-verification introduction lives in native Django session storage; the owned ClinicOnboarding draft begins after email proof.
- Minor observed UI follow-ups are logged as ONBOARD-004. Existing older dental/anatomy/backend deferred issues are unchanged; no unrelated repair/polish loop was run.
- If UI rollback is needed, stop only the new web and serve preserved `.next-selection-focus` against the current compatible Django API/schema. Do not drop migrations, restore a review clone over originals, or assume old backend source understands newly created onboarding/theme data. Full infrastructure rollback requires the preserved encrypted original checkpoint and explicit user direction; it is not implied by switching UI artifacts.
