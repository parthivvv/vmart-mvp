# Optimization plan — baseline → optimized_v1

How we go from a working baseline to a demo-able optimized run, without cheating.

## Approach in one sentence

Diagnose the baseline leaks, run small per-lever sensitivity tests to confirm which knobs actually move revenue, stack the winners into `optimized_v1.json`, and re-run on the same seed. No brute-force search.

## Why not auto-search (recap)

- The lever space is combinatorial; useful search would need the engine to model **all** 5 levers, but levers 4 and 5 aren't wired yet
- Single-seed search overfits — the "winner" can just be lucky on this arrival sequence
- The pitch story is better when each policy diff is **interpretable** ("we opened counter 2 at 5pm because the brief flags reactive opening as the bottleneck"). Search outcomes are hard to defend in front of a stakeholder.

Auto-search lives in the v2 roadmap, once the engine is complete and we can run across N seeds.

## The five steps

### Step 1 — Baseline run, validated

**Goal:** confirm the simulator produces realistic numbers under `baseline.json` before we touch anything.

- [ ] Wire policy adapter into `store/engine.js` (read `window.POLICY` if present)
- [ ] Add `data/policies/baseline.json` to `store/data-bundle.js`
- [ ] Run baseline end-to-end, capture all KPIs at end-of-day
- [ ] Check against expected bands (from `baseline.json → expected_baseline_kpis_1000_agents`):
  - Revenue: ₹2.8–3.6 L
  - Conversion: 36–42%
  - Avg ticket: ₹700–900
  - Peak billing wait: 18–28 min
  - Peak trial wait: 12–18 min
  - Basket abandonment: 8–14%
  - Walk-out: 12–20%

**If any band is off by >20%:** stop, fix the model, do not proceed. Tweaking policy on a broken baseline is a waste.

**If all bands hit:** we have a credible "before" number. Save the run output as `runs/baseline_seed42.json`.

### Step 2 — Diagnose the leaks

Look at the baseline output. The biggest opportunities are wherever a KPI lands near the **bad end** of its band:

| Symptom in baseline | Likely lever to test |
|---------------------|----------------------|
| Peak billing wait near 28 min | Lever 1 (proactive counter opening) |
| High walk-out % (16–20%) | Lever 1 + Lever 4 (power wall) |
| Peak trial wait near 18 min | Lever 3 (T01 + item cap) |
| High basket abandonment | Lever 1 + Lever 3 |
| Low avg ticket | Lever 5 (cross-merch attach) |
| Long dwell with small basket | Lever 2 (more staff in busy zone) + Lever 5 |

Pick the top 2–3 leaks. Those drive which sensitivity tests we actually run.

### Step 3 — Per-lever sensitivity tests

One policy file per lever. Each one diffs **only** that lever from baseline; everything else identical. Run each on the same seed. The lift each one produces tells us how much that lever is worth.

#### Test 3.1 — `opt_only_billing.json` (Lever 1)
- Open counter 2 proactively from 17:00 (not reactive at q≥15)
- Open counter 3 proactively from 18:00
- Keep all other levers at baseline
- **Hypothesis:** peak billing wait drops from ~25 min → ~8 min; abandonment-at-billing drops 30–50%
- **Engine status:** wired ✅

#### Test 3.2 — `opt_only_staffing.json` (Lever 2)
- De-cluster lunch: spread 12:00–15:00, max 2 staff off at any moment (was 5)
- De-cluster dinner: spread 18:30–21:00, max 2 off (was 4)
- Enable mid-shift reallocation: at 17:00, move infants staff + 1 of the "single-staff" zones to women's ethnic
- **Hypothesis:** basket-build rate in women's ethnic rises 15–25% during peak; size-curve stockouts reduced via proactive replenishment by a freed-up staff member
- **Engine status:** wired partially — staff visibility on break works; mid-shift reallocation needs a tiny adapter

#### Test 3.3 — `opt_only_trial.json` (Lever 3)
- Station T01 at women's bank
- Enforce 4-item cap (turnover speeds up ~25% per brief)
- Optional: 6 W / 3 M / 1 K cubicle split (flex one for kids during family-weekend peak)
- **Hypothesis:** peak trial wait drops from ~15 min → ~7 min; trial abandonment cut by 40%
- **Engine status:** wired partially — `attendant_present` flag exists; the cap-enforcement effect (faster cubicle turnover) needs a small engine change

#### Test 3.4 — `opt_only_merch.json` (Lever 4)  ⚠️ engine gap
- Power wall refresh at 11:00 / 15:00 / 19:00 with festive-hero SKUs matched to incoming profile peak
- Curated impulse fixture: refresh with high-margin jewellery (60%+ margin) starting 17:00
- Segmented campaign messaging at entry
- **Engine status:** NOT wired. Without the power-wall intent boost + impulse attach modeling, this run will return the same KPIs as baseline.
- **Action:** still author the file (so the schema is complete) but **don't count it in the composition** until engine catches up.

#### Test 3.5 — `opt_only_cross_merch.json` (Lever 5)  ⚠️ engine gap
- Outfit bundle fixture: kurti + leggings + dupatta co-located in women's ethnic
- Saree-jutti adjacency at the saree rack itself (not all the way across the store)
- Mid-peak replenishment at 18:00 triggered by L/XL gaps in women's ethnic
- **Engine status:** NOT wired. Stockouts and physical adjacency boosts aren't modeled.
- **Action:** author file, mark as spec-only.

### Step 4 — Compose `optimized_v1.json`

Take the wired winners from step 3 (probably 3.1 + 3.2 + 3.3) and stack their changes into one policy file.

**Compose rules:**
- Diff additively from baseline — each change cleanly attributable to one lever
- No new keys outside the `lever_N_*` blocks
- Pass the validation checklist in [08-policies-and-guardrails.md](08-policies-and-guardrails.md):
  1. Schema complete
  2. Counter coverage clean
  3. Trial cubicle sum = 10
  4. Floor staff sum ≤ 10
  5. No forbidden keys (`boost_*`, `multiplier`, `override_*`, `*_probability` at top level)
  6. Causal-chain review

### Step 5 — Optimized run + comparison

- [ ] Run `optimized_v1.json` on **the same seed** as baseline (seed=42, agents.json drawn from it)
- [ ] Capture all KPIs
- [ ] Compute deltas: Δrevenue, Δconversion, Δavg_ticket, Δpeak_bill_wait, Δpeak_trial_wait, Δabandon%, Δwalkout%
- [ ] **Honesty check** — all four must hold:
  1. Revenue ↑
  2. At least one wait metric ↓
  3. Abandon % ↓
  4. No forbidden keys used (re-run validator)

If any fail, iterate on the policy. **Don't** chase revenue by relaxing a guard-rail.

## What success looks like

Target for `optimized_v1.json` against baseline:
- Revenue: **+10–20%**
- Peak billing wait: **−40–60%**
- Peak trial wait: **−30–50%**
- Walk-out %: **−25–40%**
- Conversion %: **+4–8 percentage points**

If we hit those, the demo narrative writes itself: "by adjusting three operational levers — billing schedule, staff break clustering, trial-room attendant — V-Mart can lift Diwali Saturday revenue 15% without spending a rupee more."

## What to do if it doesn't work

| Failure | Likely cause | Fix |
|---------|-------------|-----|
| Optimized revenue ↑ but waits unchanged | Sim isn't truly reacting to lever changes — bug in policy adapter | Debug engine wiring |
| Revenue gain >25% | Causal chain probably broken somewhere — too good | Audit each lever change for unintended effects |
| Revenue down or flat | Lever moves didn't address the actual leaks | Re-diagnose; the right leak might be a different lever |
| One lever dominates everything | Either it's a real result or the other levers aren't wired | Check engine support matrix |

## Run output schema (for future-proofing)

Each run dumps a JSON in `runs/`:

```
{
  "policy_id": "baseline" | "optimized_v1",
  "seed": 42,
  "n_agents": 1000,
  "started_at": "...",
  "kpis": { revenue, memos, conversion, avg_ticket, peak_bill_wait, peak_trial_wait, abandon_pct, walkout_pct, ... },
  "by_slot": [...],      // per 30-min snapshot
  "events": [...],       // critical events (counter opens, abandonments) for narrative
  "deltas_vs_baseline": { ... }  // populated for optimized runs
}
```

The browser sim doesn't write to disk now; the in-memory `sim.kpis()` output is what we screenshot for the demo. If we move to batch runs later, this is the format.

## Stretch — auto-search v2

Future chapter, not for the MVP demo:
- Once all 5 levers are wired, define a search space (e.g., counter-open thresholds at 5 candidate values, lunch start at 5 candidate slots, etc.)
- Run a Bayesian-optimization search or simple grid sweep across **N seeds** (not 1) for variance estimates
- Validate winning policy lifts on held-out seeds
- Pitch this as "phase 2: the framework can search for optimal operational policy automatically"

This is the punchline, not the body of the demo.
