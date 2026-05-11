# Context — the world we're simulating

Distilled from `vmart - research.pdf`. Read this first.

## The pitch in one paragraph

V-Mart wants to know how much revenue it's leaving on the table on a peak-volume day (Diwali Saturday) at a typical Tier-1 Bangalore store. We're building an agent-based simulator: spin up ~6,500–8,000 shopper agents across a 12-hour day, run them through a baseline store with realistic policies, then re-run with our optimized policies on the same arrival sequence. The delta is the lift we can credibly attribute to the changes, not to luck.

For the MVP we'll run ~1,000 agents (smaller cohort, same physics) to keep it fast and visual.

## The store

- Tier-1 V-Mart Unlimited, Bangalore, single floor, fashion only
- Diwali Saturday, 10am–10pm (12 hours)
- Kannada-speaking staff, mixed migrant + local population
- 9 floor zones (Power wall, Women's ethnic, Women's western, Women's footwear/acc, Men's casual, Men's formal/ethnic, Men's footwear/acc, Kids, Infants)
- 6 billing counters (single straight queue feeds all 6)
- 10 trial rooms (7 women's, 3 men's, 0 kids)
- ~100 SKUs spanning ₹249–₹4,999, weighted toward women's ethnic + kids

## What's broken in the baseline (the source of upside)

1. **Staff are frozen at shift start.** Infants staff sits idle while women's ethnic drowns.
2. **Lunch + dinner breaks cluster on peaks.** 5 staff off the floor 1–3pm, 4 off 7–8:30pm.
3. **Billing counters open reactively.** Manager opens a 3rd counter only when the queue is already 15–20 deep — damage already done.
4. **Trial room is unmanaged.** No queue, no item limit, women's bank congests.
5. **Power wall is set Monday and never moves.** No adjustment for sell-through or daypart.
6. **No cross-merchandising.** Kurti, leggings, dupatta in three different zones. Footwear on the opposite side of the store from apparel.
7. **Replenishment is twice a day.** L/XL in women's ethnic stocks out at peak and stays out.
8. **One promo for everyone.** No segmentation between mission-mom, browse-young-woman, family group, quick-trip-male.

## The five levers we can pull

1. Billing counter schedule (per 30-min slot)
2. Floor-staff zone allocation (per 30-min slot)
3. Trial-room allocation + queue management (per 30-min slot)
4. Power wall / promo island / impulse fixture SKU set (per 4-hour block)
5. Cross-merch adjacencies + replenishment cadence (once per day, per fixture)

## What "good" looks like for the demo

A side-by-side: baseline policy run → revenue, conversion, queue waits, abandonment. Optimized policy run on the *same arrival seed* → higher revenue, lower waits, less abandonment. The lift has to come from agents making different decisions because the environment changed, not from us tweaking conversion rates directly.

## Expected baseline numbers (from the brief, useful as a sanity check)

- Total revenue: ₹20–26 lakh
- Memos generated: 2,400–3,200
- Conversion: 36–42%
- Average ticket: ₹750–900
- Peak billing wait (6–9pm): 18–28 min
- Peak trial wait: 12–18 min
- Basket abandonment at peak: 8–14% of trial exits
- Walk-out without engagement: 12–20%

If our baseline sim doesn't land in roughly these bands, the model is wrong, not the policy.
