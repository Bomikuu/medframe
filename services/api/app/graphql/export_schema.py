from pathlib import Path

from app.core.config import ROOT
from app.graphql.schema import schema

if __name__ == "__main__":
    path = ROOT / "apps/web/schema.graphql"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(schema.as_str() + "\n")
    print(f"Schema exported to {Path(path).relative_to(ROOT)}")
