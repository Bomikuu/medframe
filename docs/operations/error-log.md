# Deferred issue log

## 2026-10-19 — Dental-chart discoverability

- Report: the user could not find the teeth section after Batch 2 delivery.
- Current navigation: Patients → open patient → Start consultation → Dental findings → Show 3D view. There is no standalone Teeth sidebar destination.
- Impact: delivered dental functionality is difficult to discover.
- Status: logged for later UX review; no interface change made.

## 2026-10-19 — Synthetic demo release preparation

- A one-off demo provisioning command attempted to preview a dental release and received `INVALID_SOURCE: A selected version is unavailable for this patient.`
- The helper supplied a dental chart row ID; this is not evidence of a confirmed application defect. Source selection needs investigation before retrying.
- The entire transaction rolled back, including the attempted account and invitation. No release was created.
- Status: deferred; no application fix or further release attempt made. A separate account-only invitation was prepared for the user.

## 2026-10-19 — Start consultation visibility

- User reports that Start consultation is absent.
- Code evidence: patient overview renders ConsultationList only with `patients.clinical.read`; its Start consultation action additionally requires `encounters.write`.
- Default doctor/dentist roles include encounter writing; clinic administrator alone does not. Patient portal accounts cannot start staff consultations.
- Previous navigation instructions omitted these account requirements. Current browser identity has not been inspected.
- Status: documented; no permissions or interface changed.

## 2026-10-19 — Administrator/Dentist has no patient grants

- User reports: “This patient is unavailable or your access has changed.”
- Read-only database check confirms `admin@medframe.example.com` has Clinic Administrator and Dentist roles, but zero active patient access grants. Its clinic contains one patient; membership is branch restricted.
- Clinical reads require both clinical permission and an active patient grant within the membership branch. Adding Dentist alone did not complete patient access setup.
- Status: logged; no grant, branch, credential, or application change made. The patient's specific eligibility/branch has not been checked.

### Access setup completed after repeated user report

The existing clinic patient and administrator/Dentist membership were confirmed to share the same clinic and branch. Granted that account access to that single patient through the existing `set_patient_access` service, which records the normal audit/history events. Both clinical read and write authorization checks passed. No application code or branch restrictions changed; no other patients were granted.

## 2026-10-19 — Missing provider profile after role addition

- User reached Provider profile needed after patient access was configured.
- Adding the Dentist role directly had omitted the provider profile normally created by the native `provision_staff` command.
- Completed account provisioning through that existing command for the same clinic/branch; confirmed profile exists. Dentistry is the command's role category, credentials remain `not_verified`, and professional title remains blank.
- No clinical record was created, password/MFA reset, or application code changed. Logged the incomplete role-setup workflow for later review.
