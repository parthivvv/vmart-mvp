# Shopper agents

Five intent profiles, weighted to match Diwali Saturday traffic. Each agent has a state machine that runs from `arrive` → `browse` → `trial` → `bill` → `exit`, with abandonment edges at each step driven by queue waits, stockouts, and environment.

## The five profiles

| Profile | Weight | Group | Zones touched | Basket | Trial use | Queue tolerance | Notes |
|---------|--------|-------|---------------|--------|-----------|-----------------|-------|
| Mission-driven mom | 30% | 2–4 (1–2 kids) | W-ethnic + Kids primary | 4–7 items, BOGO-driven | Medium (2–4 items) | 10m → reduce, 20m → abandon | Won't return after a bad experience |
| Browse-and-buy young woman | 20% | 1–2 | W-ethnic + W-western | 2–4 items | Heavy (dwell 35–50m) | 15m → reduce | "Zudio-poacher" — power wall freshness matters |
| Family weekend shopper | 25% | 4–6 multigen | 5–7 zones | 6–10 items, ₹3k–7k | Mixed | 25m tolerant | AC-sensitive; group leader controls exit |
| Quick-trip men's wear | 10% | 1 | M-casual or M-formal/ethnic | 1–2 items | Minimal | 8m → abandon | Often dropped off; impatient |
| Browser, no intent | 15% | 1–2 | 1–2 zones | usually 0 | None | n/a | 3–5% opportunistic convert under Mahabachat |

## Agent state

```
agent {
  id
  arrival_slot           # 0..23 (30-min slots over 12h)
  profile                # one of the five
  group_size
  current_zone           # nullable; null = at entry or exited
  dwell_remaining        # minutes left in current activity
  basket                 # [{sku_id, qty, price_paid}, ...]
  basket_value
  trial_demand           # bool — items pending try-on
  queue_wait_accumulated # minutes spent waiting (any queue)
  satisfaction           # 0..100, affects abandonment + return prob
  exited                 # bool, with reason: purchased | abandoned | walked_out
}
```

## Decision logic per step

At each tick the agent is in one of these phases. Transitions are probabilistic, profile-conditioned, and influenced by environment.

```
ARRIVE
  → pick first zone based on profile (power wall fires here)
  → if power wall is "fresh + festive matched", boost intent

BROWSE (in zone)
  → dwell some minutes based on profile
  → look at fixtures; if size-curve broken, satisfaction drops
  → if floor-staff present + capable, basket builds faster
  → may pick up cross-merch items if adjacent (lever 5)
  → exit zone → next zone (profile-conditioned) OR move to trial OR move to bill

TRIAL (if trial_demand)
  → join trial room queue
  → wait → trial → keep/drop items
  → if wait > tolerance: basket reduction or full abandonment
  → 50–60% baseline trial→purchase conversion

BILL
  → join billing queue
  → wait → checkout
  → impulse fixtures near billing can add 0–2 items
  → if wait > tolerance: basket reduction; if extreme, full abandonment

EXIT
  → log outcome
```

## What the policy levers actually change for the agent

- **Lever 1 (billing schedule)** → shorter queue → higher tolerance margin → less abandonment, less basket reduction.
- **Lever 2 (floor staff)** → more staff in the right zone → faster basket build, lower stockout-driven walkout (proactive replenish).
- **Lever 3 (trial allocation)** → less trial wait → less basket abandonment, more trial→purchase conversion.
- **Lever 4 (power wall / impulse SKUs)** → boost arrival-intent multiplier; impulse adds 0–2 items at billing.
- **Lever 5 (cross-merch + replenish)** → adjacent SKUs increase attach rate (dupatta + saree); mid-peak replenish prevents L/XL stockout abandonment.

## Randomness + reproducibility

Every random draw uses a seeded RNG. The same seed produces the same arrival sequence, same group compositions, same browse paths — so baseline vs optimized differ **only** because of policy, not luck. This is critical for the demo.

## Open questions

- Do we model group decision-making (one group = one agent with multiplier?) or each member as a separate agent? Leaning toward one-group-one-agent for v1 with `group_size` modifying basket and dwell.
- How exactly does satisfaction feed back into the day? For v1, probably just affects abandonment thresholds, not anything cross-day.
