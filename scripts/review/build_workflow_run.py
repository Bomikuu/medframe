"""Build a private Playwright CLI callback using current synthetic metadata."""

import argparse
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--output", type=Path, required=True)
parser.add_argument(
    "--groups", help="Comma-separated narrow confirmation groups; no hidden retries"
)
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
private = Path.home() / ".local/share/medframe/ui-review"
metadata = json.loads((private / "improvements12-review.json").read_text())
output = root / "output/playwright/improvements12"
output.mkdir(parents=True, exist_ok=True)
helpers = (Path(__file__).parent / "browser-helpers.js").read_text()
journeys = (Path(__file__).parent / "workflow-finance.js").read_text()
args.output.write_text(
    "async (page) => {\nconst browser = page.context().browser();\n"
    + "const root='http://localhost:3001';\n"
    + f"const meta={json.dumps(metadata)}, dir={json.dumps(str(output))}, sessions={json.dumps(str(private))};\n"
    + f"const selected={json.dumps(args.groups.split(',') if args.groups else None)};\n"
    + "const results=[], exceptions=[];\n"
    + helpers.replace(
        "async function group(name, session, run) {",
        "async function group(name, session, run) {\nif (selected && !selected.includes(name)) return;",
    )
    + journeys
    + "\nreturn {results, pageExceptions:exceptions};\n}"
)
args.output.chmod(0o600)
print("Private browser callback prepared from fresh metadata.")
