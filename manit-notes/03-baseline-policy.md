# Baseline policy

The exact "before" config the simulator runs first. This is what the Bangalore store manager actually does today. We have to be faithful to it — the lift only counts if the baseline is realistic.

## Staffing (fixed all day)

| Zone | Floor staff |
|------|-------------|
| Power wall & entry | 1 |
| Women's ethnic | 3 |
| Women's western | 2 |
| Women's footwear & accessories | 1 |
| Men's casual | 1 |
| Men's formal & ethnic | 1 |
| Men's footwear & accessories | 1 |
| Kids (boys + girls) | 2 |
| Infants | 1 |
| Floating | 1 |
| **Total** | **14 FTE** |

**Break clustering** (the constraint that creates the upside):
- Lunch breaks 1pm–3pm → 5 staff off at any moment in window
- Dinner breaks 7pm–8:30pm → 4 staff off (during apparel peak)
- **No mid-shift reallocation.** A staff member assigned to infants at 10am is still in infants at 8pm.

## Billing

- 6 counters total. Single straight queue feeds all.
- 10am–6pm: 2 counters staffed
- 6pm–10pm: 3 counters staffed
- 4th–6th counters opened only when manager visually judges queue too long (we'll model this as: trigger when queue ≥ 15, with a 5–10 min reaction delay before counter actually opens)
- ~2–3 min per memo on Diwali (larger BOGO baskets)
- No mobile POS, no queue-busters, no signage

## Trial rooms

- 7 women's, 3 men's, 0 kids — fixed all day
- One attendant manages the entire women's bank
- No item limit enforcement
- Cubicle turnover: 4–7 min normal, 8–12 min at peak
- Trial→purchase conversion baseline: 50–60%

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
