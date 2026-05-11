# Baseline policy

The exact "before" config the simulator runs first. This is what the Bangalore store manager actually does today. We have to be faithful to it — the lift only counts if the baseline is realistic.

## Staffing (10 floor staff, fixed all day)

| Zone | Floor staff |
|------|-------------|
| Power wall & entry | 1 |
| Women's ethnic | 2 |
| Women's western | 1 |
| Women's footwear & accessories | 1 |
| Men's casual | 1 |
| Men's formal & ethnic | 1 |
| Men's footwear & accessories | 1 |
| Kids (boys + girls) | 1 |
| Infants | 1 |
| **Total** | **10 FTE** |

Plus 1 trial-room attendant (T01) on the roster but **not at the trial rooms** in baseline — acts as floor relief.

**Break clustering** (the constraint that creates the upside, across 11 floor-side bodies):
- Lunch breaks 1pm–3pm → peak 5 staff off at 1:30–2pm
- Dinner breaks 7pm–8:30pm → peak 4 staff off at 7:30–8pm (during apparel peak)
- **No mid-shift reallocation.** A staff member assigned to infants at 10am is still in infants at 8pm.

## Billing — 1 counter open by default

- 6 counters exist. Single straight queue feeds all.
- 4 billing staff total:
  - **B01 + B02 anchor counter 1** all day (B01 morning 10–18, B02 evening 14–22, overlap is handoff)
  - **B03 standby** — opens counter 2 when manager calls (queue ≥ 15, 5–10 min staffing delay)
  - **B04 standby** — opens counter 3 when needed
- Counters 4–6: would require pulling a billing-cross-trained floor staff. Manager rarely makes this call in baseline.
- ~2–3 min per memo on Diwali (larger BOGO baskets)
- No mobile POS, no queue-busters, no signage

This is the source of huge queues at peak: **only 1 counter is open by default**, and additional counters open reactively *after* the queue is already long.

## Trial rooms — unmanned

- 7 women's, 3 men's, 0 kids cubicles — fixed all day
- **No one stationed at the entrance.** Shoppers self-queue.
- T01 (trial-room attendant by role) exists but in baseline is doing floor relief, not at trial rooms
- No item limit enforcement
- Cubicle turnover: 4–7 min normal, 8–12 min at peak
- Trial→purchase conversion baseline: 50–60%

(See [07-staff-agents.md](07-staff-agents.md) for the full 18-person roster and roles.)

## Power wall & merchandising

- Set Monday morning of Diwali week, **unchanged through Saturday**
- One Mahabachat banner; ethnic mannequins at entry; racks behind carry mixed (not exclusively festive) SKUs
- Kurtis by size on one rack, sarees by price band on another, dupattas on a third — **no outfit bundling**
- No styling combinations shown
- Kids festive gets a small fixture, not at zone entry

## Cross-merchandising (mostly absent)

- Accessories grouped into one zone (destination), not co-located with apparel
- Kurti / leggings / dupatta in three different zones
- Footwear on the opposite side of the store from apparel
- → Outfit-building shopper traverses three+ zones, attach rate stays low

## Replenishment

- 10am opening top-up, 4pm afternoon top-up. **Nothing else.**
- L/XL in women's ethnic stock out first at peak and stay gone until next scheduled
- Staff only check stockroom when a customer specifically asks

## Promotions

- "Diwali Dhamaka Flat 30% off + B2G1 on ethnic wear" — one campaign for everyone
- B2G1 promo islands stock excess inventory from earlier in the season, not curated impulse
- Impulse fixtures near billing static all day

## Environment

- AC full power 10am–9pm, reduced 9pm–10pm (cost-saving — affects dwell late evening)
- Lighting consistent, no warming/dimming
- Music same playlist all day, no festive audio merchandising

## Manager behavior

- 10am: opens store, confirms positions
- 11am–1pm: ad-hoc issues
- 1pm–3pm: monitors lunch rotation
- 3pm–5pm: walks floor, eyeballs queues
- 5pm–9pm: stationed near billing, opens counters on visual cue
- 9pm–10pm: closing, cash reconciliation
- **No data inputs.** Pure intuition.

## How this translates into sim config

This file describes intent. The actual machine-readable baseline lives in `sim/policies/baseline.json` (TBD). That file is the input to the engine — everything here should map cleanly into config keys.
