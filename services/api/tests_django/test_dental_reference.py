import json
import struct
from pathlib import Path
from unittest import TestCase

from medframe_apps.dental.reference import TEETH, validate_tooth_surfaces


class DentalAssetContractTests(TestCase):
    def test_schematic_mesh_ids_match_the_versioned_reference(self):
        target = (
            Path(__file__).resolve().parents[3] / "apps/web/public/models/dental-schematic-v2.glb"
        )
        payload = target.read_bytes()
        magic, version, total = struct.unpack_from("<III", payload)
        self.assertEqual((magic, version, total), (0x46546C67, 2, len(payload)))
        length = struct.unpack_from("<I", payload, 12)[0]
        document = json.loads(payload[20 : 20 + length])
        roots = document["scenes"][0]["nodes"]
        ids = {document["nodes"][root]["extras"]["tooth_id"] for root in roots}
        self.assertEqual(ids, set(TEETH))
        patches = 0
        for root in roots:
            node = document["nodes"][root]
            tooth = node["extras"]["tooth_id"]
            surfaces = set()
            for child_id in node["children"]:
                child = document["nodes"][child_id]
                self.assertEqual(child["extras"]["tooth_id"], tooth)
                surface = child["extras"].get("surface_id")
                if surface:
                    validate_tooth_surfaces(tooth, [surface])
                    surfaces.add(surface)
                    patches += 1
            self.assertEqual(surfaces, set(TEETH[tooth]["surfaces"]))
        self.assertEqual(patches, 260)
        shared = Path(__file__).resolve().parents[3] / "apps/web/features/dental/reference.json"
        self.assertEqual(json.loads(shared.read_text())["teeth"], list(TEETH.values()))

    def test_anterior_and_posterior_surface_rules(self):
        self.assertEqual(TEETH["16"]["label"], "upper right first molar")
        with self.assertRaises(ValueError):
            validate_tooth_surfaces("11", ["occlusal"])
        with self.assertRaises(ValueError):
            validate_tooth_surfaces("16", ["incisal"])
