# data/

Static inputs that drive the sim. Same data used by baseline and optimized runs.

## Files

| File | Status | Content |
|------|--------|---------|
| [skus.json](skus.json) | ✅ built | 100 SKUs from the brief: id, zone, sub-category, MRP, Diwali price, discount %, margin %, festive flag, hero flag, size-volatility |
| [zones.json](zones.json) | ✅ built | 9 floor zones with adjacency, sub-zones, fixtures, trial-room banks, AC schedule |
| [profiles.json](profiles.json) | ✅ built | 5 shopper profiles with chi-square arrival/dwell params, group size dist, queue tolerances, basket targets |
| [agents.json](agents.json) | ✅ built | 1,000 generated shoppers for Diwali Saturday. Each has profile, name, age, ethnicity, neighborhood, group, arrival/dwell, backstory |
| [staff.json](staff.json) | ✅ built | 18-person store roster: 10 floor, 1 trial-room, 4 billing, 2 managers, 1 security. Skills, lunch/dinner breaks, baseline assignments. See [../manit-notes/07-staff-agents.md](../manit-notes/07-staff-agents.md). |
| [policies/baseline.json](policies/baseline.json) | ✅ built | Baseline policy config — all 5 levers spec'd. The "before" run. Guard-rail rules in [../manit-notes/08-policies-and-guardrails.md](../manit-notes/08-policies-and-guardrails.md). Not yet wired into engine.js. |

## How to rebuild

```bash
python3 data/_build/build_skus.py     # → data/skus.json
python3 data/_build/build_agents.py   # → data/agents.json  (uses data/profiles.json)
python3 data/_build/build_staff.py    # → data/staff.json
```

Both are deterministic via `SEED = 42`. Same seed → same 1,000 agents in the same arrival order.

`zones.json` and `profiles.json` are hand-authored — no build step.

## Notes on the generated agents

- **Chi-square distributions** for arrival time (minutes from 10am) and dwell time, with per-profile `df`, `scale`, `shift`. Resampled if out of [0, 720] to avoid bunching at the close-of-day boundary.
- **Names** drawn from ethnically-weighted Bangalore pools (32% Kannadiga, 22% North Indian migrant, 15% Tamil, etc.) — first names match gender, last names match ethnicity.
- **Backstories** assembled from per-profile phrase pools: kids/spouse details for mission_mom, companion + intent for young_woman, group composition for family_weekend, drop-off context for quick_trip_male, browse-reason for browser.
- **Occupations** split into mature-female / young-female / male pools to keep "stay-at-home mom" off 23-year-olds.

## Source

See [../manit-notes/00-context.md](../manit-notes/00-context.md) for the V-Mart brief these are derived from.
