from botocore.exceptions import ClientError
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create the configured private local bucket without any public policy."

    def handle(self, *args, **options):
        bucket = default_storage.bucket_name
        client = default_storage.connection.meta.client
        try:
            client.head_bucket(Bucket=bucket)
        except ClientError as error:
            if str(error.response["Error"]["Code"]) not in {"404", "NoSuchBucket"}:
                raise
            client.create_bucket(Bucket=bucket)
        try:
            client.get_bucket_policy(Bucket=bucket)
        except ClientError as error:
            if error.response["Error"]["Code"] != "NoSuchBucketPolicy":
                raise
        else:
            raise ValueError(
                "Bucket has a policy. Review it before accepting private clinical uploads."
            )
        self.stdout.write("Private bucket is ready; no public policy is configured.")
