import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

from medframe_apps.auditing.services import audit
from medframe_apps.operations.models import BranchRevision, OperationsEvent


def bump_branch(branch_id, kind):
    row, _ = BranchRevision.objects.get_or_create(branch_id=branch_id)
    row = BranchRevision.objects.select_for_update().get(pk=row.pk)
    row.revision += 1
    row.save(update_fields=["revision"])
    revision = row.revision

    def publish():
        try:
            async_to_sync(get_channel_layer().group_send)(
                f"operations.{branch_id.hex}",
                {"type": "operations.changed", "kind": "changed", "revision": revision},
            )
        except Exception:
            logging.getLogger(__name__).warning(
                "Operations invalidation unavailable; snapshot revision retained"
            )

    transaction.on_commit(publish)
    return revision


def event(request, branch, obj, kind, before=None, after=None, reason=""):
    OperationsEvent.objects.create(
        branch=branch,
        actor=request.user,
        object_id=obj.id,
        kind=kind,
        before=before or {},
        after=after or {},
        reason=reason,
    )
    audit(request.user, f"operations.{kind}", branch.organization_id, obj.id)
    bump_branch(branch.id, kind)
