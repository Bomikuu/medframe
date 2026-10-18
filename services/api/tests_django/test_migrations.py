"""Migration round-trip boundaries run only in Django's disposable PostgreSQL DB."""

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase

from medframe_apps.accounts.models import User
from medframe_apps.documents.models import Document, DocumentVersion
from medframe_apps.organizations.models import Organization


class DocumentMigrationTests(TransactionTestCase):
    def test_document_integrity_and_author_migration_round_trip(self):
        user = User.objects.create_user("migration@synthetic.example", "Synthetic migration 97")
        organization = Organization.objects.create(name="Synthetic migration clinic")
        document = Document.objects.create(
            organization=organization, uploaded_by=user, purpose="logo", label="Synthetic logo"
        )
        version = DocumentVersion.objects.create(
            document=document,
            uploaded_by=user,
            key="synthetic-migration-only",
            filename="synthetic.png",
            content_type="image/png",
            expected_size=17,
            size=17,
            sha256="a" * 64,
            scan_state="clean",
        )
        executor = MigrationExecutor(connection)
        leaves = executor.loader.graph.leaf_nodes()
        try:
            executor.migrate([("documents", "0001_initial")])
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT id, sha256, scan_state FROM documents_documentversion WHERE id=%s",
                    [version.id],
                )
                self.assertEqual(cursor.fetchone(), (version.id, "a" * 64, "clean"))
        finally:
            MigrationExecutor(connection).migrate(leaves)
        preserved = DocumentVersion.objects.get(id=version.id)
        self.assertEqual(preserved.uploaded_by_id, user.id)
        self.assertEqual(preserved.sha256, "a" * 64)
        # This exercises a pre-cutover boundary. Later version-specific authors
        # would require reconciliation before any rollback that drops the field.
