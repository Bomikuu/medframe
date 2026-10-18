PATIENT_ROLE_PERMISSIONS = {
    "patients.register": {"doctor", "dentist", "receptionist", "clinic_administrator"},
    "patients.demographics.read": {
        "doctor",
        "dentist",
        "nurse",
        "receptionist",
        "clinic_administrator",
    },
    "patients.demographics.write": {"doctor", "dentist", "receptionist", "clinic_administrator"},
    "patients.directory.manage": {"receptionist", "clinic_administrator"},
    "patients.clinical.read": {"doctor", "dentist", "nurse"},
    "patients.clinical.write": {"doctor", "dentist"},
    "patients.access.manage": {"clinic_administrator"},
}
