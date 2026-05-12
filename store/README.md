# store/ — animated browser simulation

Parthiv's UI layer. Consumes Manit's data files (`/data`) and policies (`/data/policies/`) and runs the simulation in a browser tab.

## Files

| File | What it does |
|------|--------------|
| `index.html` | Page shell · CSS · UI · top bar · controls · cover + exec-summary screens · insights popup |
| `engine.js` | Pure sim logic — `class Agent` + `class Sim` · tick loop · queue resolution · staff behaviour. **No DOM, no canvas.** |
| `render.js` | Canvas2D renderer — pre-rendered static layer (floor, walls, fixtures, labels) + per-frame dynamic layer (sprites, queues, pings, heatmap) · hit testing |
| `data-bundle.js` | Auto-generated. Wraps all the JSON files in `/data/` and `/data/policies/` as `window.*` globals so the page runs from `file://` without a local server. **Do not edit by hand** — regenerate by re-running the Python snippet in `tools/`. |
| `assets/` | AxulArt CC-BY 4.0 top-down interior tiles (referenced as floor texture inspiration only — actual rendering is canvas-drawn) |

## Architecture

```
+----------------+      +----------+      +-----------+
| data-bundle.js | ───▶ | engine   | ───▶ | renderer  |
| AGENTS/STAFF/  |      | Sim      |      | Canvas2D  |
| ZONES/PROFILES |      | Agent    |      | sprite    |
| POLICIES       |      | tick()   |      | passes    |
+----------------+      +----------+      +-----------+
                            │
                            ▼
                       window.sim
                     (read by UI hud,
                      inspector,
                      events feed,
                      insights popup)
```

Sim has no DOM dependency. Renderer reads `sim.activeAgents`, `sim.counters`, `sim.staff`, etc. UI handlers (top-bar HUD, side-panel inspector, events feed) also read from `sim` each frame.

## How policies plug in

The simulation is fully driven by a **policy** object that conforms to the schema in [data/policies/baseline.json](../data/policies/baseline.json) and the rules in [manit-notes/08-policies-and-guardrails.md](../manit-notes/08-policies-and-guardrails.md).

```js
const sim = new Sim(window.POLICY_BASELINE);     // or POLICY_OPTIMIZED_V1
```

If you pass `null` / omit the argument, Sim falls back to `window.POLICY_BASELINE`, and if that's also missing, to a hardcoded `DEFAULT_BASELINE` constant at the top of `engine.js` that mirrors `baseline.json`.

### What policies control (per Manit's spec)

| Lever | Knob | Engine wiring | Where in `engine.js` |
|-------|------|---------------|----------------------|
| **L1** Billing | `model` (reactive/scheduled), `always_open`, `reactive_rules[]`, `schedule{}` | ✅ wired | `_tickBilling()` |
| **L2** Staffing | `break_pattern` (clustered/staggered), `mid_shift_reallocation`, `reallocations[]` | ✅ wired | `staffOnBreak()`, `_applyMidShiftReallocation()` |
| **L3** Trial rooms | `cubicle_split`, `attendant_present`, `item_cap_enforced` | ✅ wired (turnover ×0.75 when attended + capped) | `Sim` constructor, `_tickTrial()` |
| **L4** Merchandising | `power_wall`, `promo_islands`, `impulse_fixture`, `campaign` | ❌ NOT wired | schema present, engine ignores |
| **L5** Cross-merch / replen | `outfit_bundle_fixtures`, `replenishment_schedule`, `mid_peak_replenishment`, `footwear_apparel_co_location` | ❌ NOT wired | schema present, engine ignores |

Lines in `engine.js` that read policy fields are tagged with `// LEVER N:` comments for grep-ability.

### Causal-chain rule (NO CHEATING)

Per `manit-notes/08`: policies change **environment**, never agents or RNG. There are no `boost_*`, `multiplier`, or `*_probability` keys at the top level of any policy. A lift comes from `policy change → env change → agent reacts → revenue moves` — never short-circuited.

If you ever feel tempted to add a key like `revenue_boost: 0.20` — don't. Model the causal mechanism instead.

### Adding a new policy

1. Author `/data/policies/<id>.json` matching the baseline schema
2. Add `'POLICY_<ID>': 'data/policies/<id>.json'` to the bundle generator
3. Regenerate `store/data-bundle.js` (Python one-liner; see commit history)
4. Add a toggle button to the policy-toggle in the top bar with `data-policy="<id>"`

## Flow / UX

1. **Cover** — branded confidential-diagnostic landing. Single CTA: "Enter diagnostic →".
2. **Executive summary** — appears after a hidden headless run gives us real numbers. Hero opportunity ₹, network annualised impact, 4 KPI tiles, top-3 moves preview, methodology box, pilot CTA.
3. **Live sim** — animated Canvas2D view. Top bar policy toggle swaps baseline ↔ optimized_v1 mid-flight (resets sim).
4. **Insights popup** — fires at sim completion. KPI cards colour-coded against spec bands. Recoverable-₹ banner. By-minute queue chart. Sorted insight cards by ₹ impact.

## Speed control

The UI ticks the sim at `dtMin = realDt * speedMul`. Real time × speed-multiplier = sim minutes per real second. So at 5× one sim-minute happens every 200ms; at 60× the full 12-hour day is ~12 real seconds.

## Headless mode (for the exec summary pre-roll)

When the cover's "Enter diagnostic →" is clicked, we instantiate a parallel `Sim` and tick it through the full day in ~100ms without rendering. This populates the exec summary with real numbers BEFORE the user watches the live animation. Same logic, same seed, same data — just no draw calls.

## Running

Open `index.html` directly — works from `file://`. No build step, no server required. The `data-bundle.js` is the trick that makes this self-contained.
