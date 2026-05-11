# Policies & guard-rails

How baseline vs optimized differ — and the hard rules that keep the comparison honest.

## What a policy is

A **policy** is a configuration object that describes the **store environment** for one simulation run. Same agents, same arrival sequence, same seed — only the policy changes.

Policies live at [data/policies/](../data/policies/) as JSON files:
- `baseline.json` — what the store actually does today (source of the "before" number)
- `optimized_v1.json`, `optimized_v2.json`, ... — what we propose (coming later)

Each one is a knob set for the **5 levers** (see [00-context.md](00-context.md)). The engine reads the policy and configures the store accordingly. Agents make decisions based on the environment they encounter.

## The clean separation: environment vs agent

| Policy controls (env) | Policy MUST NOT touch (agent / data) |
|-----------------------|--------------------------------------|
| Counters open per slot | Trial-use probability per profile (`TRIAL_PROB`) |
| Floor staff zone assignments | Queue tolerance thresholds (from `profiles.json`) |
| Trial cubicle split (W/M/K) | Intent strength baseline per profile |
| Trial attendant present? Item cap enforced? | Arrival times (from `agents.json`) |
| Power wall SKU set | Group sizes, dwell times, basket size targets |
| Promo island content | Purchase probability after trial (engine constant) |
| Impulse fixture content | Service speed of any individual staff member |
| Cross-merch fixture adjacency | Profile mix, group composition |
| Replenishment cadence | Anything in `data/agents.json` |
| Break clustering pattern | Anything in `data/profiles.json` |
| Mid-shift staff reallocation on/off | RNG seed |

If a knob you want isn't in the left column, **it doesn't belong in a policy**. Either it's a fixed property of the world (right column) or it needs to be added to the schema first — explicitly, with a justification.

## The causal-chain rule

The lift from baseline → optimized must flow through this chain:

```
policy change → environment change → agent reacts to new env → revenue moves
```

You can never short-circuit it. Examples:

✅ **Allowed**:
- Open counter 2 at 5pm proactively → queue at counter 1 shorter → fewer agents abandon basket → more memos
- Station T01 at trial bank + enforce 4-item cap → cubicle turnover faster → trial queue shorter → less basket reduction
- Add a kurti-leggings-dupatta outfit bundle fixture → kurti shopper passes leggings on the way out → attach rate rises
- Refresh power wall with festive SKUs at 5pm → arriving young-woman / family agents that respond to power wall freshness get an intent boost via the *featured SKU* mechanism

❌ **Cheating**:
- Add a policy key `boost_revenue: 0.20`
- Add `purchase_probability_multiplier: 1.15`
- Add `trial_to_purchase_rate: 0.80` (forces conversion past brief's stated 50-60%)
- Add `intent_strength_global_boost: 1.20` (must come from power wall, not by fiat)
- Add `cubicle_service_time_min: 4` (must come from item cap enforcement, not directly)
- Add `attach_probability: 0.40` (must come from physical adjacency)

If you find yourself wanting to write any of these keys: **stop**. The right move is to model the causal mechanism, not the outcome.

## The 5 levers — schema overview

Each policy file is shaped like:

```
{
  "id": "...",
  "name": "...",
  "lever_1_billing": { ... },
  "lever_2_floor_staffing": { ... },
  "lever_3_trial_rooms": { ... },
  "lever_4_merchandising": { ... },
  "lever_5_cross_merch_and_replenishment": { ... }
}
```

### Lever 1 — billing schedule

Per-slot decision of which counters are open. Two modes:

- **`"reactive"`** — counters open when manager observes queue length crossing a threshold (with staffing delay). This is what baseline does.
- **`"scheduled"`** — counters open according to a fixed schedule. This is what optimized policies use to open counters *before* the queue gets long.

Keys:
- `model`: `"reactive"` or `"scheduled"`
- `always_open`: list of counter IDs (1-6)
- `always_closed`: list of counter IDs
- `reactive_rules`: list of `{ counter, trigger_queue_min, staffing_delay_min_range }` (mode=reactive)
- `schedule_per_slot`: map of `slot → list of counter IDs` (mode=scheduled)

### Lever 2 — floor staffing

Zone assignments and break pattern.

Keys:
- `model`: `"fixed_all_day"` or `"reallocate_per_slot"`
- `assignments`: zone → number of staff (or null = use staff.json defaults)
- `mid_shift_reallocation`: bool
- `break_pattern`: `"clustered"` or `"staggered"`
- `cross_train_to_billing_at_peak`: bool (lets floor staff flex)
- `t01_role`: `"floor_relief"` (baseline) or `"trial_attendant"` (optimized) or `"queue_management"` etc

### Lever 3 — trial rooms

Cubicle split and queue management.

Keys:
- `cubicle_split`: `{ womens_bank, mens_bank, kids_bank }` (must sum to 10)
- `attendant_present`: bool
- `item_cap_enforced`: bool (only meaningful if attendant_present=true)
- `item_cap_count`: int (default 4 per brief)
- `service_time_normal_min_range`: `[lo, hi]` — the *measured* base distribution; policy doesn't override this directly, item cap is what shortens it

### Lever 4 — merchandising

Power wall, promo islands, impulse fixtures.

Keys:
- `power_wall`:
  - `refresh_cadence`: `"weekly_monday_only"` (baseline) | `"per_block_4h"` | `"daily_morning"`
  - `featured_skus`: list of SKU IDs (null = use default seasonal set)
  - `festive_concentration_pct`: 0-100
- `promo_islands`:
  - `curation`: `"excess_inventory"` (baseline) | `"impulse_curated"`
  - `content_skus`: list of SKU IDs or sub-categories
- `impulse_fixture`:
  - `refresh_during_day`: bool
  - `skus`: list of SKU IDs
- `campaign`:
  - `targeting`: `"single_for_all"` (baseline) | `"segmented_by_profile"`
  - `slogan`: free-text
  - `mechanics`: list (e.g. `["flat_30_off_apparel", "b2g1_ethnic"]`)

### Lever 5 — cross-merch + replenishment

Physical SKU adjacencies and stockroom-to-floor cadence.

Keys:
- `outfit_bundle_fixtures`: bool (baseline = false)
- `cross_zone_adjacencies`: list of `{ from_zone, to_zone, sub_category, position }` — physical placements that violate strict zone blocking
- `replenishment_schedule`: list of clock times (baseline `["10:00", "16:00"]`)
- `mid_peak_replenishment`: bool (baseline false; optimized can enable a 6pm top-up triggered by size-curve gaps)
- `stockout_response`: `"passive"` (baseline — staff check only when asked) | `"proactive"` (staff check fixtures every N minutes)
- `footwear_apparel_co_location`: bool (baseline false — footwear opposite side of store)

## Engine support matrix

Some levers are spec'd in the schema but not yet wired into Parthiv's engine. Be honest about which is which:

| Lever | Spec'd | Wired now | Notes |
|-------|--------|-----------|-------|
| 1 Billing schedule | ✅ | ✅ partial | Engine has C1 open + reactive at q≥15/20. Doesn't yet read schedule mode. |
| 2 Floor staffing | ✅ | ✅ partial | Uses `staff.json` zones. No per-slot reallocation hook. |
| 3 Trial rooms | ✅ | ✅ partial | Cubicles modeled. `attendant_present`, `item_cap_enforced` flags exist in spec but engine doesn't act on them yet. |
| 4 Merchandising | ✅ | ❌ | No power-wall intent boost, no impulse fixture model. Brief mentions; engine doesn't. |
| 5 Cross-merch + replenish | ✅ | ❌ | No stockouts, no replenishment cadence, no physical adjacency boost. |

When a lever is **spec'd but not wired**, the optimized policy can still set the knob — but the resulting run won't actually behave differently until the engine catches up. That's a wiring task, not a policy task.

## Validation

Every policy file should pass these checks before being used:

1. **Schema**: all top-level keys (`id`, `name`, `lever_1` … `lever_5`) present.
2. **Counter consistency**: `always_open + always_closed + reactive_rules counters` covers 1-6 without overlap.
3. **Trial sum**: `cubicle_split.{w,m,k}` sums to 10.
4. **Staff sum**: floor zone assignments sum to ≤10 (movable floor budget).
5. **No forbidden keys**: scan for keys matching `boost_*`, `multiplier`, `override_*`, `*_probability` at the top level → reject.
6. **Causal-chain check (manual)**: for each diff from baseline, ask "what env change does this represent and what agent reaction does that cause?" If the answer is "directly raises X", it's a hack.

The optimized policy isn't merged until it passes #1-5 mechanically and #6 by review.

## How baseline → optimized will work

1. Start from `baseline.json` as the literal "before" config.
2. Run the sim, capture baseline KPIs (revenue, conversion, waits, abandon %).
3. Sanity-check against the brief's expected bands (scaled for 1,000 agents: ~₹3L revenue, 36–42% conv, peak waits 18–28 min).
4. Author `optimized_v1.json` — diff the baseline by changing one to a few lever knobs.
5. Run on the **same seed**. Compare.
6. Lift is real if (a) revenue ↑, (b) waits ↓, (c) abandon % ↓, and (d) no forbidden keys were used.

## Files

- [data/policies/baseline.json](../data/policies/baseline.json) — the baseline config (now)
- `data/policies/optimized_v1.json` — coming after baseline is validated end-to-end

## Open follow-up

The policy file is data-only right now — Parthiv's engine doesn't read it yet. Wiring it in is a one-shot edit (`Sim` constructor takes a `policy` arg, replaces the hardcoded constants). Not done yet because:
- The user wanted docs + JSON first
- The hardcoded baseline already matches what `baseline.json` describes, so behavior is identical
- Engine wiring is a follow-up Parthiv or I can take when the user gives the word

Once wired, the bundle step in [store/data-bundle.js](../store/data-bundle.js) needs to add `window.POLICY_BASELINE = {...}`.
