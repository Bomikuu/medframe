# Grouped settings and account editing — October 23, 2026

## Delivered

Removed the Settings navigation section and the duplicate diagnostic-partner link from the clinic sidebar. The footer retains Settings and now has Edit account. A shared source catalog supplies three groups of three settings cards and route-linked page navigation:

| Group | Tabs |
| --- | --- |
| Account & workspace | Account & security, Appearance, Clinic website |
| Clinical setup | Staff & access, Specialties, Templates |
| Clinic operations | Schedules, Devices & Stations, Diagnostic centers |

All nine existing settings paths are preserved. `/clinic/settings/security` now includes the current user profile alongside existing authorized clinic security. The shared layout imports only navigation and the active route child; links disable automatic prefetch and use the existing unsaved-change guard. It never mounts nine hidden forms. Required global theme loading remains in its existing provider. Roles see only permitted entries, and native destination authorization remains authoritative.

New self-service POST `auth/profile` reads/updates only the authenticated staff user's display name. It rejects patient-realm/delegated Station use, validates the name, compares the expected saved name under a row lock and audits the update. It cannot assign roles, edit another user, change a sign-in email/password or modify MFA. The shared overview reloads after successful name editing so the footer displays the saved name.

Account photo reuses the private document upload/scan pipeline and optimistic-versioned appearance preference mutation. The circular picker previews one image, selects it automatically after a clean scan and provides Remove photo. Polling is limited to one minute while the upload is pending, with explicit status/recovery controls. Display preferences no longer duplicate the photo panel. The shared upload control uses account-specific photo wording when its purpose is avatar; patient wording remains for patient photographs.

## Preservation and activation

Before mutation work, fresh encrypted checkpoint `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261023-121840-a89bd41` was restored separately to `medframe_django_settings_groups_20261023`: 167 tables verified, source_written=false. Exact pre-edit owners are in `.medframe-runtime/settings-groups-before`. No schema migration, original credential/MFA/role changes, original patient mutation or publication. The existing unrelated main-width expression is retained verbatim.

Normal local runtime is managed by `./medframe`, with existing `.next-local-dev`; no additional build folder was created. Temporary review routes and credentialless-frame configuration were removed; exact normal `next.config.ts` was restored. The synthetic review session was revoked, its user/membership/organization disabled, and its review metadata expired. Synthetic historical records and the repository-owned uploaded image remain private review evidence; no real photo or patient record was used.

## Bounded visual evidence

No build, automated tests, lint or typecheck. Prettier formatted supported edited sources; Ruff formatted the new Python module only.

Native browser observations at 1440×1000 and 375×844:

- Account name saved successfully and appeared in the footer menu and native staff directory.
- Settings modal showed all nine entries in three related rows of three at desktop width.
- Unsaved name caused the existing discard confirmation; Keep editing retained the entered value and Cancel restored the saved value.
- Appearance, Staff & access and Schedules opened distinct existing URLs and displayed their own group tabs. Account forms were absent from those other active page snapshots.
- Circular upload of a repository-owned WebP into the synthetic account passed the native scan, automatically saved as profile image, and Remove photo confirmed removal.
- Phone navigation stacked its group selectors and contained a horizontally scrollable tab row. A cross-origin credentialless iframe prevented the optional parent DOM width read; no numeric no-overflow assertion is claimed.
- Sampled browser console error list was empty.

Captures: `.medframe-runtime/settings-groups-modal.jpg`, `settings-account-phone.jpg`, `settings-account-desktop.jpg`.

Two browser API locator operations timed out (a post-confirmation field attribute read and pressing Control+Home on a heading). Native accessibility observations and scrolling established the subsequent state; these are not evidence of product failure. Account photo copy and narrow desktop upload composition were refined in the one bounded confirmation. SETTINGS-GROUPS-001 records coverage limits. Role-by-role denials, concurrent edits, scan failure/retry, browser history and every existing settings mutation were not exercised; no full security acceptance claim.

## Actual Graphify and Jev usage

Queried existing root graph first: 1,150 nodes, 238 related nodes found, 29 shown / 209 cut at the chosen budget. It was insufficient for the new owners, so source inspection remained authoritative. Refreshed a source-only focused corpus in `.medframe-runtime/settings-groups-graph`, initially 12 files / 80 nodes / 143 edges and finally 14 files / 85 nodes / 153 edges. Final query found 31 nodes, displayed 11 / cut 20. AST-only extraction has no semantic/community coverage claim and does not prove runtime permissions or request behavior.

Jev 0.7.0 auth status succeeded without exposing a key. Sanitized question compared route-linked active-child loading against eagerly mounting hidden forms. Jev model `jev-1.14.0` chose `route`, confidence 1.0; usage 389 input / 32 output tokens. No private data, identities, credentials or attachments were submitted. This judgment informed loading design and is not verification.
