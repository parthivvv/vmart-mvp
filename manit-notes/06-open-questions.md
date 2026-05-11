# Open questions

Decisions I want to settle before / during build. Some are mine; some need a sync with Parthiv.

## Need to sync with Parthiv

1. **Output JSON schema.** Draft is in [04-simulation-engine.md](04-simulation-engine.md). Does it cover everything the UI needs for replay? Need: zone-level shopper counts per slot (for hotspot heatmaps), queue depths, memo trickle for a live ticker.
2. **Zone IDs.** His 360 tour has hotspots — I need the canonical zone name/ID list he's using so my zones match. Should we have a `zones.json` he edits and I consume, or vice versa?
3. **Playback speed contract.** Does he want one frame per 30-min slot (24 frames), or interpolated to ~1-min granularity (720 frames)? Affects whether I need to dump finer-grained state.
4. **Static SKU catalog format.** I'll author `data/skus.json`. Does he need a parallel display-friendly version (with images, etc.) or does he reference mine?

## My own decisions (will settle as I build)

5. **Language: Python vs JS?**
   - Python: faster to model, easier numerics, requires UI to read JSON output.
   - JS / TS: runs in browser next to Parthiv's UI, no separate process, lower-friction demo.
   - **Leaning JS** for the demo since the UI is browser-side and the model isn't compute-heavy at 1k agents. Decide before writing engine code.
6. **Slot-aggregate vs event-driven queue resolution.** Going with slot-aggregate (see [04-simulation-engine.md](04-simulation-engine.md)) unless queue behavior looks wrong in the first run.
7. **Group as single agent vs N agents.** Going with one-group-one-agent + `group_size` modifier for v1.
8. **How to "cap" trial items per cubicle in lever 3.** Hard cap (refuse entry past 4 items) vs soft cap (longer dwell penalty). Hard cap is cleaner.
9. **Stockout behavior at fixture level.** When L/XL kurti runs out, does the agent (a) abandon basket entirely, (b) downgrade to M with reduced satisfaction, (c) switch to a different SKU in same zone? Each has different revenue implications.
10. **How does power wall "freshness" influence intent numerically?** Need to pick a multiplier (e.g., +20% intent-strength for "fresh festive match") and stay consistent across runs.

## Things I'm explicitly punting

- Multi-day return-customer modeling
- External signals (weather, competitor)
- Real-time intervention (manager opening counters on cue based on real-time data)
- Anything involving the optimizer choosing levers automatically (we hand-pick the optimized policy for v1; auto-search comes later)

## Sanity checks I'll run before showing baseline

- Does total revenue land in ₹20–26L band?
- Does conversion land 36–42%?
- Does peak billing wait land 18–28 min?
- Does walk-out % land 12–20%?

If any of these are >20% off, fix the model before touching policy.
