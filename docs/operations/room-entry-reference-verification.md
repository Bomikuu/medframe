# Reference-guided appointment entry — October 22, 2026

## Scope and design

The user requested the supplied waiting-room screenshot and invoked Impeccable. The reference depicts the appointment PIN-entry screen, so this phase refines RoomEntry/RoomEntryHero. The admitted-patient lobby, live call workspace, camera preview and consultation controls retain their previous implementation.

Operate-mode composition: a light illustrated introduction supports the primary task of entering a six-digit PIN. Existing Medframe branding, Manrope/Jakarta, navy/teal tokens, supplied artwork, shadcn InputOTP/buttons and Lucide remain. The left desktop panel now has a navy/teal two-line headline, pale circle/dot pattern, larger full-framing illustration and a horizontal three-item feature row. The right panel stays a white task surface with a focused PIN card, circular video icon, written scheduling context, native media notices, doctor access and help. Both sides use semantic light/dark tokens rather than a hard-coded dark hero. The original uploaded doctor logo is retained despite the different mark drawn in the reference.

The six PIN cells use the card width while retaining their compact 44px phone / 48px larger-screen height. Existing numeric constraints, busy/disabled states, input error semantics, scheduling windows, reschedule links, authorization branches and actual join callback are unchanged. A busy indicator and contextual information icon improve feedback without adding new claims. Media notices remain conditional on actual connection/media state, rather than always showing the screenshot's example warning.

Mobile keeps the task first: logo, entry instructions, summary/PIN card and access/help controls. The decorative waiting-room scene moves below that content. Desktop and mobile use the exact supplied transparent WebP, with an explicit decorative-example caption; no queue numbers/wait estimates in the image are treated as real data. MedframeScene gains an optional responsive sizes prop; other consumers retain its existing default.

## Preservation

Pre-edit source copies: private `.medframe-runtime/room-entry-reference-source/`. Encrypted checkpoint `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261022-135033-a89bd41`; isolated clone `medframe_django_room_reference_20261022_b5c384` verified 167 tables, `source_written=false`. No schema changes/migrations, patient fixtures, account sessions, password/MFA/grant changes, original-database restore or private-storage changes. Other uncommitted source and deferred findings remain untouched.

## Actual Graphify/Jev usage

Initial root query `RoomEntry RoomEntryHero AppointmentScheduleSummary`, budget180, returned no matches in the stale root graph. Source inspection governed the work. Refreshed focused AST corpus: eight sources, 41 nodes, 61 edges, no extraction warning returned. Query `RoomEntry RoomEntryHero MedframeScene AppointmentScheduleSummary`, budget240, found22, showed7 and truncated15. This is code relationship evidence, not whole-repository, browser or clinical acceptance.

Jev received only sanitized public design context concerning the reference, existing native entry controls and mobile task priority. It selected `refine`, confidence1.0, model jev-1.14.0, usage414 input /34 output tokens. No images, PINs, patient information, credentials or private attachments were transmitted. Judgment guided scope and is not verification.

## Bounded native visual pass

One native in-app-browser round used a temporary component-only route mounting the real RoomEntry with explicit synthetic preview labels. No backend appointment, room, patient or session was created. The preview used a noop join callback; no PIN was submitted or doctor sign-in followed.

Desktop1536×900: instant mode shows the light illustrated split, navy/teal headline, horizontal feature row, full six-cell PIN row and native conditional local-only notice. Switching the preview to scheduled mode rendered October23,2026 at10:00AM in Asia/Manila, a9:50AM opening time and the existing Request reschedule link. This establishes written presentation, not backend access-window enforcement or successful rescheduling.

A controlled example error and synthetic six-digit input exercised the native inline alert and enabled-submit presentation. Phone390×844: six visible cells measured43.5×44px, document scrollWidth375px with reserved scrollbar versus390px viewport; no horizontal overflow observed. Entry and the error remain above decorative artwork. Browser error sample empty. No camera/mic permissions, live media, PIN validation service, actual join, busy timing, dark-mode toggle or full keyboard/accessibility audit was performed. No end-to-end appointment acceptance is claimed.

The preview tab closed, viewport override reset, temporary route removed. Frontend is restarted to clear its temporary route/module graph. Existing patient lobby behavior was not retested. No further visual polish loop or unrelated issue repair followed the pass.

No builds, automated tests, TypeScript/lint suites, mechanical skill detector or performance benchmarks were run under the user's visual-only preference. Prettier formatted the three supported source files. Impeccable context had already failed earlier in this session; it was not rerun. Existing PRODUCT/DESIGN, layout guidance, craft floor and installed Next directive guidance were read directly. No subagents or new dependencies were used.

## Activation

Current local target remains `.next-local-dev` at `http://localhost:3000`, original Django on loopback8001 with existing API/worker/scheduler/media. The ordinary owned frontend restart follows normal TCP shutdown and leaves unrelated processes alone. No public deployment, external messaging, live payments or AI integration. Final running frontend identity is appended after startup.

Startup completed successfully: web PID1902847, `.next-local-dev`; launcher reports Ready at localhost3000 with backend127.0.0.1:8001. Existing backend services retained. Temporary preview is absent from source and the serving frontend was freshly restarted. No build or migration application occurred.
