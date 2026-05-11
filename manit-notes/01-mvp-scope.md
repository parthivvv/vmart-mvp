# MVP scope

What we ship for v1, in priority order. The point of the MVP is a **convincing side-by-side demo**: baseline run vs. optimized run on the same arrival seed, showing a credible revenue lift.

## In scope (v1)

- **1,000 shopper agents** over a 12-hour simulated day. (Scale up later — physics stays the same.)
- **9 floor zones** as defined in the brief.
- **5 shopper intent profiles**, weighted per the brief (30/20/25/10/15).
- **Discrete-time simulation**, 30-min slots → 24 slots per day. (Within a slot we still resolve order for queue/trial dynamics. See [04-simulation-engine.md](04-simulation-engine.md).)
- **Baseline policy fully wired** — staff allocation, billing schedule, trial config, fixed power wall, no cross-merch, twice-a-day replenish.
- **One optimized policy** that beats baseline on revenue without cheating the model.
- **Run output**: JSON dump of per-slot KPIs (revenue, memos, queue depths, abandonments, walk-outs) that the UI can read and replay.
- **Same arrival seed** across both runs so comparison is apples-to-apples.

## Out of scope (v1)

- Multi-day simulation
- Weather / competitor external signals (locked to "typical Diwali Saturday")
- Loyalty / membership / phone capture mechanics
- Dynamic pricing mid-day
- Mobile POS / queue-buster intervention modeling
- Real-time UI streaming during a run (we batch the output, UI replays it)
- More than one optimized policy (we can A/B later)

## Build order

1. **SKU + zone data files** — static catalog drives everything else
2. **Shopper agent profiles** — five classes with state + decision rules
3. **Store state** — zones, fixtures, trial rooms, billing counters as objects
4. **Tick engine** — slot scheduler that advances time + resolves shopper actions
5. **Baseline policy** — config that holds staff/billing/trial decisions
6. **Single baseline run end-to-end** — must land in the brief's expected bands
7. **Reward function + metrics dump** — what we measure
8. **One optimized policy** — apply 2–3 of the five levers
9. **Comparison output** — baseline.json vs optimized.json on same seed

Steps 1–7 are the baseline. We don't move to optimized until baseline is credible.

## Success criteria for v1

- Baseline sim produces revenue in ₹20–26L band, conversion 36–42%, peak waits in expected ranges.
- Optimized sim, same arrival seed, produces a measurable lift (target: +10–20% revenue) traceable to specific lever changes.
- Parthiv's UI can ingest the output JSON and visualize the day.
- The whole loop (sim → output → UI replay) runs in under 60s for 1,000 agents.

## Coordination with Parthiv

- We need a **shared output schema** for the run JSON. See [06-open-questions.md](06-open-questions.md).
- Zone IDs in the sim must match zone hotspots in his 360 tour.
- His UI consumes; my sim produces. No live coupling for v1.
