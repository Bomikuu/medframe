# Online appointment continuity — items 4–6

User explicitly requested the next three recommended items, native implementation.
Use Graphify/Jev/Impeccable and existing clinical system. No agents, build or automated tests.

1. Connection recovery: use actual SDK local/remote connection-quality and reconnect events. Show
   elapsed reconnect status and browser offline state, offer an explicit in-place audio-only switch
   or audio-only reconnect. Keep room conversation mounted so unsent drafts survive media failure.
2. Doctor-only clinical panel: bind native clinical history and consultation selection to this exact
   room patient. Reuse existing Workspace/Safety providers, EncounterEditor and PatientContext. Add
   a nullable room encounter reference; create/link through native encounter services with room
   version, patient/branch/provider checks and audited actions. No independent SOAP writer. Keep
   panel mounted when collapsed and after call end for unfinished native notes; no patient access.
3. End screen: doctor explicitly reviews/shares bounded plain-text next steps/follow-up guidance.
   Preserve append-only authored room aftercare snapshots and expose latest only to admitted live
   participants. End displays the last already-delivered summary; do not add expired guest access.
   Portal owns released documents/follow-up booking; leaving and ending never finalize notes.
4. Format, launcher checkpoint/isolated restore before additive migration, local activation, one
   synthetic desktop/phone visual pass. Record hardware/native authorization/concurrency/public
   deployment gaps honestly. No public DNS/HTTPS changes; hosting answer is still pending.
