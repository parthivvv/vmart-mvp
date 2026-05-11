# manit-notes

Planning, design, and tracking docs for the V-Mart MVP simulation work.

Parthiv is on the store UI ([index.html](../index.html), 360 tour). I'm on shopper agents, baseline policies, and the simulation engine. This folder is the source of truth for what we're building and why.

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
| -- | [checklist.md](checklist.md) | Running todo across my workstream |

## Code layout (proposed)

```
vmart-mvp/
├── index.html                # Parthiv: store UI / 360 tour
├── thumbs/                   # Parthiv: panorama assets
├── manit-notes/              # this folder
├── sim/                      # simulation engine (mine)
│   ├── agents/               # shopper profiles + behavior
│   ├── policies/             # baseline + optimized configs
│   ├── store/                # zones, fixtures, SKUs, layout
│   ├── engine/               # tick loop, scheduler, RNG
│   └── runs/                 # output dumps from sim runs
└── data/                     # SKU catalog, arrival curves, seed configs
```

`sim/` and `data/` are scaffolded but empty — see [01-mvp-scope.md](01-mvp-scope.md) for build order.
