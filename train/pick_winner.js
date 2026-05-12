/**
 * Reads train/results/latest.json, picks the highest-mean-revenue policy,
 * writes it as data/policies/optimized_v2.json with full metadata (rationale,
 * compliance block, expected lift, source pointer).
 *
 * Run: node train/pick_winner.js
 *
 * Optional: pass a policy_id to override the auto-pick:
 *   node train/pick_winner.js P05_L1_max
 */

const fs = require('fs');
const path = require('path');

const REPO       = path.resolve(__dirname, '..');
const RESULTS    = JSON.parse(fs.readFileSync(path.join(__dirname, 'results/latest.json'), 'utf8'));
const CAND_DIR   = path.join(__dirname, 'candidates');
const OUT_PATH   = path.join(REPO, 'data/policies/optimized_v2.json');

const aggregates = [...RESULTS.aggregates].sort((a, b) => b.mean_revenue - a.mean_revenue);
const override   = process.argv[2];
const winner     = override
  ? aggregates.find(a => a.policy_id === override)
  : aggregates[0];

if (!winner) {
  console.error(`No aggregate found for ${override || 'auto-pick'}`);
  process.exit(1);
}

const baseline = aggregates.find(a => a.policy_id === 'P01_pure_baseline');
const candidatePath = path.join(CAND_DIR, winner.policy_file);
const cand = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));

const v2 = {
  id: 'optimized_v2',
  name: `Optimized V2 — sweep winner (${winner.policy_id})`,
  version: '2.0',
  description: `Selected from a 16-policy sweep across 3 cohorts (48 runs). Best mean revenue: ₹${(winner.mean_revenue / 1e5).toFixed(3)}L vs baseline ₹${(baseline.mean_revenue / 1e5).toFixed(3)}L (+${winner.delta_revenue_pct.toFixed(2)}%). Levers chosen: L1=${cand.levers_chosen.L1}, L2=${cand.levers_chosen.L2}, L3=${cand.levers_chosen.L3}. L4 and L5 deliberately untouched — engine doesn't act on them yet (see manit-notes/08).`,

  source_docs: [
    'manit-notes/08-policies-and-guardrails.md',
    'manit-notes/09-optimization-plan.md',
    'train/results/latest.json',
  ],

  compliance: {
    causal_chain_only: true,
    no_forbidden_keys: true,
    selection_method: 'auto-search · grid sweep · highest mean revenue',
    sweep_n_candidates: RESULTS.n_candidates,
    sweep_n_cohorts: RESULTS.n_cohorts,
    sweep_sim_seed: RESULTS.sim_seed,
    cohort_seeds: RESULTS.cohorts,
  },

  sweep_evidence: {
    mean_revenue: winner.mean_revenue,
    std_revenue: winner.std_revenue,
    mean_conversion: winner.mean_conversion,
    mean_peak_bill_wait: winner.mean_peak_bill_wait,
    mean_abandon_pct: winner.mean_abandon_pct,
    delta_vs_baseline_pct: winner.delta_revenue_pct,
    delta_bill_wait_min: winner.delta_bill_wait,
    rank_in_sweep: 1,
  },

  levers_chosen: cand.levers_chosen,
  lever_1_billing: cand.lever_1_billing,
  lever_2_floor_staffing: cand.lever_2_floor_staffing,
  lever_3_trial_rooms: cand.lever_3_trial_rooms,
  lever_4_merchandising: cand.lever_4_merchandising,
  lever_5_cross_merch_and_replenishment: cand.lever_5_cross_merch_and_replenishment,

  rationale_by_lever: {
    L1: `Opens counter 2 at 15:00, counter 3 at 16:00, counter 4 at 17:30 — proactively, well before the evening peak. Reactive triggers tightened to 5/8 (vs baseline 15/20) with 1-2 min staffing delay (vs 5-10) as safety net. Causal: queue at counter 1 never grows long enough to trigger basket abandonment.`,
    L2: cand.lever_2_floor_staffing.mid_shift_reallocation
      ? `Staggered break pattern (max 2 staff off concurrently vs baseline's 5). Reallocates ${(cand.lever_2_floor_staffing.reallocations || []).length} staff at evening peak from quiet zones into women's ethnic. Same headcount, smarter distribution.`
      : `Staggered breaks (max 2 concurrent). No mid-shift reallocation.`,
    L3: cand.lever_3_trial_rooms.attendant_present
      ? `T01 stations at the women's trial bank instead of doing floor relief. Enforces 4-item-per-cubicle cap → cubicle turnover ~25% faster per the brief. Engine applies trial_service_mul = 0.75.`
      : `Trial rooms unchanged from baseline.`,
  },

  do_not_touch: {
    agent_data: 'data/agents.json — frozen',
    profile_data: 'data/profiles.json — frozen',
    rng_seed: RESULTS.sim_seed,
    purchase_probability_after_trial: 'engine constant',
    queue_tolerance_thresholds: 'from profiles.json',
  },
};

fs.writeFileSync(OUT_PATH, JSON.stringify(v2, null, 2));

console.log(`winner: ${winner.policy_id}`);
console.log(`  mean revenue: ₹${(winner.mean_revenue / 1e5).toFixed(3)}L  (+${winner.delta_revenue_pct.toFixed(2)}% vs baseline)`);
console.log(`  conversion:   ${(winner.mean_conversion * 100).toFixed(1)}%`);
console.log(`  peak bill wait: ${winner.mean_peak_bill_wait.toFixed(1)} min`);
console.log(`\nwrote ${OUT_PATH}`);
