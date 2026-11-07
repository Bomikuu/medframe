# Clinical UI Cleanup Implementation Plan

**Goal:** Reduce repetition and visual clutter across Medframe’s existing page families while preserving useful clinical context and native actions.

**Architecture:** Refine shared page headings and empty states, then remove concrete redundancy in collections, settings, Station and room entry. Keep all data, permission, form and mutation owners intact.

**Tech Stack:** Existing Next.js, TypeScript, Tailwind and shadcn components.

**Spec:** User’s October 22 request to inspect all pages, improve UI and remove redundancy; PRODUCT.md, DESIGN.md and UX-CONTRACT.md.

## Global constraints

Native execution only; no subagents. No builds or automated tests; one bounded manual visual pass. Use Prettier. Preserve unrelated dirty source and the existing clinic-shell width snippet. No schema, credentials, permissions, live messaging or deployment changes.

## Review focus

- Headers remain readable and actions wrap on narrow screens.
- Search, empty and loading states retain labels, recovery and meaningful counts.
- Clinical save/finalize, payment context and verification instructions remain available.
- Branch context comes from the header; record assignment fields remain.
- Scheduled and instant appointment entry describe their actual access windows.

## Tasks

- [x] Map every route to its feature owner; review route-family headings, toolbars and recovery patterns. Query existing Graphify first and use sanitized Jev prioritization.
- [x] Preserve current source and checkpoint original data; refine shared heading spacing and empty surfaces.
- [x] Simplify directory/calendar/collection copy, settings and device guidance; preserve native actions. Correct selected-branch Dashboard context and instant-room footer; compact PIN inputs.
- [x] Format touched supported files, perform one native visual pass on representative routes and widths, and log unrelated findings without repair.
- [x] Remove temporary visual fixtures, refresh the focused source graph, record actual coverage and activate locally.

User’s standing native execution and visual-only preferences override skill defaults for delegated review, TDD, builds and approval handoffs. This is refinement of already authorized existing interfaces, with no new product workflow.
