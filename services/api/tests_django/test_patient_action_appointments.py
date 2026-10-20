from datetime import timedelta
from uuid import uuid4

from config.errors import DomainError
from medframe_apps.operations.appointments import appointment_page, book_appointment
from medframe_apps.organizations.models import Branch, Organization
from medframe_apps.patients.inputs import RegisterPatientInput
from medframe_apps.patients.models import Patient
from medframe_apps.patients.services import register_patient
from tests_django.operations_fixture import OperationsFixture


class PatientActionAppointmentTests(OperationsFixture):
    def test_patient_filter_is_applied_before_pagination_without_changing_branch_list(self):
        other = register_patient(
            self.doctor,
            self.org.id,
            RegisterPatientInput(
                full_name="Synthetic other action patient",
                branch_id=self.branch.id,
                request_id=uuid4(),
            ),
        )
        own = book_appointment(self.request, self.org.id, self.booking(), uuid4())
        book_appointment(
            self.request,
            self.org.id,
            self.booking(
                patient_id=str(other.id),
                start=(self.start + timedelta(hours=1)).isoformat(),
            ),
            uuid4(),
        )
        filters = {"branch_id": str(self.branch.id), "status": "booked"}
        all_rows = appointment_page(self.request, self.org.id, filters)
        own_rows = appointment_page(
            self.request, self.org.id, {**filters, "patient_id": str(self.patient.id)}
        )
        self.assertEqual(len(all_rows["items"]), 2)
        self.assertEqual([row["id"] for row in own_rows["items"]], [str(own.id)])

    def test_foreign_clinic_patient_is_rejected_instead_of_exposing_branch_records(self):
        foreign = Organization.objects.create(name="Synthetic foreign action clinic")
        branch = Branch.objects.create(organization=foreign, name="Foreign")
        patient = Patient.objects.create(
            organization=foreign,
            branch=branch,
            registered_by=self.admin,
            full_name="Synthetic foreign action patient",
            reference="SYNTHETIC-ACTION-FOREIGN",
        )
        with self.assertRaises(DomainError) as failure:
            appointment_page(
                self.request,
                self.org.id,
                {"branch_id": str(self.branch.id), "patient_id": str(patient.id)},
            )
        self.assertEqual(failure.exception.code, "NOT_FOUND")

    def test_malformed_patient_filter_is_a_domain_error(self):
        with self.assertRaises(DomainError) as failure:
            appointment_page(
                self.request,
                self.org.id,
                {"branch_id": str(self.branch.id), "patient_id": "invalid"},
            )
        self.assertEqual(failure.exception.code, "INVALID_INPUT")
