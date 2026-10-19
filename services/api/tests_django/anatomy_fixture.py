from uuid import uuid4

from medframe_apps.anatomy.reference import anatomy_reference
from medframe_apps.encounters import services as care
from tests_django import test_encounters
from tests_django.test_boundaries import ClinicalFixture


def finding(**changes):
    item = next(
        value for value in anatomy_reference()["structures"] if value["id"] == "skeleton.femurl"
    )
    return {
        "key": str(uuid4()),
        "registry_version": 1,
        "layer": "skeleton",
        "structure_id": item["id"],
        "side": "left",
        "description": "Synthetic clinician observation",
        "category": "observed",
        "severity": "mild",
        "status": "active",
        "notes": "Synthetic private clinical note",
        "terminology_system": "",
        "code": "",
        "anchor": {
            "kind": "model",
            "asset_version": item["asset_version"],
            "mesh_id": item["mesh_id"],
            "point": [
                (a + b) / 2
                for a, b in zip(item["bounds"]["min"], item["bounds"]["max"], strict=True)
            ],
        },
        **changes,
    }


class AnatomyFixture(ClinicalFixture):
    start = test_encounters.EncounterWorkflowTests.start

    def complete(self, encounter, values):
        encounter = care.save_encounter_draft(
            self.doctor,
            self.organization.id,
            encounter.id,
            {"anatomy_findings": values},
            encounter.version,
        )
        if encounter.status == "draft":
            encounter = care.transition_encounter(
                self.doctor, self.organization.id, encounter.id, "in_progress", encounter.version
            )
        encounter = care.transition_encounter(
            self.doctor, self.organization.id, encounter.id, "completed", encounter.version
        )
        return care.finalize_encounter(
            self.doctor, self.organization.id, encounter.id, encounter.version
        )
