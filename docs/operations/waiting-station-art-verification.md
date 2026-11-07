# Waiting-room and Station artwork — October 22, 2026

## Scope and source

The user pointed out the dedicated scenes in the originally supplied Downloads folder. Read the complete 16-asset manifest/README and inspected the actual `online-waiting-room.webp` and `station-pin-pairing.webp` images. These exact scenes exist as transparent 600 × 430 raster WebPs; the adjacent 14-scene editable SVG pack does not contain their vector equivalents. The raster originals were copied unchanged, without tracing, generated substitutes or claims of CSS recoloring.

Shared `MedframeScene` uses static Next Image imports, intrinsic sizing, responsive sizes, full-image object-contain rendering and decorative alt text. Captions explicitly distinguish embedded example queue/code labels from real data. Brand signatures in the supplied artwork remain. Native appointment instructions, actual PIN controls, schedules, admission status and pairing controls retain their existing owners.

Placements: appointment PIN-entry desktop hero replaces the old generated interior photograph with the supplied online-waiting-room scene; mobile entry shows a compact scene. PatientWaitingRoom shows it alongside device readiness rather than replacing video preview. StationEntry displays the supplied device-pairing scene above the introduction, retaining real code entry and approval flow. The old photograph file remains preserved for rollback. This phase does not add unrelated scenes to dense operational screens.

## Preservation and tools

Touched pre-edit source is copied privately to `.medframe-runtime/waiting-station-art-source/`. Fresh encrypted checkpoint `/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261022-132153-a89bd41`; isolated clone `medframe_django_waiting_station_art_20261022_4c8e12`, 167 tables verified, `source_written=false`. No migrations, fixture accounts, clinical records, credentials, permissions or MFA changes.

Initial root Graphify query `RoomEntryHero StationEntry PatientWaitingRoom`, budget 250, returned no matches; current source was read directly. A refreshed 9-source focused AST graph contains 43 nodes and 72 edges. Its extractor warns that StationEntry at line 161 may be partially extracted (2 symbols). The warning is graph/parser coverage, not a verified Next syntax failure. Query `MedframeScene RoomEntryHero PatientWaitingRoom StationEntry`, budget 240, found 34 nodes, showed 8 and truncated 26. Coverage is not the entire repository, artwork semantics or runtime correctness. The existing Station source was not rewritten to satisfy the graph parser.

Jev received only public design context about exact raster originals versus absent SVG equivalents; selected `originals` at confidence 1.0. Model jev-1.14.0, usage 398 input / 35 output tokens. No user images, credentials or patient information were sent. This is placement advice, not verification.

Supported source used Prettier; the launcher used Ruff format only. No build, automated tests, TypeScript check or lint suite.

## Local activation correction

Source inspection found that the previous alternate-API-port activation left the call client's default local WebSocket address at port 8000. As a necessary correction to that activation blocker, the launcher now supplies NEXT_PUBLIC_CALL_WS_ORIGIN from the same selected API port (8001 locally), unless an explicit process-environment value is supplied. Public HTTPS origins derive a same-origin wss address. No external deployment or connection was initiated. This prevents local call clients from using the other project's port-8000 server; media, room authorization and call protocol remain unchanged.

Activation and bounded native visual results are appended after review. No full call/handshake, camera permission or device-pairing acceptance is implied by artwork review.

## Bounded native visual evidence

One native in-app-browser pass inspected the actual `/station` page on desktop, confirming the supplied full-framing device-pairing illustration beside the real eight-character code input. No pairing code was entered or submitted. A temporary component-only preview mounted native RoomEntry and PatientWaitingRoom with explicit synthetic labels, disabled media access and no backend room creation. Desktop confirmed the supplied scene in the entry hero and alongside waiting-room device readiness. Phone viewport 390px confirmed compact mobile entry artwork and the waiting-room image below the native video/device controls; the inspected waiting-room document scrollWidth was 375px with a 390px viewport/reserved scrollbar, and the scene image loaded at 320px width. The Station tab retained its desktop viewport, so mobile Station acceptance is not claimed. Both browser error samples were empty.

The synthetic entry intentionally supplied `media_ready=false`, so the native service-unavailable message was visible; it is a fixture state, not evidence of a live media failure. No real PIN, room admission, camera/microphone permission, video call, sound test or pairing workflow was exercised. Scene code/queue examples stayed explicitly labeled decorative. No repeated visual polish or unrelated findings repair occurred. Temporary tabs closed, viewport reset, preview route removed. Frontend restart follows below to remove the temporary route from the active graph.

## Active runtime

The temporary route was removed and the frontend restarted through the owned launcher after normal TCP port shutdown. Active web PID 1854463, `.next-local-dev`, UI `http://localhost:3000`, existing Medframe backend `http://127.0.0.1:8001`; original Django API/worker/scheduler/media continue running. Public-only process environment inspection confirmed BACKEND_URL=http://127.0.0.1:8001 and NEXT_PUBLIC_CALL_WS_ORIGIN=ws://localhost:8001. This confirms activation configuration, not an actual WebSocket handshake. No other project's process was terminated; no source/database reset, public deployment or external message occurred.
