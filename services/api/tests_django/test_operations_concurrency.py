from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

from django.db import close_old_connections
from django.test import TransactionTestCase

from config.errors import DomainError
from medframe_apps.operations.appointments import book_appointment
from medframe_apps.operations.models import Appointment, QueueTicket, Reservation
from medframe_apps.operations.queue import check_in
from tests_django.operations_fixture import request, seed


class OperationsConcurrencyTests(TransactionTestCase):
    def setUp(self):
        self.data = seed()

    def run_threads(self, action):
        barrier = Barrier(2)

        def worker():
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                return action()
            except DomainError as error:
                return error.code
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            return list(pool.map(lambda _: worker(), range(2)))

    def booking(self):
        data = self.data
        return {
            "branch_id": str(data.branch.id),
            "provider_id": str(data.provider.id),
            "patient_id": str(data.patient.id),
            "start": data.start.isoformat(),
            "duration": 30,
        }

    def test_concurrent_booking_has_one_winner(self):
        data = self.data
        results = self.run_threads(
            lambda: str(
                book_appointment(request(data.admin), data.org.id, self.booking(), uuid4()).id
            )
        )
        self.assertEqual(results.count("CONFLICT"), 1)
        self.assertEqual(Reservation.objects.filter(active=True).count(), 1)
        self.assertEqual(Appointment.objects.count(), 1)

    def test_concurrent_check_in_has_one_ticket(self):
        data = self.data
        row = book_appointment(request(data.admin), data.org.id, self.booking(), uuid4())
        results = self.run_threads(
            lambda: str(check_in(request(data.admin), row.id, 1, uuid4()).id)
        )
        self.assertEqual(results[0], results[1])
        self.assertEqual(QueueTicket.objects.count(), 1)
