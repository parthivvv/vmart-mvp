# Running checklist

My workstream. Tick as I go. See [01-mvp-scope.md](01-mvp-scope.md) for build-order context and [09-optimization-plan.md](09-optimization-plan.md) for the optimization detail.

## Foundations ✅

- [x] Pick language → JS (Parthiv's browser sim makes it the default)
- [x] Zone IDs aligned across data + engine
- [x] Output schema decided → in-browser state on `window.sim`, no batch JSON for v1

## Data ✅

- [x] `data/zones.json` — 9 zones with adjacency
- [x] `data/skus.json` — 100 SKUs from the brief
- [x] `data/profiles.json` — 5 shopper profiles with chi-square arrival + dwell
- [x] `data/agents.json` — 1,000 generated shoppers (seeded, deterministic)
- [x] `data/staff.json` — 18-person roster (10 floor + 1 trial + 4 billing + 2 mgrs + 1 sec)

## Engine ✅ (Parthiv)

- [x] Sim class + Agent state machine (`pending → walking → browsing → trial → bill → exit`)
- [x] Trial cubicles + billing counters + queues
- [x] Aisle network / Manhattan routing
- [x] KPI tracking + event emission
- [x] Browser UI (canvas + inspector + timeline + insights popup)

## Baseline policy 🟡

- [x] `data/policies/baseline.json` authored
- [x] Schema + guard-rails documented in [08-policies-and-guardrails.md](08-policies-and-guardrails.md)
- [ ] Wire policy adapter into `store/engine.js` — read `window.POLICY` if present, fall back to current hardcoded
- [ ] Add policy file to `store/data-bundle.js` bundling
- [ ] First full baseline run end-to-end using the policy file

## Step 1 — baseline validation

Targets scaled for 1,000 agents (from [09-optimization-plan.md](09-optimization-plan.md) and `baseline.json → expected_baseline_kpis_1000_agents`):

- [ ] Run baseline, capture all KPIs at end-of-day
- [ ] Revenue in ₹2.8–3.6 L band
- [ ] Conversion in 36–42% band
- [ ] Avg ticket in ₹700–900 band
- [ ] Peak billing wait in 18–28 min band
- [ ] Peak trial wait in 12–18 min band
- [ ] Basket abandonment in 8–14% band
- [ ] Walk-out % in 12–20% band
- [ ] If any band off by >20% → **stop, debug model first** (do NOT tweak to fit)
- [ ] Save baseline KPI snapshot for comparison

## Step 2 — diagnose the leaks

- [ ] Identify top 2-3 KPIs sitting at the bad end of their bands
- [ ] Map each to its driving lever (symptom→lever table in [09-optimization-plan.md](09-optimization-plan.md))
- [ ] Pick the levers to test in step 3

## Step 3 — per-lever sensitivity tests

Each policy diffs **only** one lever from baseline. Same seed across all.

**Lever 1 — billing schedule (wired ✅)**
- [ ] Author `data/policies/opt_only_billing.json` — open counter 2 at 17:00, counter 3 at 18:00 proactively
- [ ] Run, record Δrevenue / Δpeak_bill_wait / Δabandon%
- [ ] Hypothesis check: peak bill wait → ~8 min, abandon at billing → −40%

**Lever 2 — floor staffing (wired partial 🟡)**
- [ ] Author `data/policies/opt_only_staffing.json` — de-cluster lunch (max 2 off) + dinner (max 2 off); mid-shift reallocation: infants → women's ethnic at 17:00
- [ ] Tiny engine adapter for mid-shift reallocation hook
- [ ] Run, record deltas
- [ ] Hypothesis check: basket-build rate in women's ethnic +15-25% peak

**Lever 3 — trial rooms (wired partial 🟡)**
- [ ] Author `data/policies/opt_only_trial.json` — T01 at women's bank, 4-item cap, 6 W / 3 M / 1 K split
- [ ] Engine adapter: item-cap effect on cubicle service time
- [ ] Run, record deltas
- [ ] Hypothesis check: peak trial wait → ~7 min, trial abandonment −40%

**Lever 4 — merchandising (engine gap ⚠️)**
- [ ] Author `data/policies/opt_only_merch.json` for completeness — power wall refreshes, curated impulse
- [ ] Mark as `engine_status: not_wired` in the file
- [ ] Do NOT count this in composition until engine catches up

**Lever 5 — cross-merch + replenish (engine gap ⚠️)**
- [ ] Author `data/policies/opt_only_cross_merch.json` for completeness — outfit bundles, saree-jutti adjacency, mid-peak replenish
- [ ] Mark as `engine_status: not_wired`
- [ ] Do NOT count this in composition

- [ ] Rank wired levers (1, 2, 3) by revenue lift

## Step 4 — compose optimized_v1

- [ ] Take top 2-3 wired winners from step 3
- [ ] Author `data/policies/optimized_v1.json` stacking their changes additively
- [ ] Pass validation:
  - [ ] Schema complete (all 5 `lever_N_*` blocks present)
  - [ ] Counter open/closed/reactive cover 1-6 without overlap
  - [ ] `cubicle_split` sums to 10
  - [ ] Floor staff sum ≤ 10
  - [ ] No forbidden keys (`boost_*`, `multiplier`, `override_*`, `*_probability` at top level)
  - [ ] Causal-chain review — each diff justifiable as env→agent→revenue

## Step 5 — optimized run + comparison

- [ ] Run optimized_v1 on the **same seed** as baseline (seed=42)
- [ ] Capture all KPIs
- [ ] Compute deltas vs baseline
- [ ] Honesty check (all four must hold):
  - [ ] Revenue ↑
  - [ ] At least one wait metric ↓
  - [ ] Abandon % ↓
  - [ ] No forbidden keys used
- [ ] Lift in 10–20% range → demo ready
- [ ] Lift >25% → audit for broken causal chain (too good)
- [ ] Lift flat/down → re-diagnose, return to step 2

## Demo prep

- [ ] Side-by-side comparison view in Parthiv's UI (baseline + optimized)
- [ ] Narrative bullets — one per lever change with the "why"
- [ ] Screenshots: baseline insights popup, optimized insights popup, KPI delta table
- [ ] One-paragraph elevator pitch ready

## Stretch / v2 roadmap (for the pitch's "what's next")

- [ ] Wire levers 4 + 5 into the engine (power-wall intent boost, size-curve stockouts, physical adjacency boost)
- [ ] Multi-seed validation (5 seeds, report variance bands)
- [ ] Margin-weighted reward variant (jewellery is 60% margin — exploit that)
- [ ] Auto-search v2 — Bayesian-opt or grid sweep over lever space, validated on held-out seeds
