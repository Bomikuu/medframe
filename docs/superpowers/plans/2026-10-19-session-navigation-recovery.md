# Session-aware navigation recovery

Native bug fix. Preserve records, MFA, scoped Station sessions and pairing; no authorization bypass. Existing user instruction authorizes bounded checks and local activation.

- [x] Add a no-store native session destination endpoint after existing session/Station middleware. Distinguish staff, patient, scoped doctor/encounter, device mode and anonymous/stale sessions. Permit this diagnostic endpoint through existing Station path restrictions without relaxing clinical queries.
- [x] Replace root/cookie-presence/login checks with a shared no-store server session reader. Redirect validated identities to their actual surface; leave anonymous login available and display an honest recovery state if the API cannot be reached.
- [x] Add explicit Open my workspace and browser sign-out recovery outside WorkspaceProvider. Sign-out can explicitly detach local device cookies without revoking the clinic device or changing credentials; ordinary Station end-session behavior stays intact.
- [x] Verify native routing/realm/MFA/device isolation and logout semantics in one focused backend pass, build/TypeScript/scoped lint/Ruff, and a bounded synthetic browser run for existing-session redirects and recovery. Log unrelated gaps, refresh graph evidence and record Jev sanitized judgment.
- [x] Save source, fresh encrypted checkpoint/isolated restore, fingerprint preservation and local activation with original database and prior artifact retained.
