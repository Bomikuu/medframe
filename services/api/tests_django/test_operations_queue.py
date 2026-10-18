from uuid import uuid4

from config.errors import DomainError
from medframe_apps.encounters.models import Encounter
from medframe_apps.operations.appointments import book_appointment
from medframe_apps.operations.models import Reservation
from medframe_apps.operations.queue import add_walk_in, check_in, transition_ticket
from tests_django.operations_fixture import OperationsFixture


class OperationsQueueTests(OperationsFixture):
    def test_repeated_check_in_has_one_ticket(self):
        row = book_appointment(self.request, self.org.id, self.booking(), uuid4())
        ticket = check_in(self.request, row.id, 1, uuid4())
        self.assertEqual(check_in(self.request, row.id, 1, uuid4()).id, ticket.id)

    def test_walk_in_lifecycle_never_finalizes_care(self):
        before = Encounter.objects.count()
        data = self.booking()
        data.pop("start")
        ticket = add_walk_in(self.request, self.org.id, data, uuid4())
        self.assertFalse(Reservation.objects.filter(ticket=ticket).exists())
        ticket = transition_ticket(
            self.request, ticket.id, {"target": "called", "expected_version": 1}, uuid4()
        )
        ticket = transition_ticket(
            self.request,
            ticket.id,
            {"target": "in_service", "expected_version": ticket.version},
            uuid4(),
        )
        self.assertTrue(Reservation.objects.get(ticket=ticket).active)
        transition_ticket(
            self.request,
            ticket.id,
            {"target": "completed", "expected_version": ticket.version},
            uuid4(),
        )
        self.assertEqual(Encounter.objects.count(), before)
        self.assertFalse(Reservation.objects.get(ticket=ticket).active)

    def test_return_to_waiting_requires_reason(self):
        row = book_appointment(self.request, self.org.id, self.booking(), uuid4())
        ticket = check_in(self.request, row.id, 1, uuid4())
        ticket = transition_ticket(
            self.request, ticket.id, {"target": "called", "expected_version": 1}, uuid4()
        )
        with self.assertRaises(DomainError):
            transition_ticket(
                self.request,
                ticket.id,
                {"target": "waiting", "expected_version": ticket.version},
                uuid4(),
            )
