from copy import deepcopy

from django.test import SimpleTestCase
from pydantic import ValidationError

from medframe_apps.anatomy.inputs import AnatomyFindingInput
from medframe_apps.anatomy.reference import anatomy_reference
from medframe_apps.encounters.inputs import DraftInput
from tests_django.anatomy_fixture import finding


class AnatomyReferenceTests(SimpleTestCase):
    def test_canonical_sides_do_not_depend_on_camera_and_registry_is_versioned(self):
        structures = {item["id"]: item for item in anatomy_reference()["structures"]}
        for name in ["femur", "humerus"]:
            left, right = structures[f"skeleton.{name}l"], structures[f"skeleton.{name}r"]
            self.assertEqual(left["side"], "left")
            self.assertEqual(right["side"], "right")
            self.assertGreater(
                sum(left["bounds"][key][0] for key in ["min", "max"]),
                sum(right["bounds"][key][0] for key in ["min", "max"]),
            )
        value = AnatomyFindingInput.model_validate(finding())
        self.assertEqual(value.anchor.asset_version, "anatomy-skeleton-v1")

    def test_invalid_structure_side_layer_mesh_version_and_points_are_rejected(self):
        for change in [
            {"side": "right"},
            {"side": "bilateral"},
            {"layer": "body"},
            {"structure_id": "unknown"},
        ]:
            with self.subTest(change=change), self.assertRaises(ValidationError):
                AnatomyFindingInput.model_validate(finding(**change))
        for change in [
            {"asset_version": "anatomy-skeleton-v2"},
            {"mesh_id": "skeleton.femurr"},
            {"point": [float("nan"), 0, 0]},
            {"point": [100, 100, 100]},
        ]:
            value = finding()
            value["anchor"].update(change)
            with self.subTest(change=change), self.assertRaises(ValidationError):
                AnatomyFindingInput.model_validate(value)

    def test_map_anchors_old_drafts_duplicates_and_combined_bound(self):
        self.assertEqual(DraftInput.model_validate({}).anatomy_findings, [])
        value = finding(
            anchor={"kind": "map", "reference_version": 1, "view": "back", "point": [0.5, 0.3]}
        )
        AnatomyFindingInput.model_validate(value)
        with self.assertRaises(ValidationError):
            DraftInput.model_validate({"anatomy_findings": [value, deepcopy(value)]})
        with self.assertRaises(ValidationError):
            AnatomyFindingInput.model_validate(
                finding(
                    anchor={
                        "kind": "map",
                        "reference_version": 1,
                        "view": "front",
                        "point": [1.1, 0],
                    }
                )
            )
        with self.assertRaises(ValidationError):
            DraftInput.model_validate(
                {"anatomy_findings": [finding(notes="x" * 1000) for _ in range(60)]}
            )
