# Staff agents

The other half of the simulation. Shoppers walk in with intent; staff are what either converts that intent or wastes it.

## Roster — 18 total

| Role | Count | Movable? | What they do |
|------|-------|----------|--------------|
| Floor staff | 10 | yes | Zone-assigned. Help shoppers, restock fixtures, can flex to billing if cross-trained. |
| Trial-room attendant | 1 | yes | Role exists, but in **baseline NOT stationed** at the trial rooms (per brief). Acts as floor relief. |
| Billing staff | 4 | yes | 2 anchor counter 1 (B01 morning, B02 evening). 2 reactive (B03→ctr 2, B04→ctr 3) called when queue grows. |
| Store manager | 1 | **fixed** | Real-time decisions in baseline; pre-computed rules in optimized. |
| Assistant manager | 1 | **fixed** | Roves the floor, handles escalations, manages lunch rotation. |
| Security | 1 | **fixed** | Entry/exit, tag check. |
| **Total** | **18** | 15 movable | The 3 fixed roles don't change between baseline and optimized. |

This is **the actual roster on the floor**, not the V-Mart org chart. Lever 2 and lever 3 in the optimized policy re-allocate the 15 movable staff.

## Baseline floor allocation (10 staff, fixed at shift start)

| Zone | Floor staff |
|------|-------------|
| Power wall & entry | 1 |
| Women's ethnic | 2 |
| Women's western | 1 |
| Women's footwear & accessories | 1 |
| Men's casual | 1 |
| Men's formal & ethnic | 1 |
| Men's footwear & accessories | 1 |
| Kids | 1 |
| Infants | 1 |

Women's ethnic gets 2 because it's the revenue engine; every other zone gets 1.

**No mid-shift reallocation** in baseline. A staff member assigned to infants at 10am is still in infants at 8pm even if infants is empty.

## Baseline billing (1 counter open by default)

- **Counter 1: always open.** B01 anchors morning (10:00–18:00), B02 anchors evening (14:00–22:00). Overlap 14:00–18:00 is intentional handoff time.
- **Counter 2: reactive.** B03 is on standby (12:00–22:00). Store manager opens counter 2 when queue at counter 1 reaches ~15 shoppers. 5–10 min staffing delay before B03 is actually at the counter.
- **Counter 3: reactive.** B04 standby (14:00–22:00). Same trigger pattern, opens after counter 2.
- **Counters 4–6: not staffed.** Would require pulling a billing-cross-trained floor staff. In baseline, manager rarely makes this call.

This is the source of huge queues at peak: only 1 counter is open by default, and the manager opens 2nd / 3rd reactively *after* the queue is already long.

Lever 1 in optimized: open counter 2 proactively starting 17:00, counter 3 starting 18:00, etc.

## Baseline trial rooms (unmanned)

Per brief: "no staff stationed at the trial room entrance. Shoppers self-queue."

T01 (trial-room attendant role) exists in the roster but in baseline is doing **floor relief** — not at the trial rooms. The trial room queue is self-managed by shoppers, items-per-cubicle limit (4) is weakly enforced.

Lever 3 in optimized: actually station T01 at the women's bank, enforce 4-item cap, possibly add a second attendant by pulling from floor.

## Break clustering (the key constraint to model)

11 floor-side bodies (10 floor + 1 trial-room) all take a 30-min lunch and a 30-min dinner. In baseline these cluster on top of the busy windows:

**Lunch (13:00–15:00, brief: "5 staff off at any given moment in that window"):**
- 13:00–13:30: 2 off
- 13:30–14:00: **5 off ← peak**
- 14:00–14:30: 3 off
- 14:30–15:00: 1 off

**Dinner (19:00–20:30, brief: "4 staff off during apparel peak"):**
- 19:00–19:30: 3 off
- 19:30–20:00: **4 off ← peak (apparel evening)**
- 20:00–20:30: 4 off

Lever 2 in optimized de-clusters these — spread lunches across 12–4pm, stagger dinners 6:30–9pm.

## Skills (matters for lever 2 reallocation)

Each floor staff has a tag set:
- `billing_cross_trained` — can flex to a billing counter (~50% of floor staff have this)
- `womens_ethnic_expert` — knows kurti styling, suggests outfit bundling (faster basket build)
- `mens_ethnic_expert` — same for kurta sets, sherwanis
- `western_styling`, `kids_friendly`, `footwear_advisor`
- `size_advisor` — finds alternate sizes when fixture stockout
- `replenishment_capable` — can fetch from stockroom mid-peak (lever 5)
- `queue_management` — manage trial-room or billing queue (lever 3)
- `impulse_upsell` — works the impulse fixture at billing

Optimized policy prefers reassignments that match skills.

## Languages

All staff speak **Kannada** (per brief). Subsets speak:
- Hindi (~60%) for migrant shoppers
- English (~40%) for younger urban shoppers
- Tamil (~25%), Telugu (~20%) for South Indian crossover

Not modeled directly in v1 — sits in the data for v2 (e.g., language match boosts service quality).

## Service speed multiplier

Each staff gets a `service_speed_multiplier` (0.85–1.30) based on experience years:
- 0–2 years exp → 0.85–0.95
- 3–5 years → 0.98–1.10
- 6+ years → 1.12–1.28

Higher = faster basket builds, faster trial turnover. Managers get a `decision_quality_score` instead.

## Manager decision logic (baseline)

Two decisions modeled in baseline:
1. **Counter opening** — manager walks past billing every 25–30 min. If queue ≥ 15 shoppers, opens an additional counter with 5–10 min staffing delay.
2. **Ad-hoc escalations** — between 11am–1pm and 5–9pm, manager responds to floor issues, occasionally cross-checking stockouts.

In optimized policies these are pre-computed schedules, not intuition.

## What the data file gives us

[data/staff.json](../data/staff.json) — every staff member with id, name, age, gender, ethnicity, neighborhood, role, zone (or shift), experience, languages, skills, lunch + dinner slot, service speed, short backstory.

Same generator pattern as agents.json — deterministic via SEED, easy to rerun.
