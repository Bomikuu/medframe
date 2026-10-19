from medframe_apps.patients.services import require_patient


def require_anatomy_patient(user, organization_id, patient_id, *, write=False):
    return require_patient(
        user,
        organization_id,
        patient_id,
        "patients.clinical.write" if write else "patients.clinical.read",
        lock=write,
    )
