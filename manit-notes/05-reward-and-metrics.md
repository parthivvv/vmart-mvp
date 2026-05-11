# Reward function & metrics

What we maximize, what we report, what would constitute "cheating."

## Primary objective

**Total revenue across the simulated day.** Sum of (price_paid × qty) over every line item in every memo that actually completes checkout. Abandoned baskets do not count.

```
R_total = Σ memos { Σ items (price_paid × qty) }
```

## Supporting metrics (must move in the right direction, not hacked)

| Metric | Direction | Why it matters |
|--------|-----------|----------------|
| Memos generated | ↑ | Throughput proxy; more shoppers converting |
| Conversion (memos / footfall) | ↑ | The core funnel metric |
| Average ticket | →/↑ | Larger baskets = better merchandising |
| Peak billing wait | ↓ | Causal lever for abandonment |
| Peak trial wait | ↓ | Causal lever for trial→bill drop-off |
| Basket abandonment % | ↓ | Direct revenue leak |
| Walk-out % (under 5 min) | ↓ | First-impression failure |
| Attach rate (cross-merch items per memo) | ↑ | Validates lever 5 |

If revenue rises **and** wait times drop **and** abandonment drops, the story is honest. If revenue rises only because abandonment went up (we kept the wrong people from checking out — implausible but watch for it), the story breaks.

## What would be cheating (don't do)

- Tuning a coefficient in the agent's purchase probability between baseline and optimized runs.
- Changing the arrival curve, group sizes, or profile mix between runs.
- Boosting "intent strength" globally instead of having power wall freshness do it.
- Lowering trial-time mean by fiat instead of via fewer items per cubicle (a real consequence of lever 3 enforcement).

The rule: **policy changes the environment, environment changes agent decisions, agent decisions change revenue.** No direct edits to agent parameters between runs.

## Reward function — exact form for v1

```
R = R_total
```

That's it. Don't multi-objective this for the MVP. We optimize revenue; everything else is a diagnostic to show the story is credible.

(Later: could add a queue-fairness penalty, or weight margin instead of revenue since margin varies wildly across SKUs — kurta vs jewellery. But not v1.)

## Margin-aware version (for later, not v1)

The SKU sheet has per-SKU margin %. If we want to optimize **gross margin** rather than revenue:

```
R_margin = Σ memos { Σ items (price_paid × qty × margin_pct) }
```

Worth noting because women's jewellery is 58–64% margin and the merchandising lever could push toward those SKUs deliberately. Save as a stretch.

## What we log per memo

```
{
  memo_id,
  slot,
  agent_id,
  agent_profile,
  items: [{sku_id, qty, mrp, price_paid, margin_pct}, ...],
  basket_value,
  billing_wait_min,
  trial_wait_min,
  cross_merch_flag       # did they buy adjacent-zone SKU?
}
```

This rolls up into the aggregates above and gives us drill-down for the demo narrative ("look — under optimized, dupatta attach to saree is 38% vs 11% baseline").
