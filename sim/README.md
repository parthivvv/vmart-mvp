# sim/

Simulation engine code. Not yet written.

See [../manit-notes/](../manit-notes/) for design — especially:
- [01-mvp-scope.md](../manit-notes/01-mvp-scope.md) for build order
- [04-simulation-engine.md](../manit-notes/04-simulation-engine.md) for tick model
- [06-open-questions.md](../manit-notes/06-open-questions.md) for language decision

## Planned layout

```
sim/
├── agents/        # shopper agent class + 5 profile definitions
├── policies/      # baseline.json, optimized_v1.json
├── store/         # zone, fixture, trial room, billing counter models
├── engine/        # tick loop, scheduler, RNG, arrivals generator
└── runs/          # output JSON dumps from sim runs (gitignored eventually)
```
