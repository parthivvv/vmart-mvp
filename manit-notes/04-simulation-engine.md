# Simulation engine

How a single day runs end-to-end. Discrete-time, slotted, deterministic given a seed.

## Time model

- **Slot = 30 minutes.** 10am–10pm = 24 slots per day.
- Within a slot we still need sub-resolution for queues (a 20-min wait inside one slot matters). Two options:
  1. **Slot-aggregate**: model wait time as a derived stat from queue depth + service rate per slot. Faster, less granular.
  2. **Event-driven inside slot**: a min-heap of (timestamp, agent, event) events resolved in order. Slower, more realistic.

  Leaning toward (1) for v1 — simpler to debug and we don't need second-level fidelity for a demo. Note: revisit if queue behavior feels wrong.

## Tick loop (pseudocode)

```
for slot in 0..23:
    # 1. Apply policy for this slot
    policy.apply(state, slot)
        # billing counters open/close
        # floor staff reassigned (no-op for baseline)
        # trial allocation adjusted (no-op for baseline)
        # power wall refreshed (per 4-hour block only)

    # 2. Generate arrivals
    new_agents = arrivals.sample(slot, seed)
    state.lobby.extend(new_agents)

    # 3. Advance every agent one tick
    for agent in state.active_agents():
        agent.step(state, policy)

    # 4. Resolve queues (trial rooms + billing)
    state.trial_rooms.resolve(slot_duration=30)
    state.billing.resolve(slot_duration=30)

    # 5. Apply replenishment if scheduled
    state.fixtures.replenish_if_due(slot)

    # 6. Snapshot metrics
    metrics.record(slot, state)
```

## State container

```
sim_state {
  clock_slot               # 0..23
  agents_active            # list of in-store agents
  agents_exited            # list with outcomes
  zones                    # 9 zones, each with: staff_count, shopper_count, fixtures
  fixtures                 # per zone: SKU → stock level + size-curve
  trial_rooms              # women's/men's banks: cubicles + queue
  billing                  # 6 counters: open/closed + queue + service rate
  stockroom                # SKU → backstock
  rng                      # seeded
}
```

## Arrival curve

Dual-peak Diwali Saturday:
- 10–11am: ramp up
- **11am–1pm: morning bump** (Diwali gifting, kidswear families)
- 2–4pm: lunch dip
- **5pm–9pm: dominant evening peak** (apparel + occasion wear)
- 9pm–10pm: tail-off

For 1,000 agents over 24 slots, the curve gives ~slot-level arrival counts. Persist this as a fixed distribution in `data/arrivals.json` so both baseline and optimized runs draw from the same curve with the same seed → identical agent sequence.

## Reproducibility contract

- Same `seed` + same arrival curve → same agent IDs, profiles, group sizes, arrival times across runs.
- Policies only change how the **environment** responds to agents. Agent draws (arrivals, group composition, profile assignment, initial intent strength) are seed-fixed.
- This makes baseline-vs-optimized a true A/B, not a noisy comparison.

## Output schema (run JSON)

Per slot:
```
{
  slot: 0..23,
  hh_mm: "10:00",
  arrivals: int,
  in_store: int,
  by_zone: { zone_id → { shoppers, staff } },
  trial_room: { women_queue, men_queue, avg_wait_min },
  billing: { counters_open, queue_depth, avg_wait_min, memos_this_slot },
  revenue_this_slot: number,
  abandonments_this_slot: int,
  walkouts_this_slot: int
}
```

Plus aggregate:
```
{
  policy_name: "baseline" | "optimized_v1",
  seed: int,
  total_revenue,
  total_memos,
  conversion,
  avg_ticket,
  peak_billing_wait_min,
  peak_trial_wait_min,
  basket_abandonment_pct,
  walkout_pct
}
```

This is what the UI reads to replay the day.

## Language choice

Not decided yet — see [06-open-questions.md](06-open-questions.md). Python is fastest to prototype the model in; JS keeps it browser-side with Parthiv's UI; either way the output JSON contract above is the same.
