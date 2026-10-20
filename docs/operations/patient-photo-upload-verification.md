# Patient profile photo upload — October20,2026

Active locally: codex/patient-photo-upload, implementation c417b9f,
artifact .next-patient-photo, BUILD_ID JYwNt3KAlbiBTe-cab1gz.
Baseline9e5bf96, checkpoint/pre-patient-photo-2026-10-20 and
.next-header-workspace retained. Native work, no subagents or separate chats.

## Implemented

Patient profiles now expose a circular photo/initials button with a camera badge
and Upload/Change photo. An existing photo also has a visible Remove button,
opening an explicit Cancel/Remove photo confirmation. Successful changes reload
the existing scoped profile summary; closing restores focus to the circular
control. PatientAvatar/SecureImage retain circular display, private authorization
and initials fallback. No generated/fake patient faces or public image URLs.

The existing Station photo editor moved to the shared owner
features/patients/profile/patient-photo-dialog.tsx; Clinical Station imports the
same component. Its narrow patient identity props replace the unrelated full
GalleryItem requirement. The profile wrapper is patient-profile-photo.tsx.
The shared editor uses existing UploadControl, same-patient clinical documents,
JPEG/PNG/WebP up to2MiB, security scans, signed private downloads and the existing
versioned stations/portrait endpoint. Current portrait response initializes the
preview; removal mode avoids the unnecessary document-list query. Original image
bytes remain uncropped/private in the medical record; only profile display is
circular. Removal unlinks the portrait pointer, preserving original files.

Clinical read/write plus documents.write gate the new editing controls, matching
the existing native endpoint requirements. Read-only users retain the circular
avatar. No backend/API/schema/migration/permission/credential/MFA changes. No new
registration/portal photo permission or image-cropping tool. Unsaved file transfer
and error/busy handling retain their existing owners. No separate image-upload
pipeline, AI integration, messaging, money movement or public deployment.

## Tools and scope

Used incumbent Impeccable Operate/craft-floor context, existing frontend design
and canonical UI contracts, PRODUCT/DESIGN, frontend AGENTS and installed Next.js
client fetching/navigation guidance. UX-CONTRACT and patient-profile surface brief
now identify the shared photo owner. Authored supported files use Prettier/Tailwind.
User clinic-shell main layout remains byte-identical, unstaged and runtime-included.

Graphify first queried existing frontend-header-workspace with
PatientPhotoDialog UploadControl PatientProfileHeader, budget850:405 reached,
30 shown,375 truncated. Source/backend permissions were inspected independently.
Refreshed deterministic AST frontend-patient-photo graph:391 TS/TSX files,
1924 nodes,9025 directed edges,65 communities, zero external extraction tokens.
Scope app/features/components/lib; generated GraphQL, scripts/tests/docs/assets,
private state and proxy.ts excluded. Known partial station-entry.tsx line150 and
symbol-free icons module remain. Explain PatientProfilePhoto shows7 extracted
connections, including header, shared photo dialog, PatientAvatar and useWorkspace.
Backend graph not refreshed: backend source unchanged. Graphs do not prove tests.

Jev0.7.0 stored-key availability already established; no key exposed. Two generic
engineering-only calls, no patient data/private fixture/attachment/credential
state. Modeljev-1.13.0 chose reuse at1.0 confidence (410 input/33 output tokens),
and staged at1.0 (414/34). Judgments guided ownership and evidence reporting, not
clinical/security fact claims. Outputs /tmp/medframe-patient-photo-jev.json and
/tmp/medframe-patient-photo-review-jev.json.

## Actual bounded verification

Production build/TypeScript and scoped ESLint pass. Logs:
/tmp/medframe-patient-photo-{build,lint}.log. Existing three StationGalleryTests
were run once against an isolated test database: all fail at self.open() with403
instead of200, before reaching their photo assertions. The selection/version,
foreign/pending/type/size and revocation assertions therefore have no fresh passing
evidence from that run. No backend source changed, cause inferred, test repaired,
retry performed or backend suite success claimed. PATIENT-PHOTO-001 is deferred.

One planned synthetic profile browser pass and one focused locator confirmation:

- Real upload through the native document endpoint, actual ClamAV scan, clean-image
  selection, private image rendering and portrait persistence after reload pass.
  Circular upload preview/header display and no page overflow at1440/1024/390 pass.
- Initial Remove group stops on a mistaken banner role for the header inside main.
  Confirmation uses the observed header aria-label and passes Cancel preserving
  the photo, confirmed removal, initials/Upload restoration, focus return and
  persisted removal after reload. Reopening the image editor still lists the
  original uploaded file, establishing its retention.

Two distinct groups have staged passing evidence; no page exceptions in either
round. Initial failure retained as PATIENT-PHOTO-002 history; no product repair or
third browser round. Logs /tmp/medframe-patient-photo-{browser,confirmation}.log;
responsive/removed captures in output/playwright/patient-photo/. No fresh full
Station gallery, read-only/portal, scanner-failure, concurrent-version or revoked-
permission browser acceptance claim. Older deferred findings remain out of scope.

Review-only details: original services kept separate on8000/3000. Browser uses the
existing synthetic review patient and a fresh native staff session in
medframe_django_station_kiosk_review_20261019. A harmless64px checkerboard fixture,
not a face, lives privately outside Git. STORAGE_BUCKET explicitly points to new
medframe-review-patient-photo-20261020; original storage objects not touched by the
review upload. Review API asserts that DB/bucket, then runs the existing Celery
scan task eagerly with real storage/ClamAV, without a review worker or original
broker dispatch. This proves native upload/scan functionality under isolated eager
execution, not asynchronous production-worker timing. Original queue/task config
was unchanged. No review fixtures imported to original DB/storage.

## Preservation, activation and rollback

Root API/web/worker/scheduler paused for fresh encrypted checkpoint and isolated
verified restore of154 tables:
/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261020-150859-c417b9f;
clone medframe_django_patient_photo_activation_20261020. Verified source bundle,
encrypted database and private configuration remain outside Git. Fingerprints
capture/check every6695 original row across154 tables unchanged before traffic:
/home/micxsz/.local/share/medframe/checkpoints/patient-photo-original-fingerprints-20261020.json.
No migrations; manage.py migrate --check passes. Independent encrypted storage
checkpoint/isolated restore verifies51 original objects, originals not written:
private patient-photo-storage-20261020 directory and
medframe-review-patient-photo-preservation-20261020 bucket. User main-layout block
is verified byte-identical against its preserved source and its unstaged patch
copied0600 into the checkpoint. No original role/grant/password/MFA change, reset,
clone restoration over original or public push/deployment.

Activated via ./medframe start --production --dist-dir .next-patient-photo:
original medframe_django, web3000 PID2842265, API8000 PID2842032,
worker2842263, scheduler2842264. Runtime web.json confirms artifact; login3000 and
API readiness8000 HTTP200. Health confirmation is not a new logged-in original-
patient test. Review listeners8001/3001 stopped and browser closed after evidence.
Previous source/artifact/checkpoints retained; switching an old UI never implies
schema rollback or restoration of old database state.
