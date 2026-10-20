# Patient profile

Mode: Operate. Refinement of the incumbent white/navy/teal clinical desk. Preserve
Manrope/Jakarta hierarchy, circular patient portraits, shared shadcn/Radix controls
and Tailwind semantic tokens. No new visual world or generated patient imagery.

Doctors enter Overview by default. Its clinical history snapshot precedes identity
and contact details, with recent consultations and upcoming appointments alongside.
Amber plus explicit review text highlights allergy attention; blue identifies
medications and consultations, teal selection/scheduling, green service activity.
Never infer a reviewed state, clinical diagnosis or missing record from a tint.

Five permission-filtered groups: Overview; Clinical (notes/history/diagnostics/
plans); Charts (dental/anatomy); Care & billing (services/billing); Records
(documents/sharing/access). Detail sections remain discoverable in a second row,
with existing tab query identifiers and SafetyProvider navigation guards.
No new clinical form owner, data projection, backend or authentication behavior.

Desktop/tablet/phone captures and group/keyboard navigation have staged passing
evidence. Unsaved prompt appears; Keep editing/Discard end-to-end remains
unverified after the bounded harness confirmation used the wrong button label.
Large financial values wrap awkwardly at390px; deferred without repair. See
`docs/operations/patient-overview-refinement-verification.md` for actual coverage.

## Patient photo control

The profile identity row has a circular photo/initials control with a camera badge,
Upload/Change photo and a separate Remove action for existing photos. Removal opens
an explicit confirmation and clears only the portrait pointer. Patient files retain
their original full framing and private scan/download rules. Clinical Station and
the profile share `features/patients/profile/patient-photo-dialog.tsx`; clinical
read/write plus document-write permissions gate editing. Initials remain for
missing images and read-only users keep the normal circular display.

Real synthetic upload/security scan/select/reload and responsive circular display
pass; one focused locator correction confirms remove/cancel/persistence/file
retention. Three older Station-based backend checks stop at workspace-open403,
without photo-assertion coverage or repair. See patient-photo-upload verification.

## Central patient actions — current placement

One Patient actions header button opens the card directory; the circular camera
shortcut opens that same directory. This supersedes the earlier direct header
and tab write-button placement. Cards group Clinical care, Visits & payments and
Patient record, with search and real permission filtering. Start consultation has
the strongest navy emphasis; care/finance/record icons use existing semantic tints.

Tabs now browse records through an explicit presentation-only read-only context.
Native forms remain in the action workspace or their original dedicated editors;
Save/Cancel, confirmations, read links, downloads, filters and pagination retain
context. Patient/appointment/invoice identity stays pinned to the selected record.
Photo editing/removal uses the shared private editor from this directory. A
service reader can still review services through a read-only service card.

Desktop/tablet/phone modal and native/guard/reader groups have staged evidence;
Close header stacking is repaired in the permitted focused confirmation. No slot
was available for the chosen reschedule date; a completed reschedule is unverified.
Final consultation-history and service-reader card refinements have build/lint
verification only, with no third browser round. See patient-actions verification.
