from django.db import models

from medframe_apps.common import Record


class ClinicWebsite(Record):
    organization = models.OneToOneField("organizations.Organization", on_delete=models.PROTECT)
    slug = models.SlugField(max_length=60, unique=True)
    content = models.JSONField(default=dict)
    version = models.PositiveIntegerField(default=1)
    published = models.ForeignKey(
        "WebsitePublication", null=True, on_delete=models.PROTECT, related_name="+"
    )


class WebsitePublication(Record):
    website = models.ForeignKey(
        ClinicWebsite, on_delete=models.PROTECT, related_name="publications"
    )
    number = models.PositiveIntegerField()
    content = models.JSONField()
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["website", "number"], name="website_publication_number")
        ]


class WebsiteDomain(Record):
    website = models.OneToOneField(ClinicWebsite, on_delete=models.PROTECT)
    hostname = models.CharField(max_length=253)
    challenge = models.CharField(max_length=80)
    verified_at = models.DateTimeField(null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["hostname"],
                condition=models.Q(verified_at__isnull=False),
                name="verified_website_hostname",
            )
        ]
