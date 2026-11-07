# Notification panel and expandable header search — October 23, 2026

## Implemented

- Reference-guided notification popover with Medframe navy/teal branding, unread badge, native Switch filter, category-specific icons/tints, concise factual descriptions, clinic-local timestamps, visible unread/read status, individual read actions, refresh/retry, and native older/newest pagination.
- Bulk read deliberately says **Mark page read**: the existing mutation marks only the supplied visible IDs, up to 30. No claim that the entire inbox is marked read. No invented notification types, patient identities, unsupported menus, or inert “view all” link.
- Existing server-authorized record destinations remain optional; inaccessible or unavailable records have no Open record action. Clicking a valid destination closes the popover.
- Header search initially shows a 44px icon button. A 300ms eased width transition expands the field and focuses it; Enter or the search icon opens the existing scoped patient finder (or permitted workspace actions). Close/Escape clears and collapses it, returning focus to the icon. Reduced-motion preferences disable the transition.
- Responsive notification width respects Radix collision bounds; fixed header/footer surround an independently scrolling list. Colors include dark-mode variants.

## Preservation and activation

Frontend-only changes in `apps/web/features/workspace/notifications.tsx` and `workspace-header-actions.tsx`; existing Django notification queries/mutations, resource authorization, credentials, MFA, original records and database schema remain unchanged. Prior versions are saved privately in `.medframe-runtime/notification-refinement-source/`. The pre-existing dirty working tree was retained.

Seven notification records were created only for a newly created synthetic organization/user. Their nonexistent resource IDs intentionally produced no record links. Native MFA-verified synthetic review ran in a credentialless iframe; original browser cookies were not replaced. Review session was revoked and synthetic user/membership/organization disabled after capture. Temporary localhost-only review routes were removed, and the exact original Next.js configuration restored (including frame protection). The normal root launcher activates `.next-local-dev`; no production build or migration is involved.

## Bounded native browser evidence

One desktop/phone inspection plus one focused layout confirmation, using CUA against the real native workspace, not intercepted API responses:

- Initial icon-only search, expansion and input focus confirmed; desktop width 288px, phone width 187px at a 390px outer viewport.
- Enter preserved the query in the existing patient search dialog. Closing that dialog restored field focus; Escape collapsed search and restored icon focus with `aria-expanded=false`.
- Native unread-only filter and page-read mutation exercised against five unread synthetic notifications. Bell count cleared after marking the page read. Synthetic unread states were then restored solely for final presentation screenshots.
- Initial inspection found the shared Input disabled-opacity rule exposing a faint collapsed field, and scrollbar-inclusive viewport sizing extending the panel by 3px on phone. Both corrected together; final phone panel bounds are left 12px/right 363px inside a 375px content viewport.
- Final phone content width equaled viewport width (375px). Desktop and phone notification screenshots show scrollable list, fixed controls, category icons and unread styling. Final browser error log was empty.
- Prettier applied to both changed source files. **No build, automated tests, lint or TypeScript checks were run**, per user preference.

Screenshots (private local evidence):

- `.medframe-runtime/notification-refinement-desktop.png`
- `.medframe-runtime/notification-refinement-phone.png`
- `.medframe-runtime/notification-refinement-search-phone.png`

Not independently browser-verified: dark theme/reduced-motion mode, valid Open record navigation, more than one page of notifications, server-error retry, action-only access roles, permission changes during an in-flight mutation. Existing owners were preserved; these are acceptance limits rather than passing claims.

## Graphify and Jev

Existing graph queried first for `Notifications notification_page WorkspaceHeaderActions`: 1,150 nodes total; 273 found, 20 shown, 253 cut. Source inspection established the current header was newer than that graph. Refreshed a private, source-only AST corpus of nine files covering notification/header components, workspace owner, request/search hooks, Popover and native inbox/read mutation: **91 nodes, 171 edges**. Query `Notifications WorkspaceHeaderActions notification_page mark_notifications_read` found 66 nodes; 15 shown/51 cut at a 450-token budget. Final source copied into the corpus and extraction refreshed after the two CSS corrections. This is scoped AST evidence, not runtime or full-project coverage.

Jev received only sanitized generic requirements and the API's page-size behavior. Choice selected preserving the native API and accurate page-read label (`visible`), confidence 0.94; model `jev-1.14.0`, 369 input/32 output tokens. No patient information, credentials or private attachments were submitted. Its judgment informed UI wording; it did not establish correctness or authorization.

## Follow-up: search text spacing and focus-out collapse

The user reported icon/text overlap and requested collapse when focus leaves search. Replaced the overlaid icon/input arrangement with separate flex slots: a fixed 44px search button, flexible input, and separate close button. The input begins at the button’s right edge, with an additional 4px internal inset; text cannot extend underneath the icon. Focus leaving the entire form collapses the field without forcing focus back or clearing the query being handed to a dialog. Explicit close/Escape still clears and restores icon focus.

One native desktop/phone visual pass confirmed nonoverlapping icon/input bounds (desktop right/left 903.48px; phone right/left 164px), collapse after clicking Notifications, preservation of “Andrea Example” in the native patient finder after submitting, and Escape returning to the collapsed icon. No browser errors recorded. Screenshots: `.medframe-runtime/search-focus-desktop.png`, `.medframe-runtime/search-focus-phone.png`. Prettier applied; no builds, automated tests, lint or typechecks. Temporary review routes removed, normal frame protection restored, synthetic access revoked. Original records/credentials/schema unchanged.

Graphify query on the prior scoped graph found 15 nodes, showing 7/cutting 8 at 250 tokens; refreshed the final source-only AST corpus (91 nodes, 171 edges). Jev received sanitized blur-behavior criteria only and selected passive collapse without focus stealing/query loss: confidence 0.98, model `jev-1.14.0`, 366 input/33 output tokens. Native root launcher reactivates `.next-local-dev`; a transient occupied-port refusal during shutdown was handled by waiting for port release, without stopping an unmanaged process.
