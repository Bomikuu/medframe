from django.db import DatabaseError, transaction

from config.errors import DomainError
from medframe_apps.diagnostics.models import ResultReview, ResultRevision
from medframe_apps.diagnostics.results import result_summary
from tests_django.diagnostics_fixture import DiagnosticFixture


class DiagnosticResultTests(DiagnosticFixture):
    def test_submit_review_correction_retains_exact_versions(self):
        row = self.submitted_request()
        first = row.current_result_id
        row = self.act(
            row,
            "review",
            result_id=str(first),
            acknowledged=True,
            interpretation="Synthetic interpretation",
            next_steps="Follow up",
        )
        self.assertEqual(row.state, "reviewed")
        row = self.act(row, "start_correction", reason="Correct synthetic report")
        row = self.act(row, "save_result", report="Corrected synthetic report")
        row = self.act(row, "submit_result")
        self.assertEqual(row.state, "results_available")
        self.assertNotEqual(first, row.current_result_id)
        self.assertTrue(ResultReview.objects.filter(result_id=first).exists())
        self.assertIsNone(result_summary(row.current_result)["review"])
        with self.assertRaises(DomainError):
            self.act(
                row,
                "review",
                result_id=str(first),
                acknowledged=True,
                interpretation="Wrong version",
            )
        with self.assertRaises(DatabaseError), transaction.atomic():
            ResultRevision.objects.filter(id=first).update(report="overwrite")

    def test_no_empty_submit_or_cancel_after_submission(self):
        row = self.performed_request()
        with self.assertRaises(DomainError):
            self.act(row, "submit_result")
        row = self.act(row, "save_result", report="Text-only laboratory-style report")
        row = self.act(row, "submit_result")
        with self.assertRaises(DomainError):
            self.act(row, "cancel", reason="Must retain submitted evidence")
