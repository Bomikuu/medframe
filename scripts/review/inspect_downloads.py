"""Inspect files saved by real Playwright Download events; never response.text()."""

import csv
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
folder = root / "output/playwright/improvements12"
meta = json.loads(
    (
        Path.home() / ".local/share/medframe/ui-review/improvements12-review.json"
    ).read_text()
)
results = []
for name in ["aggregate-report.csv", "clinical-export.json"]:
    try:
        path = folder / name
        text = path.read_text()
        if name.endswith(".csv"):
            rows = list(csv.reader(text.splitlines()))
            assert len(rows) > 1 and len(rows[0]) > 1
            assert meta["patient_name"] not in text
        else:
            data = json.loads(text)
            assert data["schema_version"] == "medframe.clinical-export/1"
            assert data["revision"]["id"] == meta["revision"]
            assert (
                data["sections"]["soap"]["subjective"] == "Preserved synthetic account"
            )
            assert "dental" not in data["sections"]
            assert "Unpublished synthetic change" not in text
        results.append({"file": name, "status": "passed", "bytes": path.stat().st_size})
    except (OSError, ValueError, KeyError, AssertionError) as error:
        results.append({"file": name, "status": "failed", "error": str(error)})
print(json.dumps(results))
raise SystemExit(any(row["status"] != "passed" for row in results))
