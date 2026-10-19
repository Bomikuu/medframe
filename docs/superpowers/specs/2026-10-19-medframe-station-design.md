# Medframe Station design

Status: implementation authorized directly by the user's October 19 request. Native execution only. Source brief: `docs/requirements/medframe-station.txt`. The request explicitly asks for design and plan first, then implementation now; no additional approval gate is inferred.

## Outcome and delivery order

One existing patient consultation continues between desktop and clinic tablets without duplicate clinical stores. Staff identity, patient grants, device configuration and editing ownership remain separate. Preserve Django authentication/MFA, immutable history and existing financial authority.

Phase 1 delivers device administration, expiring pairing with staff approval, a focused clinician workspace, a server-enforced editing lease, device transfer and attributed responsibility handoff. Phase 2 adds verified patient kiosk journeys and department queue stages around one visit. Phase 3 adds configured provider-confirmed digital payments and minimal read-only TV responses. Later phases remain authorized scope, but each is a separately activated connected milestone; no unfinished flow is presented as operational.

## Reuse and options

Reuse EncounterEditor, RHF, one EncounterDraft/version, existing dental/anatomy editors, scoped documents, PatientContext and permission-gated billing. A separate tablet editor would duplicate clinical ownership. URL-only navigation would not stop stale writes. Therefore use the existing editor plus an explicit server lease checked in `require_encounter(write=True)`, shared by saves, templates, completion, finalization, amendments and encounter-bound document writes.

## Device boundary

Devices belong to one active clinic/branch, with named mode and bounded capabilities. Only existing `organization.manage` membership can administer its branch; no superuser bypass. Pairing code is eight unambiguous random characters, digest-only, single-use, five-minute expiry. Redemption creates an opaque HttpOnly credential but leaves the device awaiting staff approval. A short-lived device verification phrase is shown on both ends for physical comparison. Approval requires the same authorized administrator route; the pairing page returns device configuration only, never patient data. Device credential is independent of staff session rotation. Thirty-day absolute credential expiry; live revocation is checked on every request. New pairing invalidates previous credential. No unrestricted permanent clinic code.

Unpaired desktop clients receive an opaque HttpOnly editing identity. Pairing changes that browser's credential, never its staff or patient identity. Non-clinician paired modes cannot call staff/patient record APIs. Clinician devices still need native staff MFA, live clinic/branch membership, patient grants and permitted functions. Revoked/expired credentials fail closed. Browser focused mode is not OS kiosk lockdown.

## Editing ownership and handoff

One lease per encounter, owner user plus browser credential, optional paired device. Fifteen-minute renewable lease; status polling renews only the owner's active editor. Writes require the owner while a lease exists; expired leases require explicit reclaim, never silently let a previous writer resume. Lock pauses editing until explicit resume. Claim, handoff and writes lock the same encounter row, then lease row. Direct service callers without request context cannot bypass an existing lease.

Transfer creation follows an acknowledged save and exact aggregate version; UI freezes new edits during generation and verifies no subsequent dirty input. Codes expire in five minutes and remain digest-only. Pending/expired/cancelled handoffs retain the original lease. Acceptance requires an approved clinician device, named staff MFA, existing encounter write authorization, matching clinic/branch, live sender lease, same saved version and lease generation. A device-only transfer requires the same named clinician. Acceptance atomically switches ownership; old browser immediately loses server write authority. Sender sees read-only on polling, retaining memory-only unsaved input for explicit review. No local storage of clinical content.

Responsibility handoff additionally names an eligible existing provider, includes a concise summary and outstanding tasks, requires the current responsible provider as sender and the named receiver's acceptance with their own patient grants. Only a nonfinalized consultation can change provider. Existing linked active queue tickets must first be resolved through clinic operations rather than silently changing queue responsibility. Accepted changes increment the existing encounter version and produce an attributed Station event plus audit entry. No implicit patient grants, completion or financial action.

Persist only bounded editor selection (tab, tooth/surface, anatomy structure/layer), not a second clinical draft. Receiving UI opens the same Encounter and restores that selection. PHI never appears in pairing/status responses or public URLs; handoff context is returned only after recipient authorization and code validation.

## Operate interface direction

Preserve Manrope/Jakarta, existing white/cool canvas, navy primary actions, teal selection and actual shared shadcn components. Devices & Stations uses a readable table, explicit connection age, approval/revocation controls and a structured creation form. Public pairing is a restrained, generous single task with eight code blocks, mode/status and next step. Clinician Station has a slim persistent patient/visit/status strip, full-width existing charts, touch-sized clinical tabs and contextual care/payment panel. Handoff is a focused sheet/dialog with saved-version acknowledgement, identity, summary, expiry, acceptance and cancellation states. Do not fabricate connected status, provider integration or AI advice.

## External dependencies and limits

Kiosk verification will reuse portal patient proofs, not matching name/date of birth. Queue extension needs explicit visit/department models and provider-nullability rules. Digital payments need a real configured provider, authenticated webhooks and reconciliation; hardware cash/printers and OS lockdown require operator setup. No live money movement, external messages or new patient credentials in Phase 1. Code pairing is supported first; camera scanning/QR generation is optional follow-up rather than a broken control.

## Preservation and verification

Commit/tag the current source, retain `.next-clinic-onboarding`, encrypted DB checkpoint with verified restore, synthetic isolated review, then fresh activation checkpoint and original-row fingerprints around additive migrations. Run accumulated scoped backend, build/type/lint and desktop/tablet/phone browser checks once. Log unrelated failures; standing activation authorization allows blocker repair and a focused confirmation. No public deployment, clone import, credential reset or subagents.
