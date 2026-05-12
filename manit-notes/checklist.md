# Running checklist

My workstream. Tick as I go. See [01-mvp-scope.md](01-mvp-scope.md) for build-order context and [09-optimization-plan.md](09-optimization-plan.md) for the optimization detail.

The headline result (v2 sweep, after expanding personas and wiring L4 + L5): **optimized_v2 lifts revenue +51.88%** on the same 1,000 shoppers. Full writeup in [../documents/optimization-report.md](../documents/optimization-report.md).

## Foundations ✅

- [x] Pick language → JS (Parthiv's browser sim makes it the default)
- [x] Zone IDs aligned across data + engine
- [x] Output schema decided → in-browser state on `window.sim`, no batch JSON for v1

## Data ✅

- [x] `data/zones.json` — 9 zones with adjacency
- [x] `data/skus.json` — 100 SKUs from the brief
- [x] `data/profiles.json` — **10 shopper profiles** (expanded from 5 in v2): mission_mom, young_mom, family_weekend, young_woman, working_woman, premium_occasion, quick_trip_male, office_gifter, visiting_relative, browser. Each has `responds_to_power_wall`, `impulse_prone`, `high_value` flags.
- [x] `data/agents.json` — 1,000 generated shoppers (now randomized per build; CLI arg for reproducibility)
- [x] `data/staff.json` — 18-person roster (10 floor + 1 trial + 4 billing + 2 mgrs + 1 sec)
- [x] `data/_build/build_bundle.py` — bundles all data + policies into `store/data-bundle.js`

## Engine ✅ (Parthiv)

- [x] Sim class + Agent state machine (`pending → walking → browsing → trial → bill → exit`)
- [x] Trial cubicles + billing counters + queues
- [x] Aisle network / Manhattan routing
- [x] KPI tracking + event emission
- [x] Browser UI (canvas + inspector + timeline + insights popup)
- [x] **Policy adapter** — `Sim(policy)` constructor reads L1/L2/L3 from policy file (commit `35fa77b`)
- [x] Cover screen + executive summary with headless pre-roll
- [x] Policy toggle button in top bar (baseline ↔ optimized)

## Baseline policy ✅

- [x] `data/policies/baseline.json` authored
- [x] Schema + guard-rails documented in [08-policies-and-guardrails.md](08-policies-and-guardrails.md)
- [x] Policy adapter in `store/engine.js` reads `window.POLICY_BASELINE` (Parthiv)
- [x] Policy file in `store/data-bundle.js` bundle
- [x] Baseline run end-to-end verified (₹4.04L on cohort 101 via headless)

## Optimization sweep v2 ✅

- [x] **Personas expanded** 5 → 10 (added young_mom, working_woman, premium_occasion, office_gifter, visiting_relative)
- [x] **L4 wired in engine** — power-wall freshness intent boost + impulse-fixture content effect at billing
- [x] **L5 wired in engine** — cross-merch bundle attach + footwear-apparel adjacency
- [x] **Step 1 — Baseline validation** — baseline runs at ₹3.82L mean across 3 cohorts (new 10-persona mix). Slightly above the brief's band; calibration follow-up listed in stretch.
- [x] **Step 2 — Diagnose leaks** — peak billing wait 30 min, 161 billing abandonments, billing-capacity bottleneck plus low attach rate from physical zone separation.
- [x] **Step 3 — Per-lever sensitivity tests** — 30 candidate policies across L1×L2×L3×L4×L5 grid.
  - L1 still dominant (reactive → +29% at sched_15_16).
  - L5 bundles is the strong secondary lever (+14% alone, +44% with L1_max).
  - L4 weak alone (+5% combined) but useful additive.
  - L2/L3 still marginal.
- [x] **Step 4 — Compose optimized_v2** — `P24_combo_op_plus_full` (L1_max + staggered_2_re + attendant_cap + L4_both + L5_bundles_footwear) wins at ₹5.80L mean, **+51.88%**. Written to `data/policies/optimized_v2.json`.
- [x] **Step 5 — Optimized run + comparison** — 4-point honesty check passes:
  - [x] Revenue ↑ +51.88%
  - [x] Avg billing wait ↓ –67.8%
  - [x] Abandonment % ↓ –22.3%
  - [x] No forbidden keys
- [x] **Browser rebundle** — `store/data-bundle.js` updated with the new winner

### Sweep infrastructure ✅

- [x] `train/headless.js` — Node sim runner with seeded `Math.random()`
- [x] `train/cohorts/` — 3 pre-generated 1,000-agent sets (seeds 101, 202, 303)
- [x] `train/generate_policies.js` — emits 16 candidates
- [x] `train/sweep.js` — orchestrator (48 runs in 2.4s)
- [x] `train/pick_winner.js` — selects by highest mean revenue, writes optimized_v2
- [x] `train/plot.py` — 5 Aaru-style plots (revenue ranking, lever decomposition, cohort consistency, KPI comparison, tradeoff scatter)

## Documents ✅

- [x] [../documents/optimization-report.md](../documents/optimization-report.md) — full report with all plots embedded, methodology, results, winner spec, guard-rails, reproducibility steps

## Demo prep

- [ ] Side-by-side comparison view in Parthiv's UI (baseline + optimized_v2 toggle)
- [ ] Demo narrative rehearsal — three slides:
  1. The store today (baseline live sim, watch the queue form)
  2. The diagnosis (lever decomposition plot — L1 is the bottleneck)
  3. The fix (optimized_v2 live sim, queue dissolves; show KPI comparison plot)
- [ ] Decide on the one-paragraph elevator pitch
- [ ] Backup screenshots in case live demo fails

## Stretch / v3 roadmap (for the pitch's "what's next")

- [x] ~~Wire levers 4 + 5 into the engine~~ — done in v2. +25 percentage points of additional lift on top of v1.
- [ ] **Wire L2 active upsell** — when staff with `impulse_upsell` or zone-expert skill in `helping` state with an agent, with X% probability per second add a partner item to the agent's basket. Likely unlocks another +3-5%.
- [ ] **Multi-seed validation** — run optimized_v2 vs baseline on 10+ cohort seeds, report mean ± std bands.
- [ ] **Seed `Math.random()` in browser engine** — Node harness is seeded; browser still has ±0.2L variance per run.
- [ ] **Baseline KPI calibration** — current baseline runs at ₹3.82L vs brief's expected ₹2.8–3.6L. Engine's item-value distribution or trial-conversion rate may need tuning.
- [ ] **Pricing levers** — engine doesn't model persona-conditional price elasticity. Adding it would let us optimize the discount structure itself.
- [ ] **Margin-weighted reward variant** — jewellery is 60% margin. A margin-maximizer may differ from a revenue-maximizer.
- [ ] **Auto-search v3** — replace grid sweep with Bayesian optimization once lever space exceeds ~100 candidates.
