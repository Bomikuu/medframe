# Reference-guided appointment entry — October 21, 2026

The user supplied a two-panel appointment PIN-entry reference and explicitly requested a generated
similar interior image for its left panel. The target is RoomEntry (before admission), matching the
reference, not a replacement for the post-PIN camera/microphone preflight waiting room.

## Implementation

RoomEntryHero owns the navy photographic desktop panel: generated clinic waiting nook, HTML brand/
headline and three real-feature summaries with Lucide icons. A restrained dark overlay keeps text
readable. The panel is sticky/full-height on desktop and hidden on phone; a compact brand remains
above the entry form. Next Image fill/sizes uses a project-local PNG with decorative empty alt.

The right panel consolidates scheduled date/time/timezone, exact ten-minute-early opening time, six
responsive PIN boxes, native join, inline errors and patient-portal rescheduling in one card. Doctor
entry and joining help remain below. Native eligibility/denial, busy/disabled, local-only/media-down
warnings and expiry copy are retained. No fabricated readiness or healthcare-grade/security claims
from the reference. The header asks for the code without claiming an early appointment is ready.

AppointmentScheduleSummary and AppointmentRescheduleLink share existing timing/link behavior;
AppointmentRoomSchedule remains as a compatibility wrapper. Patient join callback/PIN behavior,
portal authorization, doctor account access, room window/expiry/admission, camera/microphone/media,
chat/files and the post-PIN waiting room owners are unchanged. No backend/schema/identity changes.

## Image provenance and tools

Built-in image_gen generated a new decorative raster, no fallback CLI/key, no real person/clinic
photo. Final project asset `apps/web/public/images/appointment-waiting-room.png`;2220059bytes,
SHA256 `3801057faba335d802bad28dea12f6dddf0efecfcba903954a1f1821ca7f7ef2`.
Original generation preserved in Codex generated_images; exact source/prompt in
`docs/assets/appointment-waiting-room.md`. User reference was used for visual direction; no native
app data or identifying photographs were submitted.

Graphify queried existing176-node call corpus for RoomEntry/AppointmentRoomSchedule/callDate:
15nodes/24edges returned as a complete graph answer exceeding450token budget; terminal output itself
was truncated. Refreshed focused8-file AST corpus46nodes/94edges; query RoomEntry/RoomEntryHero/
AppointmentScheduleSummary/AppointmentRescheduleLink found33nodes,15shown at500tokens, explicitly
truncated. Native source remains authoritative, not whole-app graph coverage. Jev modeljev-1.13.0
selected reference-preserving adaptation over unverified copy claims, confidence.98,417input/34output
tokens, generic engineering state only. Neither model judgment nor graph is verification.

Prettier only, no builds, automated tests, typecheck or lint suite. Read installed Next Image docs
and Impeccable clarification/craft guidance. Native work in this chat, no agents.

## Preservation and activation

Prior source `.medframe-runtime/waiting-room-reference-before`. Original DB/account/password/MFA/
role/grant/image content remains; only the new decorative public asset is added. No migration or
external messaging, AI integration, money movement or public deployment. Fresh encrypted checkpoint:
`/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261021-160616-a89bd41`; isolated restore
`medframe_django_waiting_reference_20261021_080615_91444c` verified167tables, source_written=false.

Initial launcher activation used .next-local-dev/original medframe_django: API1419981,worker1420196,
scheduler1420197,media1420198,web1420662. The initial browser reached RoomEntry but the dev overlay
reported a stale removed review-calendar-day-list/page.tsx module; image optimization also logged
404 for the newly added existing public image. This is activation-blocker evidence, not a completed
visual acceptance pass. Standing local-activation authorization covers its narrow repair.

Installed Next16 documentation confirms persistent development filesystem caching is enabled by
default. Added only `experimental.turbopackFileSystemCacheForDev:false` to Next config so removed
native-review routes do not persist across sessions; production build caching is unchanged. Previous
config is copied privately. Restart targets only launcher-owned frontend; no generated serving
artifact is deleted. Port3000 TIME_WAIT guard initially prevented immediate restart; no unmanaged
process was killed or guard bypassed. Final startup/visual evidence is recorded below when complete.

## Focused activation repairs and actual visual evidence

The cache-only restart removed the stale module overlay but the image URL still returned404. Source
inspection found the host-routing proxy matches public `/images` paths whereas native static media
is excluded. Rather than changing proxy/security behavior, RoomEntryHero statically imports the same
project PNG; Next emits its native hashed static media and keeps optimized delivery. This resolved
the observed decorative-image failure. The proxy explanation is a source-based inference; no broad
proxy audit/repair was performed. WAITING-REF-001 is repaired, preserving initial failure evidence.

The browser's first tab became a local connection-error data page during restart. Its URL policy
rejected reload/navigation and explicit close; browser troubleshooting documentation was read and
a fresh tab on the confirmed127.0.0.1 listener resumed the legitimate local review. No URL policy or
security interstitial was bypassed. The stale error tab could not be explicitly closed; normal
turn-end cleanup may remove it. The working preview tab was closed and viewport reset.

Focused resumed synthetic presentation confirmation (not a second broad suite) showed:

- Generated photo visible with the chair/plant and readable navy-panel feature text.
- Desktop1440×1000 showed the reference-style schedule/PIN/reschedule card, existing doctor entry,
  exact appointment/opening dates and timezone. Initial captures were at default viewport before
  viewport override settled; final desktop capture used the explicit dimensions.
- Six synthetic digits populated separate boxes and enabled Join appointment. The fixture callback
  only sets local inline early-date feedback; no real room/PIN attempt was sent.
- Phone390×844 hides decorative hero, retains compact brand, six fitting boxes, dated notice and
  wrapped inline feedback. Read-only DOM document375 versus viewport390, no page-width overflow.
  Hidden responsive image selected its tiny1px source; desktop screenshot proves full photo rendering.
- Native room join, eligibility/denial, portal sign-in/rescheduling, hardware/media and actual expired/
  unavailable rooms were not exercised. These remain WAITING-REF-002 with earlier call acceptance gaps.

No layout polish/repair cycle after this confirmation, no build/automated tests/typecheck/lint suite.
Temporary preview route was removed while only the owned frontend was stopped; source retained in
`.medframe-runtime/waiting-room-reference-presentation.tsx`. Dev filesystem caching remains off so
removed preview routes are not reloaded from disk. Final source copies in
`.medframe-runtime/waiting-room-reference-source`; final9-file graph refresh49nodes/97edges includes
Next config/static-image import. Image bytes are not part of AST graph coverage. Original DB and
backend processes remain unchanged during frontend-only recovery. Final frontend ready/PID below.

Final frontend-only restart after preview removal reported ready at localhost3000, web1444405 on
.next-local-dev. API1419981/worker1420196/scheduler1420197/media1420198 retained their existing owned
processes. No further browser pass was run after cleanup; source and image paths are unchanged.

### Compact PIN refinement — October 21

Reduced the six-cell PIN group to a maximum 320px width, with 44px phone / 48px desktop heights and smaller digits. Native OTP behavior and room authorization are unchanged; active development server applies the source through HMR. Prettier formatted the single file. No build or automated tests; no additional browser pass for this sizing-only change.

Graphify queried `RoomEntry InputOTPSlot` against the existing 49-node scoped graph (7 of 31 neighbors shown; truncated), with current source inspected directly. Updated corpus copy retains the new sizing; structural graph relationships are unchanged. Jev selected compact sizing over changing access logic (confidence 1.0; 389 input / 31 output tokens), using sanitized UI state only.

A mistaken pnpm invocation began dependency resolution; it was stopped, and the two packages moved into `.ignored` were restored immediately. Formatting then used the existing root Prettier binary. No dependency changes were intended.
