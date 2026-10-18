"""Development reference v1, FDI two-digit identifiers (patient's perspective).

Designation source: https://www.iso.org/standard/68292.html (ISO 3950:2016).
The explicit tooth-16 example is also required by the user's master specification.
This reference and the schematic geometry still require clinical review.
"""

QUADRANTS = {
    1: "upper right",
    2: "upper left",
    3: "lower left",
    4: "lower right",
    5: "upper right",
    6: "upper left",
    7: "lower left",
    8: "lower right",
}
PERMANENT = [
    "central incisor",
    "lateral incisor",
    "canine",
    "first premolar",
    "second premolar",
    "first molar",
    "second molar",
    "third molar",
]
PRIMARY = ["central incisor", "lateral incisor", "canine", "first molar", "second molar"]
TEETH = {}
for quadrant, position in QUADRANTS.items():
    names = PERMANENT if quadrant <= 4 else PRIMARY
    for index, name in enumerate(names, 1):
        TEETH[f"{quadrant}{index}"] = {
            "id": f"{quadrant}{index}",
            "label": f"{position} {name}",
            "dentition": "permanent" if quadrant <= 4 else "primary",
            "jaw": "upper" if quadrant in {1, 2, 5, 6} else "lower",
            "surfaces": [
                "mesial",
                "distal",
                "buccal",
                "palatal" if quadrant in {1, 2, 5, 6} else "lingual",
                "incisal" if index <= 3 else "occlusal",
            ],
        }


def validate_tooth_surfaces(tooth, surfaces):
    if (
        tooth not in TEETH
        or len(set(surfaces)) != len(surfaces)
        or any(value not in TEETH[tooth]["surfaces"] for value in surfaces)
    ):
        raise ValueError("Use a valid FDI tooth and its supported surfaces")
