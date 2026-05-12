# V-Mart Diwali Saturday — Whitepaper

**For:** V-Mart Unlimited leadership
**Subject:** Peak-day revenue recovery via operational policy changes
**Date:** May 2026
**Length:** 4 pages

---

## Executive summary

We modeled one V-Mart Unlimited Tier-1 store on a Diwali Saturday and used the model to search for the highest-revenue operating policy. The winning policy lifts revenue **₹5.61 lakh → ₹7.62 lakh per peak day (+35.87%)** on the same 1,000 shoppers, while raising conversion from **75% to 84%** and cutting billing abandonments from **88 down to 2**.

The lift comes from five operational changes — zero capex, zero hiring, every change reversible. Across V-Mart's 89 Unlimited stores × 4 festive weekends per year, the annualised opportunity is **₹7.16 Cr / year** in recovered peak-festival revenue. V-Mart's broader footprint is 554 stores including V-Mart and Unlimited; this estimate applies only to the 89-store Unlimited estate.

---

## The five recommended moves

Each move is wired into the recommended policy and contributes to the +35.87% lift. Listed in priority order — biggest revenue impact first.

### 1. Open billing counters by the clock, not by the queue

> Open counter 2 at **15:00**, counter 3 at **16:00**, counter 4 at **17:30** — staffed ahead of time. No more "manager opens a counter when the queue is 15 deep."

Single biggest lever. Baseline policy waits for a 15-person queue to form before opening counter 2 — by which time shoppers have already crossed their abandonment threshold. Proactive opening keeps peak wait at ~23 min vs baseline's ~45 min, and **collapses billing abandonments from 88 to 2**.

**Cost**: zero — staff already on payroll. **What it requires**: a 3-line ops playbook update. **Risk**: low.

### 2. Co-locate outfit bundles, including footwear

> Install fixtures in Women's Ethnic stocking kurti + matching leggings + matching dupatta together. Move the jutti / mojari rack from FA over to the saree rack — directly adjacent.

Adds ~₹160 to every saree-buyer's ticket via a passive visual mechanism — no staff intervention. The brief notes "a shopper who buys a saree must cross the store to find matching juttis" — fixing fixture placement is a one-time floor-set change.

**Cost**: one weekend of fixture rearrangement. **What it requires**: visual-merchandising sign-off. **Risk**: low.

### 3. Station T01 at the women's trial bank with a 4-item cap

> The trial-room attendant role exists on the roster but drifts as floor relief in baseline. Pin them at the women's bank. Hand each shopper a numbered tag; cubicles accept four items max. Enforce.

Speeds cubicle turnover ~25%, directly attacks trial-room queue waits. The 4-item rule is already in the SOP — just not enforced.

**Cost**: zero. **What it requires**: a line in the trial-room attendant's job card. **Risk**: very low.

### 4. De-cluster lunch + dinner breaks; reallocate two staff at evening peak

> Lunch breaks stagger across 12:30–15:00 with no more than 2 floor staff off at any moment (vs baseline's peak of 5). Dinner the same across 18:30–21:00. F09 reallocates from Infants to Women's Ethnic at 17:00, F01 from Power Wall to Women's Ethnic at 17:30.

Same headcount, smarter distribution. Women's Ethnic — the highest-traffic zone — gets adequate help during evening peak instead of losing half its staff to dinner.

**Cost**: zero. **What it requires**: rewriting the lunch rota. **Risk**: low.

### 5. Refresh power wall and curate impulse fixture during the day

> Refresh the power wall every 4 hours (10:00, 14:00, 18:00) with festive-hero SKUs. Replace random clearance on the impulse fixture near billing with curated high-margin festive jewellery (earring sets, bangles, kundan necklaces) — refreshed twice.

Targets impulse-prone shopper segments at the right moment (entry intent boost via power wall, billing-queue impulse via fixture). Festive jewellery has 58–64% margin — among the highest in the store.

**Cost**: visual-merchandising labour. **What it requires**: a 4-hour cadence on the floor-supervisor checklist. **Risk**: low.

---

## Negative findings worth flagging

- **Don't bolt "active staff upsell" on top of an already-full lever stack.** Tested; ties with the winner. No marginal contribution because baskets saturate first. Train staff for it if you're skipping the cross-merch work — otherwise it's redundant.
- **Don't make the billing schedule less aggressive than 15:00 / 16:00 / 17:30.** The C4 opening at 17:30 specifically is the difference between "fewer abandons" and "almost no abandons."
- **Don't physically move zone positions.** Cross-zone fixtures (move 2) deliver the same effect at a fraction of the cost.

---

## Validation methodology in one paragraph

1,000 individually-modeled shoppers — ten Bangalore-specific persona archetypes (mission moms, family weekenders, working women, young women, premium-occasion buyers, quick-trip men, office gifters, young moms, visiting relatives, browsers) — walk through a digital twin of the store for the full 12-hour Diwali Saturday. Each agent has intent, queue tolerance, basket targets, and price elasticity calibrated to festive shopper behaviour. We tested 34 candidate policies across 3 independent shopper cohorts (102 deterministic simulation runs), holding the RNG seed constant so that baseline vs optimized is a clean A/B — only the operating policy differs. Every claimed lift is traced through a causal chain (policy → environment change → agent reaction → revenue), with explicit guard-rails against tuning outcomes directly. **The methodology document accompanying this whitepaper has the full technical detail.**

---

## The pilot

**Four weeks · one V-Mart store of your choice · three festive weekends.**

We calibrate the digital twin against your store's POS data from previous festive weekends, run the optimization loop, and hand back A/B-ready interventions with predicted lift and confidence intervals.

**Your commit**: floor-set + ops-playbook changes on one Saturday per weekend during the pilot. ~6 hours of visual-merchandising labour. Standard A/B reporting from POS.

**Our commit**: we predict the lift before the Saturday; we hand back the variance analysis after. We do not bill if the measured lift falls short of the predicted range.

---

## Network-scale impact

| Metric | Per peak day, per store | Annualised (89 Unlimited stores × 4 weekends) |
|--------|--------------------------|--------------------------------------|
| Revenue lift | + ₹2.01 L | **+ ₹7.16 Cr / year** |
| Memos issued | + 98 | + 35k / year |
| Billing abandonments avoided | 86 | + 31k / year |
| Conversion lift | + 9.3 percentage points | — |
| Incremental capex | **₹0** | **₹0** |

Five operational moves. Zero capex. Every move reversible — a store manager can revert to baseline mid-day if anything goes wrong.

---

## Charts (one page)

![Policy ranking — all 34 sweep candidates](../train/plots/policy_ranking.png)

![Before & after — baseline vs winner across 8 KPIs](../train/plots/kpi_comparison.png)

---

*The full technical methodology — model, agents, lever wiring, sweep design, calibration history, guard-rails, and complete appendix — is available as the companion methodology document.*

---
*V-Mart Unlimited Diwali Saturday Diagnostic · v3.2 · confidential*
