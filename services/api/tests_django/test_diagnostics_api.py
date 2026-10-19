from api_graphql.portal_schema import schema as portal_schema
from api_graphql.schema import schema
from config.errors import DomainError
from medframe_apps.diagnostics.queries import request_page
from tests_django.diagnostics_fixture import DiagnosticFixture


class DiagnosticApiTests(DiagnosticFixture):
    def test_schema_scope_and_patient_realm_separation(self):
        row = self.sent_request()
        query = 'query($org: UUID!, $id: UUID!) { diagnosticRequest(organizationId: $org, requestId: $id, context: "center") }'
        result = schema.execute_sync(
            query,
            variable_values={"org": str(self.center_org.id), "id": str(row.id)},
            context_value=self.center_request,
        )
        self.assertIsNone(result.errors)
        self.assertEqual(result.data["diagnosticRequest"]["id"], str(row.id))
        self.assertIn("myDiagnosticRequests", portal_schema.as_str())
        self.assertNotIn("diagnosticRequest(", portal_schema.as_str())

    def test_scope_bound_pagination(self):
        for _ in range(2):
            self.create_request()
        page = request_page(self.clinic_request, self.organization.id, context="clinic", first=1)
        self.assertTrue(page["has_next_page"])
        with self.assertRaises(DomainError):
            request_page(
                self.center_request, self.center_org.id, context="center", after=page["end_cursor"]
            )
