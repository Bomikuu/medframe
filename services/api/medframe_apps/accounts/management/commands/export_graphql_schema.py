from django.core.management.base import BaseCommand

from api_graphql.schema import schema
from config.runtime import ROOT


class Command(BaseCommand):
    help = "Export the actual Django GraphQL contract without a running server."

    def handle(self, *args, **options):
        target = ROOT / "apps/web/schema.graphql"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(schema.as_str() + "\n")
        from api_graphql.portal_schema import schema as portal_schema

        (ROOT / "apps/web/portal-schema.graphql").write_text(portal_schema.as_str() + "\n")
        self.stdout.write("Django GraphQL schema exported.")
