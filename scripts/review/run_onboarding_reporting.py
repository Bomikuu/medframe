"""Run independent bounded Phase5 browser groups using private synthetic state."""

import argparse
import json
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--groups")
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
private = Path.home() / ".local/share/medframe/ui-review"
meta = json.loads((private / "phase5-metadata.json").read_text())
output = root / "output/playwright/phase5"
output.mkdir(parents=True, exist_ok=True)
code = (
    "async (page) => { const browser=page.context().browser();\n"
    + "const root='http://localhost:3001';\n"
    + f"const meta={json.dumps(meta)}, dir={json.dumps(str(output))}, sessions={json.dumps(str(private))};\n"
    + f"const selected={json.dumps(args.groups.split(',') if args.groups else None)};\n"
    + "const results=[], exceptions=[];\n"
    + (Path(__file__).parent / "onboarding-reporting.js").read_text()
    + "\nreturn {results,pageExceptions:exceptions}; }"
)
raise SystemExit(
    subprocess.call(
        [
            "bash",
            str(Path.home() / ".codex/skills/playwright/scripts/playwright_cli.sh"),
            "-s=phase5",
            "run-code",
            code,
        ]
    )
)
