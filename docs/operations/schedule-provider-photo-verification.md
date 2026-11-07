# Schedule provider photos — October 21, 2026

Root cause: operationsSetup supplied only provider IDs/names and both schedule rows rendered the
initials-only PatientAvatar. The saved StaffProfile photo pointer was never passed to the page.

The scoped provider payload now includes optional current photo_id, eagerly loaded through the
membership StaffProfile. The serializer checks photo organization/membership ownership. The setup
schema retains the optional nullable field. Weekly table and saved-window rows reuse StaffAvatar
with compact circular sizing. StaffAvatar now accepts a className and falls back to initials after
an image error, rather than leaving a broken image. No additional photo choice/upload is needed.

The existing private photo endpoint retains own/admin/invitation access. Its added schedule-read
path accepts only a current active provider portrait, with the same native operations.read and
require_provider_scope rules as setup: active account/clinic/membership, permitted organization,
branch and provider. Archived or unrelated staff photos do not gain this path. No public URL,
storage policy change, new role/grant, credential/MFA change, image upload or scheduling mutation.
These are source implementation descriptions, not verified authenticated authorization results.

Selected pre-edit archive: .medframe-runtime/schedule-photo-before-20261021-144533.
Focused source archive: .medframe-runtime/schedule-photo-source (10 source files, not full repo).
Temporary fallback-presentation route removed; source private at
.medframe-runtime/schedule-photo-presentation.tsx. Existing width snippet/unrelated edits retained.

Launcher stopped app; first require_stopped refused port3000 after stop with no unmanaged process
killed/guard bypassed. Later encrypted checkpoint and isolated restore succeeded:
/home/micxsz/.local/share/medframe/checkpoints/pre-batch2-20261021-144819-a89bd41
Clone medframe_django_schedule_photo_20261021_064818_8df7ba verified167 tables, source_written=false.
No migration required/applied; no post-traffic row/object fingerprint or original-data restore claim.
Active .next-local-dev/original medframe_django: API1254890, worker1255024, scheduler1255025,
media1255026, web1255527. Native launcher start reported ready. No public deployment.

Prettier and Ruff format only; no build, tests, typecheck or lint suite. One focused desktop/390x844
phone CUA visual pass reused actual StaffAvatar: missing-photo and nonexistent private-image cases
settled to circular initials without broken-image chrome. The nonexistent image requested the native
private endpoint anonymously; no real photo was read, uploaded or assigned. Successful authenticated
photo loading and cross-clinic/branch/provider/archived-image denial remain unverified as
SCHEDULE-PHOTO-001. Browser tab closed, viewport reset and temporary source route removed. Older
SCHEDULE-REF-001 phone page overflow and unrelated acceptance findings were not repaired/retested.

Graphify old root query StaffProfile/StaffAvatar/providers had no matching nodes. Source inspection
found operations setup in services/api/api_graphql/operations.py; a candidate operations/queries.py
was absent. Refreshed10-file AST corpus/output .medframe-runtime/schedule-photo-graph-corpus and
.medframe-runtime/schedule-photo-graph:132nodes/208edges, no extraction warnings. Vocabulary-selected
query [portrait,provider,staff,avatar], BFS2 returned83neighbors/13shown at400-token budget, explicitly
truncated. AST only, no private records, semantic extraction, full-repo or authorization proof.
Jev official default model jev-1.13.0 chose scoped native portrait reuse (confidence1.0,404input/
33output tokens) from sanitized generic engineering state only. No identities, credentials, photos,
PHI or private logs/attachments sent. Model judgment is not verification or authorization.
