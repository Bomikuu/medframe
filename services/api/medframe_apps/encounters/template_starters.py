"""Optional documentation prompts, never clinical defaults or recommendations."""

STARTERS = [
    {
        "specialty": code,
        "name": f"{name} documentation",
        "prompts": {
            "subjective": "Document the reason for the visit and relevant reported history.",
            "objective": (
                "Record the examination observations and measurements made during this visit."
            ),
            "assessment": "Document your assessment and the certainty of each recorded diagnosis.",
            "plan": "Record the care plan discussed and any agreed follow-up.",
        },
        "observation_labels": labels,
    }
    for code, name, labels in [
        ("pediatrics", "Pediatrics", ["Measurement and unit", "Reported history source"]),
        ("dermatology", "Dermatology", ["Location", "Observed appearance"]),
        ("orthopedics", "Orthopedics", ["Location and side", "Observed movement"]),
    ]
]
