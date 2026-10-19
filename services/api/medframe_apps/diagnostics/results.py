from config.errors import DomainError
from medframe_apps.diagnostics.models import (
    ResultAttachment,
    ResultDraft,
    ResultReview,
    ResultRevision,
)


def result_action(request, row, action, data):
    if action == "review":
        if (
            row.state != "results_available"
            or row.current_result_id != data.result_id
            or not data.acknowledged
            or not data.interpretation
        ):
            raise DomainError(
                "CONFLICT", "Review and acknowledge the current submitted result.", 409
            )
        ResultReview.objects.create(
            result=row.current_result,
            actor=request.user,
            interpretation=data.interpretation,
            next_steps=data.next_steps,
        )
        row.state = "reviewed"
        return
    if action == "start_correction":
        if row.state not in {"results_available", "reviewed"} or not data.reason:
            raise DomainError("CONFLICT", "Give a reason to correct a submitted result.", 409)
        draft, _ = ResultDraft.objects.get_or_create(assignment=row.assignment)
        draft.reason = data.reason
        draft.version += 1
        draft.save()
        row.state = "performed"
        return
    if action not in {"save_result", "submit_result"} or row.state != "performed":
        raise DomainError(
            "CONFLICT", "This result action is unavailable in the current state.", 409
        )
    draft, _ = ResultDraft.objects.select_for_update().get_or_create(assignment=row.assignment)
    if action == "save_result":
        draft.report = data.report
        draft.accession = data.accession
        draft.version += 1
        draft.save()
        return
    files = list(draft.attachments.select_related("version__document").order_by("created_at")[:21])
    if len(files) > 20 or any(item.version.scan_state != "clean" for item in files):
        raise DomainError(
            "UNSAFE_DOCUMENT", "Wait for clean security scans on all result files.", 409
        )
    if not draft.report and not files:
        raise DomainError("INVALID_INPUT", "Add a report or a clean result file before submission.")
    if row.current_result_id and not draft.reason:
        raise DomainError("INVALID_INPUT", "A correction needs an attributed reason.")
    result = ResultRevision.objects.create(
        request=row,
        assignment=row.assignment,
        actor=request.user,
        sequence=row.results.count() + 1,
        report=draft.report,
        accession=draft.accession,
        reason=draft.reason,
        performed_at=row.assignment.performed_at,
        manifest=[{"id": str(item.version_id), "sha256": item.version.sha256} for item in files],
    )
    ResultAttachment.objects.bulk_create(
        [ResultAttachment(result=result, version=item.version) for item in files]
    )
    row.current_result = result
    row.state = "results_available"
    from medframe_apps.diagnostics.notifications import notify_reviewers

    notify_reviewers(row)


def result_summary(result):
    review = ResultReview.objects.filter(result=result).select_related("actor").first()
    return {
        "id": str(result.id),
        "sequence": result.sequence,
        "report": result.report,
        "accession": result.accession,
        "reason": result.reason,
        "performed_at": result.performed_at.isoformat(),
        "submitted_at": result.created_at.isoformat(),
        "author": result.actor.display_name,
        "review": {
            "interpretation": review.interpretation,
            "next_steps": review.next_steps,
            "author": review.actor.display_name,
            "reviewed_at": review.created_at.isoformat(),
        }
        if review
        else None,
        "files": [
            {
                "id": str(item.version_id),
                "label": item.version.document.label,
                "content_type": item.version.content_type,
                "filename": item.version.filename,
                "version": item.version.version,
                "size": item.version.size,
            }
            for item in result.attachments.select_related("version__document").order_by(
                "created_at"
            )[:20]
        ],
    }
