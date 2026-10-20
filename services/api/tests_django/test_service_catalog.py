from uuid import uuid4

from config.errors import DomainError
from medframe_apps.services.catalog import catalog_action
from medframe_apps.services.queries import catalog_page
from tests_django.test_billing import BillingFixture, request


class ServiceFixture(BillingFixture):
    def service(self, **changes):
        data = {
            "name": "Synthetic braces",
            "category": "Orthodontics",
            "description": "",
            "branch_ids": [str(self.branch.id)],
            "active": True,
            "price": "60000",
            "workflow": ["Assessment", "Installation", "Adjustments"],
            "payment_mode": "monthly",
            "deposit": "12000",
            "months": 24,
            "expected_version": 0,
        }
        data.update(changes)
        return catalog_action(self.request, self.organization.id, "save", data, uuid4())


class ServiceCatalogTests(ServiceFixture):
    def test_admin_catalog_and_doctor_redaction(self):
        row = self.service()
        self.assertEqual(row["price"], "60000.00")
        page = catalog_page(request(self.doctor), self.organization.id, self.branch.id, {})
        self.assertNotIn("price", page["items"][0])
        self.assertNotIn("deposit", page["items"][0])
        with self.assertRaises(DomainError):
            catalog_action(request(self.doctor), self.organization.id, "save", {}, uuid4())

    def test_realm_mfa_and_bounds(self):
        for req in [request(self.admin, "patient"), request(self.admin)]:
            if req.session["auth_realm"] == "staff":
                req.session["mfa_verified"] = False
            with self.assertRaises(DomainError):
                catalog_page(req, self.organization.id, self.branch.id, {})
        for values in [
            {"months": 61},
            {"deposit": "60000"},
            {"workflow": ["Step"] * 41},
            {"branch_ids": [str(uuid4())]},
        ]:
            with self.assertRaises(DomainError):
                self.service(**values)

    def test_exact_version_archive_and_replay(self):
        row = self.service()
        data = {"id": row["id"], "expected_version": row["version"], "active": False}
        key = uuid4()
        first = catalog_action(self.request, self.organization.id, "archive", data, key)
        self.assertEqual(
            first, catalog_action(self.request, self.organization.id, "archive", data, key)
        )
        with self.assertRaises(DomainError):
            catalog_action(self.request, self.organization.id, "archive", data, uuid4())

    def test_station_and_foreign_branch_denied(self):
        from types import SimpleNamespace

        req = request(self.admin)
        req.station_doctor = SimpleNamespace()
        with self.assertRaises(DomainError):
            catalog_page(req, self.organization.id, self.branch.id, {})
        with self.assertRaises(DomainError):
            catalog_page(request(self.doctor), self.organization.id, uuid4(), {})
