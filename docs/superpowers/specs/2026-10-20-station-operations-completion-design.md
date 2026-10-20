# Station operations completion design — improvement Phase 4

Status: approved by the user proceeding after this written contract was presented.
Phase3 is active separately; proceed with Phase4 natively, no agents.
Implementation plan: docs/superpowers/plans/2026-10-20-station-operations-completion.md.

## Outcome and chosen approach

An approved TV device shows current calls and upcoming numbers, while reception,
patient kiosk and cashier continue the same native visit. Existing queue engines,
patient verification and clinical/financial owners remain authoritative.

Use an authenticated device-only POST snapshot every five seconds, with a strict
public-safe projection. This fits existing pairing/revocation/CSRF transport and
avoids a new websocket identity or duplicate queue engine. A public URL feed would
be easier to copy but would lose approved-device control; a new push service adds
transport/reconnect work without improving the initial five-second requirement.

## Display boundary

- `/station/display` has a dedicated full-screen, readable light/navy layout,
  clinic/branch, local clock, current calls, upcoming list and authored notices.
  An active display device opens it directly from Station; no doctor login code.
- POST `/stations/display` accepts only a live approved device credential whose
  mode is display and whose functions contain queue.display. No staff login,
  patient proof, tenant/branch selector or arbitrary identifiers in the request.
  Derive the organization/branch from that credential; recheck state/expiry on
  every request. Kiosk/clinician/pending/revoked/foreign credentials are denied.
- Response is `no-store, private`, schema version1; allowlist only clinic name,
  branch name, timezone, server timestamp, branch revision, currently called/
  in-service entries (maximum12), upcoming waiting entries (maximum20), authored
  announcements (maximum3, each maximum240 plain-text characters). Each queue
  entry has an opaque display key, public queue label, department, assigned
  clinician's display name if applicable, configured counter/room label and
  call token. Never serialize patient/visit/encounter identifiers, names, photos,
  contact data, reasons, notes, priorities, financial values or internal events.
- Today's native VisitStage and QueueTicket states are projected without writes.
  A linked consultation ticket is represented once using its patient's existing
  department label. Unlinked native consultation tickets use their existing
  numeric queue label. QueueTicket order is authoritative for consultation;
  provider-optional department queues retain native priority/created order.
  Do not invent cross-department priority or waiting-time estimates.
- Call/recall tokens derive only from native call events. First load and reconnect
  establish a baseline; do not announce historical calls. New calls may play one
  optional chime/spoken queue number plus room/counter after a local user gesture.
  Sound is off by default, persisted on that display only, and never speaks names.
- Five-second non-overlapping polls, 20-second request timeout, last successful
  contact visible. Network failure shows a stale warning; hide the retained queue
  after30 seconds. Permission/revocation failure clears it immediately. Retry
  uses current authoritative snapshot, with no historical-event replay. On a
  clinic-day rollover discard old-day entries. No browser offline cache/history.
- Native direct consultation queues gain an attributed, versioned recall action
  without changing order, reservations, clinical state or other transitions.

## Authored display settings

Authorized branch administrators edit up to3 plain-text announcements using
exact version checks and audit; empty text removes a notice. No HTML, uploads,
external links or automated clinical content. Departments gain an optional public
counter/room label (maximum60 characters), also exact-versioned/audited. These
are additive settings, with empty defaults for original clinics. Do not seed
announcements, rooms or department policies into original data.

## Same visit, ticket and cashier

Keep native admission/transfer/close owners and normal reception assignment;
strict mode alone repeats verification. Tickets show number, department, issue
time, next step and optional assigned room/provider; print only this ticket.
A print layout must not include the surrounding patient's balance or identity.
Payment continuation transfers to cashier in the same StationVisit; returning to
another department creates the next VisitStage with a previous pointer, never a
new visit or a duplicate active stage. No kiosk action can mark an invoice paid.

## Payment timing contract

- Department setting `payment_timing` is `after` (default) or `before`. Cashier
  stages are always accessible. This setting never initiates/edits a charge.
- Before-service stages require an explicitly staff-linked, issued invoice for
  the same patient, branch and organization. A foreign/draft/void invoice is
  rejected. Link management requires billing.read plus queues.manage; expose no
  bill amounts or invoice selection to ordinary workflow-only staff.
- On entry to in_service, recheck the issued invoice's **due through today**, using
  native installment projection, not the whole future principal. Zero due through
  today permits service. Missing/withdrawn invoice or positive current due blocks
  service and offers cashier continuation. Ordinary call/recall remains allowed.
- An authorized billing.adjust + queues.manage staff member may explicitly bypass
  that transition once with a nonempty10–240-character exception reason. Record
  actor, timestamp, stage and invoice in immutable audit history. This exception
  never marks paid or settles obligations. It is not a reusable clearance.
- The check runs in both native department and linked consultation queue service-
  start paths, so changing screens cannot bypass it. Default after-service stages
  and unlinked legacy queues retain existing behavior. Completion never finalizes
  clinical notes. A linked invoice follows transfer within the same visit where
  valid; returning to a before-service department rechecks current due/refunds.

## Data and privacy

Additive migration for display settings, department counter/payment timing and
optional stage invoice pointer, plus constraints/tenant guards following existing
Station integrity style. Existing identity/passwords/MFA/grants/leases and all
original records remain intact. No live payment provider, SMS, cash hardware,
medical AI, public deployment or physical printer/network claims.

## Bounded acceptance

One accumulated scoped backend pass: approved display allowlist/branch isolation,
revocation, date rollover, native ordering/dedup/call/recall/transfer/completion,
announcement bounds/version denial, invoice scope/current due/future installments,
refund reopening, exact-version denial and audited exception/direct-queue guard.
Phase3 browser evidence is retained separately without retesting its editors.
Phase4 has one browser pass and at most one focused confirmation for TV/tablet/
phone layouts, pairing copy/reopen/regenerate/consume, stale/reconnect, opt-in
sound and same-visit cashier ticket. Save print artifacts when reached and inspect
actual content; record unreached assertions as acceptance gaps. Log unrelated failures rather than expanding
scope. Local activation uses fresh encrypted checkpoint/verified restore, full
preservation fingerprints/private storage verification and additive original
migrations only. No review clone import or restore over original data.
