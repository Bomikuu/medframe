"""Prepare the two officially downloaded Dundee GLBs without changing tooth geometry.

Run with the project's existing Pillow dependency:
uv run --project services/api python scripts/prepare-dental-assets.py --source-dir ~/Downloads
"""

import argparse
import hashlib
import io
import json
import struct
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
AUTHOR = "University of Dundee, School of Dentistry"
LICENSE = "https://creativecommons.org/licenses/by/4.0/"
# Stable original mesh names, not positions in a mesh array. Anatomical left is +X
# in the supplied source scene; left/right always refer to the patient.
FDI = {
    "11": "polySurface2_UL1_0",
    "12": "polySurface4_blinn14_0",
    "13": "polySurface6_blinn15_0",
    "14": "ZBrushPolyMesh3D8_blinn16_0",
    "15": "ZBrushPolyMesh3D9_blinn17_0",
    "16": "polySurface8_blinn18_0",
    "17": "polySurface10_blinn19_0",
    "18": "polySurface12_blinn20_0",
    "21": "polySurface1_UL1_0",
    "22": "ZBrushPolyMesh3D1_blinn14_0",
    "23": "ZBrushPolyMesh3D2_blinn15_0",
    "24": "ZBrushPolyMesh3D3_blinn16_0",
    "25": "ZBrushPolyMesh3D4_blinn17_0",
    "26": "ZBrushPolyMesh3D5_blinn18_0",
    "27": "polySurface9_blinn19_0",
    "28": "ZBrushPolyMesh3D7_blinn20_0",
    "31": "LL1seam_2:ZBrushPolyMesh3D_Mandible_ll1_0",
    "32": "LL2seam_2:ZBrushPolyMesh3D_Mandible_l2_0",
    "33": "LL3seam_2:ZBrushPolyMesh3D_Mandible_ll3_0",
    "34": "LL4seam_2:ZBrushPolyMesh3D_Mandible_ll4_0",
    "35": "LL5seam_3:ZBrushPolyMesh3D_Mandible_ll5_0",
    "36": "LL6seam_2:ZBrushPolyMesh3D_Mandible_blinn10_0",
    "37": "LL7seam_2:ZBrushPolyMesh3D_Mandible_ll7_0",
    "38": "LL8seam_2:ZBrushPolyMesh3D_Mandible_ll8_0",
    "41": "ZBrushPolyMesh3D7_Mandible_ll1_0",
    "42": "ZBrushPolyMesh3D6_Mandible_l2_0",
    "43": "ZBrushPolyMesh3D5_Mandible_ll3_0",
    "44": "ZBrushPolyMesh3D3_Mandible_ll4_0",
    "45": "ZBrushPolyMesh3D4_Mandible_ll5_0",
    "46": "ZBrushPolyMesh3D2_Mandible_blinn10_0",
    "47": "ZBrushPolyMesh3D1_Mandible_ll7_0",
    "48": "ZBrushPolyMesh3D_Mandible_ll8_0",
}
SOURCE_HASHES = {
    "permanent_dentition": "100cd812b35fd0f7164068fd14e2103db343b338544dfa5c6574b0b1e4bd20c4",
    "maxillary_first_molar": "fa9dd4ce00a6bad08c7ff6311f1966aad91eedee81b34c31966f5225284ea7d3",
}


def pad(data, fill=b"\0"):
    return data + fill * (-len(data) % 4)


def prepare(source, output, mapping, texture_size):
    original = source.read_bytes()
    digest = hashlib.sha256(original).hexdigest()
    if digest != SOURCE_HASHES[source.stem]:
        raise ValueError(
            "Source changed: inspect it and deliberately update the mapping first."
        )
    magic, version, length = struct.unpack_from("<III", original)
    if (magic, version, length) != (0x46546C67, 2, len(original)):
        raise ValueError("Expected a complete GLB 2.0 file")
    json_size, _ = struct.unpack_from("<II", original, 12)
    document = json.loads(original[20 : 20 + json_size])
    binary = original[28 + json_size :]
    extras = document["asset"]["extras"]
    if (
        extras["author"].split(" (")[0] != AUTHOR
        or "CC-BY-4.0" not in extras["license"]
    ):
        raise ValueError("Asset attribution does not match the inspected source")
    names = {node.get("name"): node for node in document["nodes"] if "mesh" in node}
    reference = json.loads(
        (ROOT / "apps/web/features/dental/reference.json").read_text()
    )
    teeth = {tooth["id"]: tooth for tooth in reference["teeth"]}
    for identifier, name in mapping.items():
        node = names[name]
        tooth = teeth[identifier]
        node["extras"] = {
            "tooth_id": identifier,
            "dentition": "permanent",
            "jaw": tooth["jaw"],
            "side": "left" if identifier[0] in "23" else "right",
            "anatomical_name": tooth["label"],
            "source_node": name,
            "surface_segmentation": False,
        }
        node["name"] = "Tooth_" + identifier
    if source.stem == "permanent_dentition":
        # This is a tiny four-vertex export remnant, not an additional tooth.
        remnant = names["polySurface7_blinn18_0"]
        unused_mesh = remnant.pop("mesh")
        document["meshes"].pop(unused_mesh)
        for node in document["nodes"]:
            if node.get("mesh", -1) > unused_mesh:
                node["mesh"] -= 1
        remnant["name"] = "Removed_export_fragment"
    actual = [node for node in document["nodes"] if "mesh" in node]
    if len(actual) != len(mapping) or {
        node["extras"]["tooth_id"] for node in actual
    } != set(mapping):
        raise ValueError(
            "Every visible mesh must have exactly one explicit tooth identity"
        )
    image_views = {image["bufferView"]: image for image in document.get("images", [])}
    packed = bytearray()
    for index, view in enumerate(document["bufferViews"]):
        start = view.get("byteOffset", 0)
        content = binary[start : start + view["byteLength"]]
        if index in image_views:
            image = Image.open(io.BytesIO(content))
            image.thumbnail((texture_size, texture_size), Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            if image_views[index]["mimeType"] == "image/jpeg":
                image.convert("RGB").save(
                    buffer, format="JPEG", quality=88, optimize=True
                )
            else:
                image.save(buffer, format="PNG", optimize=True)
            content = buffer.getvalue()
        view["byteOffset"] = len(packed)
        view["byteLength"] = len(content)
        packed.extend(pad(content))
    document["buffers"][0]["byteLength"] = len(packed)
    changes = [
        "Explicit FDI node names and anatomical metadata added; original transforms preserved.",
        f"Embedded textures resized to a maximum of {texture_size}px; UVs unchanged.",
        "No tooth geometry decimation, mirroring, stretching or crown/root deformation.",
    ]
    if source.stem == "permanent_dentition":
        changes.append("One non-tooth four-vertex export fragment omitted.")
    extras["modifications"] = changes
    extras["source_sha256"] = digest
    extras["physical_calibration"] = (
        "Uncalibrated source units; not patient-specific dimensions"
    )
    encoded = pad(json.dumps(document, separators=(",", ":")).encode(), b" ")
    payload = (
        struct.pack("<III", 0x46546C67, 2, 28 + len(encoded) + len(packed))
        + struct.pack("<II", len(encoded), 0x4E4F534A)
        + encoded
        + struct.pack("<II", len(packed), 0x004E4942)
        + packed
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(payload)
    return {
        "title": extras["title"],
        "author": AUTHOR,
        "source": extras["source"],
        "license": LICENSE,
        "source_sha256": digest,
        "source_bytes": len(original),
        "output": str(output.relative_to(ROOT)),
        "output_sha256": hashlib.sha256(payload).hexdigest(),
        "output_bytes": len(payload),
        "selectable_teeth": len(mapping),
        "node_mapping": mapping,
        "texture_max_size": texture_size,
        "modifications": changes,
        "clinical_validation": "Educational anatomy; mapping/scale not independently clinically validated",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, required=True)
    arguments = parser.parse_args()
    public = ROOT / "apps/web/public/models"
    assets = [
        prepare(
            arguments.source_dir / "permanent_dentition.glb",
            public / "dental-permanent-dundee-v1.glb",
            FDI,
            512,
        ),
        prepare(
            arguments.source_dir / "maxillary_first_molar.glb",
            public / "dental-molar-26-dundee-v1.glb",
            {"26": "Object_2"},
            1024,
        ),
    ]
    manifest = ROOT / "assets/dental/manifest.json"
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps({"version": 1, "assets": assets}, indent=2) + "\n")
    print(
        json.dumps(
            [
                {
                    key: asset[key]
                    for key in [
                        "title",
                        "source_bytes",
                        "output_bytes",
                        "selectable_teeth",
                    ]
                }
                for asset in assets
            ]
        )
    )


if __name__ == "__main__":
    main()
