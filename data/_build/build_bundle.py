"""
Bundles every JSON file in /data and /data/policies into a single
store/data-bundle.js — the file Parthiv's browser sim consumes via
`window.ZONES`, `window.AGENTS`, etc.

Run this after regenerating any of the data files.

Outputs:
    store/data-bundle.js

The engine.js looks for these globals (and falls back if missing):
    window.ZONES, AGENTS, SKUS, STAFF, PROFILES,
    window.POLICY_BASELINE, POLICY_OPTIMIZED_V1
"""

import json
from pathlib import Path


HERE      = Path(__file__).resolve().parent
DATA_DIR  = HERE.parent
POLICY_DIR = DATA_DIR / "policies"
OUT_PATH  = DATA_DIR.parent / "store" / "data-bundle.js"


# Map of (file path → window global name). Order matters: engine.js reads
# these top-to-bottom, so put data files before policy files.
ENTRIES = [
    (DATA_DIR / "zones.json",    "ZONES"),
    (DATA_DIR / "skus.json",     "SKUS"),
    (DATA_DIR / "profiles.json", "PROFILES"),
    (DATA_DIR / "staff.json",    "STAFF"),
    (DATA_DIR / "agents.json",   "AGENTS"),
    (POLICY_DIR / "baseline.json",     "POLICY_BASELINE"),
    (POLICY_DIR / "optimized_v1.json", "POLICY_OPTIMIZED_V1"),
    (POLICY_DIR / "optimized_v2.json", "POLICY_OPTIMIZED_V2"),
]


def main():
    chunks = ["// Auto-bundled from /data/*.json — do not edit by hand\n"]
    for path, global_name in ENTRIES:
        if not path.exists():
            print(f"  skip {path.name} (not found)")
            continue
        # Load + re-serialize as compact JSON so the line is one big assignment
        data = json.loads(path.read_text())
        compact = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        chunks.append(f"\nwindow.{global_name} = {compact};")
        print(f"  bundled {path.relative_to(DATA_DIR.parent)} → window.{global_name}")

    OUT_PATH.write_text("".join(chunks))
    size_kb = OUT_PATH.stat().st_size / 1024
    print(f"\nwrote {OUT_PATH} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
