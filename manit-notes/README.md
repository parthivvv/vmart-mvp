# manit-notes

Planning, design, and tracking docs for the V-Mart MVP simulation work.

Parthiv is on the store UI ([index.html](../index.html), 360 tour). I'm on shopper agents, baseline policies, and the simulation engine. This folder is the source of truth for what we're building and why.

**Headline result:** the sweep winner `optimized_v2` lifts revenue +26.85% on the same 1,000 shoppers. The full report with plots is in [../documents/optimization-report.md](../documents/optimization-report.md).

## Index

| # | Doc | Purpose |
|---|-----|---------|
| 00 | [00-context.md](00-context.md) | Distilled brief from `vmart - research.pdf` — the world we're simulating |
| 01 | [01-mvp-scope.md](01-mvp-scope.md) | What's in / out for v1. The thing we ship |
| 02 | [02-shopper-agents.md](02-shopper-agents.md) | Five shopper profiles, state, decision logic |
| 03 | [03-baseline-policy.md](03-baseline-policy.md) | The "before" store config — staffing, billing, layout |
| 04 | [04-simulation-engine.md](04-simulation-engine.md) | Tick model, scheduler, how a day runs |
| 05 | [05-reward-and-metrics.md](05-reward-and-metrics.md) | Revenue + the supporting KPIs |
| 06 | [06-open-questions.md](06-open-questions.md) | Decisions still owed — language, format, sync points with Parthiv |
| 07 | [07-staff-agents.md](07-staff-agents.md) | The 18-person staff roster — floor, trial-room, billing, managers, security |
| 08 | [08-policies-and-guardrails.md](08-policies-and-guardrails.md) | Policy abstraction (5 levers), env-vs-agent separation, the no-hacking rules |
| 09 | [09-optimization-plan.md](09-optimization-plan.md) | How we get from baseline to optimized_v1 — diagnostic + sensitivity tests, not auto-search |
| -- | [checklist.md](checklist.md) | Running todo across my workstream |

## Code layout (as built)

```
vmart-mvp/
├── index.html                # 360 tour landing
├── thumbs/                   # panorama assets
├── store/                    # Parthiv's browser sim
│   ├── index.html            # cover, exec summary, live sim, insights
│   ├── engine.js             # Sim + Agent classes, policy adapter
│   ├── render.js             # Canvas2D drawing
│   └── data-bundle.js        # auto-bundled window globals
├── data/                     # static inputs
│   ├── zones.json, skus.json, profiles.json, staff.json, agents.json
│   ├── policies/
│   │   ├── baseline.json
│   │   ├── optimized_v1.json (hand-crafted, +0.05%)
│   │   └── optimized_v2.json (sweep winner, +26.85%)
│   └── _build/               # generators (Python)
├── train/                    # optimization sweep harness
│   ├── headless.js           # Node sim runner (seeded RNG)
│   ├── generate_policies.js  # 16 candidate emitter
│   ├── sweep.js              # orchestrator (48 runs in 2.4s)
│   ├── pick_winner.js        # writes optimized_v2 from sweep results
│   ├── plot.py               # 5 Aaru-style plots
│   ├── candidates/           # 16 candidate JSONs
│   ├── cohorts/              # 3 pre-gen agent sets
│   ├── results/              # raw sweep output
│   └── plots/                # generated charts
├── documents/                # polished deliverables
│   └── optimization-report.md
└── manit-notes/              # this folder
```
