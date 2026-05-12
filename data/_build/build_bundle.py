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

# Sweep candidates — bundled as one array so the UI's policy picker can list
# them all without ~34 separate window globals.
CANDIDATES_DIR = DATA_DIR.parent / "train" / "candidates"
RESULTS_PATH   = DATA_DIR.parent / "train" / "results" / "latest.json"


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

    # Bundle the sweep candidates (~34 small policy JSONs) + their measured
    # mean revenues / deltas from latest.json so the UI can show them all.
    candidates = []
    aggs_by_id = {}
    if RESULTS_PATH.exists():
        for a in json.loads(RESULTS_PATH.read_text()).get("aggregates", []):
            aggs_by_id[a["policy_id"]] = a
    if CANDIDATES_DIR.exists():
        for f in sorted(CANDIDATES_DIR.glob("*.json")):
            p = json.loads(f.read_text())
            pid = p.get("id")
            agg = aggs_by_id.get(pid, {})
            candidates.append({
                "id": pid,
                "name": p.get("name"),
                "version": p.get("version"),
                "levers_chosen": p.get("levers_chosen", {}),
                "lever_1_billing": p.get("lever_1_billing"),
                "lever_2_floor_staffing": p.get("lever_2_floor_staffing"),
                "lever_3_trial_rooms": p.get("lever_3_trial_rooms"),
                "lever_4_merchandising": p.get("lever_4_merchandising"),
                "lever_5_cross_merch_and_replenishment": p.get("lever_5_cross_merch_and_replenishment"),
                "mean_revenue": agg.get("mean_revenue"),
                "delta_revenue_pct": agg.get("delta_revenue_pct"),
                "mean_conversion": agg.get("mean_conversion"),
                "mean_peak_bill_wait": agg.get("mean_peak_bill_wait"),
            })
        compact = json.dumps(candidates, ensure_ascii=False, separators=(",", ":"))
        chunks.append(f"\nwindow.POLICY_CANDIDATES = {compact};")
        print(f"  bundled {len(candidates)} candidates → window.POLICY_CANDIDATES")

    OUT_PATH.write_text("".join(chunks))
    size_kb = OUT_PATH.stat().st_size / 1024
    print(f"\nwrote {OUT_PATH} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
