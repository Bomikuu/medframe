from django.db import transaction

from medframe_apps.common import check_version

from .models import ClinicOnboarding, OnboardingLogo
from .validation import MODELS, STEPS, validate_step
from .verification import require_onboarding


def defaults(draft):
    values = {key: model().model_dump() for key, model in MODELS.items()}
    values["clinic"].update(name=draft.invitation.clinic_name, email=draft.invitation.email)
    values.update(draft.progress_data)
    return values


def snapshot(request):
    draft = require_onboarding(request, allow_completed=True)
    logo = OnboardingLogo.objects.filter(draft=draft, selected=True).first()
    return {
        "id": str(draft.id),
        "version": draft.version,
        "current_step": draft.current_step,
        "completed_steps": draft.completed_steps,
        "status": draft.status,
        "intro_status": draft.intro_status,
        "data": defaults(draft),
        "last_saved_at": draft.last_saved_at.isoformat(),
        "email": draft.invitation.email,
        "contact_name": draft.invitation.contact_name,
        "administrator_name": draft.user.display_name if draft.user_id else None,
        "account_ready": bool(draft.user_id),
        "logo": {
            "id": str(logo.id),
            "state": logo.scan_state,
            "width": logo.width,
            "height": logo.height,
        }
        if logo
        else None,
        "completion": draft.completion_result or None,
    }


@transaction.atomic
def save_step(request, step, data, expected_version, complete=False):
    draft = require_onboarding(request)
    draft = ClinicOnboarding.objects.select_for_update().get(id=draft.id)
    check_version(draft.version, expected_version)
    parsed = validate_step(step, data, complete)
    draft.progress_data = {**draft.progress_data, step: parsed}
    if step in draft.completed_steps:
        draft.completed_steps = [value for value in draft.completed_steps if value != step]
    if complete:
        draft.completed_steps.append(step)
        draft.current_step = STEPS[min(STEPS.index(step) + 1, len(STEPS) - 1)]
    draft.status = (
        "ready_for_review"
        if all(value in draft.completed_steps for value in STEPS[:5])
        else "in_progress"
    )
    draft.version += 1
    draft.save()
    from medframe_apps.auditing.services import audit

    audit(
        request.user if request.user.is_authenticated else None,
        "onboarding.step_saved",
        resource_id=draft.id,
    )
    return snapshot(request)
