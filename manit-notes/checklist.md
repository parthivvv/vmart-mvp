# Running checklist

My workstream. Tick as I go. Order roughly matches build-order in [01-mvp-scope.md](01-mvp-scope.md).

## Foundations

- [ ] Pick language (Python vs JS) — see [06-open-questions.md](06-open-questions.md) #5
- [ ] Sync with Parthiv on output JSON schema + zone IDs ([06-open-questions.md](06-open-questions.md) #1, #2)
- [ ] Lock arrival curve shape into `data/arrivals.json`

## Data

- [ ] Author `data/skus.json` from the brief's SKU tables (~100 SKUs with id, zone, MRP, Diwali price, margin)
- [ ] Author `data/zones.json` with the 9 zone definitions + adjacency
- [ ] Author `data/profiles.json` with the 5 shopper profile parameters

## Engine

- [ ] Tick loop skeleton with slot-aggregate queue resolution
- [ ] Seeded RNG plumbing (every random draw goes through it)
- [ ] Arrivals generator that respects the dual-peak curve
- [ ] State snapshot recorder → JSON output per slot

## Agents

- [ ] Agent class with the state schema in [02-shopper-agents.md](02-shopper-agents.md)
- [ ] Phase machine: ARRIVE → BROWSE → TRIAL → BILL → EXIT
- [ ] Profile-conditioned dwell, queue tolerance, basket-build rate
- [ ] Abandonment + walkout decision points

## Baseline policy

- [ ] `sim/policies/baseline.json` matching [03-baseline-policy.md](03-baseline-policy.md)
- [ ] Wire policy.apply(state, slot) for staff / billing / trial / power wall
- [ ] First full run end-to-end

## Validation

- [ ] Sanity check: revenue in ₹20–26L band
- [ ] Sanity check: conversion 36–42%
- [ ] Sanity check: peak billing wait 18–28 min
- [ ] Sanity check: walk-out % 12–20%
- [ ] If off by >20% in any band, debug model (do NOT tweak to fit)

## Optimized policy

- [ ] Pick 2–3 of 5 levers to apply
- [ ] Author `sim/policies/optimized_v1.json`
- [ ] Run on same seed as baseline
- [ ] Compare → produce diff JSON for the demo
- [ ] Verify revenue ↑ and waits ↓ both move correctly

## Demo prep

- [ ] Output JSON contract finalized with Parthiv
- [ ] One-command run: `<runner> baseline` and `<runner> optimized_v1` both dump to disk
- [ ] README in repo root explaining how to run

## Stretch (post-MVP)

- [ ] Margin-weighted reward
- [ ] Multiple optimized policies (A/B)
- [ ] Lever sensitivity sweep
- [ ] Auto-search over lever space
