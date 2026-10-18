"""Build owned schematic GLB v1 with explicit FDI tooth/surface metadata.

Rounded patches demonstrate selection, not clinically validated anatomy.
"""

import argparse
import json
import math
import struct
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--version", type=int, choices=[1, 2], default=2)
version = parser.parse_args().version

positions = []
indices = []
rings, segments = 8, 12
for ring in range(rings + 1):
    theta = math.pi * ring / rings
    for segment in range(segments + 1):
        phi = 2 * math.pi * segment / segments
        positions.extend(
            [
                math.sin(theta) * math.cos(phi),
                math.cos(theta),
                math.sin(theta) * math.sin(phi),
            ]
        )
for ring in range(rings):
    for segment in range(segments):
        first = ring * (segments + 1) + segment
        second = first + segments + 1
        indices.extend([first, first + 1, second, second, first + 1, second + 1])

# Partition the unit schematic into six rounded faces. Surface names are assigned
# explicitly per tooth below; face array order never determines a tooth ID.
patches = [[] for _ in range(6)]
for offset in range(0, len(indices), 3):
    triangle = indices[offset : offset + 3]
    center = [
        sum(positions[index * 3 + axis] for index in triangle) / 3 for axis in range(3)
    ]
    axis = max(range(3), key=lambda value: abs(center[value]))
    face = axis * 2 + (0 if center[axis] >= 0 else 1)
    patches[face].extend(triangle)

if version == 2:
    # A rounded box silhouette separates incisor, canine, premolar and molar crowns.
    # This remains schematic geometry, with no anatomical/diagnostic claim.
    positions = [math.copysign(abs(value) ** 0.5, value) for value in positions]
normal_values = []
for offset in range(0, len(positions), 3):
    vector = [
        value ** (3 if version == 2 else 1) for value in positions[offset : offset + 3]
    ]
    length = math.sqrt(sum(value * value for value in vector)) or 1
    normal_values.extend(value / length for value in vector)
normals = struct.pack(f"<{len(normal_values)}f", *normal_values)
vertices = struct.pack(f"<{len(positions)}f", *positions)
binary = bytearray(vertices + normals)
views = [
    {"buffer": 0, "byteOffset": 0, "byteLength": len(vertices), "target": 34962},
    {
        "buffer": 0,
        "byteOffset": len(vertices),
        "byteLength": len(vertices),
        "target": 34962,
    },
]
accessors = [
    {
        "bufferView": 0,
        "componentType": 5126,
        "count": len(positions) // 3,
        "type": "VEC3",
        "min": [-1, -1, -1],
        "max": [1, 1, 1],
    },
    {
        "bufferView": 1,
        "componentType": 5126,
        "count": len(positions) // 3,
        "type": "VEC3",
    },
]
meshes = []
for patch in patches:
    data = struct.pack(f"<{len(patch)}H", *patch)
    views.append(
        {
            "buffer": 0,
            "byteOffset": len(binary),
            "byteLength": len(data),
            "target": 34963,
        }
    )
    binary.extend(data)
    binary.extend(b"\0" * (-len(binary) % 4))
    accessors.append(
        {
            "bufferView": len(views) - 1,
            "componentType": 5123,
            "count": len(patch),
            "type": "SCALAR",
        }
    )
    meshes.append(
        {
            "primitives": [
                {
                    "attributes": {"POSITION": 0, "NORMAL": 1},
                    "indices": len(accessors) - 1,
                    "material": 0,
                }
            ]
        }
    )

nodes, roots = [], []
for quadrant in range(1, 9):
    count = 8 if quadrant <= 4 else 5
    upper = quadrant in {1, 2, 5, 6}
    right = quadrant in {1, 4, 5, 8}
    for position in range(1, count + 1):
        tooth = f"{quadrant}{position}"
        angle = (position - 0.5) / count * math.pi / 2
        rotation = angle * (-1 if right else 1)
        metadata = {
            "tooth_id": tooth,
            "jaw": "upper" if upper else "lower",
            "dentition": "permanent" if quadrant <= 4 else "primary",
        }
        crown = "incisal" if position <= 3 else "occlusal"
        surfaces = [
            "mesial" if right else "distal",
            "distal" if right else "mesial",
            None if upper else crown,
            crown if upper else None,
            "buccal",
            "palatal" if upper else "lingual",
        ]
        root = len(nodes)
        roots.append(root)
        nodes.append(
            {
                "name": f"tooth_{tooth}",
                "children": [],
                "extras": metadata,
                "translation": [
                    (-1 if right else 1) * math.sin(angle) * 5,
                    1.2 if upper else -1.2,
                    math.cos(angle) * 4,
                ],
                "rotation": [0, math.sin(rotation / 2), 0, math.cos(rotation / 2)],
                "scale": [
                    (
                        0.36
                        if position <= 2
                        else 0.31
                        if position == 3
                        else 0.4
                        if position <= 5
                        else 0.49
                    )
                    if version == 2
                    else (0.35 if position <= 3 else 0.45),
                    (0.56 if position <= 2 else 0.7 if position == 3 else 0.48)
                    if version == 2
                    else 0.65,
                    (
                        0.24
                        if position <= 2
                        else 0.31
                        if position == 3
                        else 0.4
                        if position <= 5
                        else 0.47
                    )
                    if version == 2
                    else (0.35 if position <= 3 else 0.45),
                ],
            }
        )
        for mesh, surface in enumerate(surfaces):
            nodes[root]["children"].append(len(nodes))
            nodes.append(
                {
                    "name": f"tooth_{tooth}_{surface or 'base'}",
                    "mesh": mesh,
                    "extras": {
                        **metadata,
                        **({"surface_id": surface} if surface else {}),
                    },
                }
            )

document = {
    "asset": {
        "version": "2.0",
        "generator": f"Medframe schematic development geometry v{version}",
    },
    "scene": 0,
    "scenes": [{"nodes": roots}],
    "nodes": nodes,
    "meshes": meshes,
    "materials": [
        {
            "name": "Schematic ivory",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.85, 0.89, 0.92, 1],
                "metallicFactor": 0,
                "roughnessFactor": 0.7,
            },
        }
    ],
    "buffers": [{"byteLength": len(binary)}],
    "bufferViews": views,
    "accessors": accessors,
}
encoded = json.dumps(document, separators=(",", ":")).encode()
encoded += b" " * (-len(encoded) % 4)
payload = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(encoded) + 8 + len(binary))
payload += struct.pack("<II", len(encoded), 0x4E4F534A) + encoded
payload += struct.pack("<II", len(binary), 0x004E4942) + binary
target = (
    Path(__file__).resolve().parents[1]
    / f"apps/web/public/models/dental-schematic-v{version}.glb"
)
target.parent.mkdir(parents=True, exist_ok=True)
target.write_bytes(payload)
print("Generated schematic GLB: 52 explicit teeth and 260 named surface patches.")
