/**
 * Generates a v2 grid of policy candidates across 5 levers.
 *
 * v2 expands from the v1 sweep (which only varied L1/L2/L3) to include
 * the newly-wired L4 (merchandising — power wall + impulse fixture) and
 * L5 (cross-merch + bundle fixtures).
 *
 * Dimensions:
 *   L1 (billing): 5 levels  — reactive | sched_18_19 | sched_17_18 | sched_16_17 | sched_15_16
 *   L2 (staffing): 4 levels — clustered_no_re | staggered_no_re | staggered_1_re | staggered_2_re
 *   L3 (trial):   2 levels  — no_attendant | attendant_cap
 *   L4 (merch):   4 levels  — none | powerwall | impulse | both
 *   L5 (cross):   3 levels  — none | bundles | bundles_footwear
 *
 * Full grid is 5×4×2×4×3 = 480. We pick ~30 meaningful combinations across
 * (a) pure baseline, (b) single-lever isolations, (c) pairs, (d) full stacks.
 *
 * Writes each candidate to train/candidates/NN_<name>.json.
 *
 * All candidates are guard-rail clean by construction — every knob is in the
 * lever_N_* blocks, no agent-state overrides.
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, 'candidates');
// Clean old candidates so the dir reflects this run
if (fs.existsSync(OUT_DIR)) {
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f.endsWith('.json')) fs.unlinkSync(path.join(OUT_DIR, f));
  }
} else {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// ── Lever option pools ─────────────────────────────────────────────────────
const L1 = {
  reactive: {
    model: 'reactive',
    always_open: [1],
    always_closed: [4, 5, 6],
    reactive_rules: [
      { counter: 2, trigger_queue_min: 15, staffing_delay_min_range: [5, 10] },
      { counter: 3, trigger_queue_min: 20, staffing_delay_min_range: [5, 10] },
    ],
  },
  sched_18_19: {
    model: 'scheduled', always_open: [1], always_closed: [4, 5, 6],
    reactive_rules: [
      { counter: 2, trigger_queue_min: 10, staffing_delay_min_range: [2, 4] },
      { counter: 3, trigger_queue_min: 15, staffing_delay_min_range: [2, 4] },
    ],
    schedule: { '18:00': [2], '19:00': [3] },
  },
  sched_17_18: {
    model: 'scheduled', always_open: [1], always_closed: [4, 5, 6],
    reactive_rules: [
      { counter: 2, trigger_queue_min: 8, staffing_delay_min_range: [1, 3] },
      { counter: 3, trigger_queue_min: 12, staffing_delay_min_range: [1, 3] },
    ],
    schedule: { '17:00': [2], '18:00': [3] },
  },
  sched_16_17: {
    model: 'scheduled', always_open: [1], always_closed: [4, 5, 6],
    reactive_rules: [
      { counter: 2, trigger_queue_min: 6, staffing_delay_min_range: [1, 2] },
      { counter: 3, trigger_queue_min: 10, staffing_delay_min_range: [1, 2] },
    ],
    schedule: { '16:00': [2], '17:00': [3] },
  },
  sched_15_16: {
    model: 'scheduled', always_open: [1], always_closed: [4, 5, 6],
    reactive_rules: [
      { counter: 2, trigger_queue_min: 5, staffing_delay_min_range: [1, 2] },
      { counter: 3, trigger_queue_min: 8, staffing_delay_min_range: [1, 2] },
      { counter: 4, trigger_queue_min: 15, staffing_delay_min_range: [2, 4] },
    ],
    schedule: { '15:00': [2], '16:00': [3], '17:30': [4] },
  },
};

const L2 = {
  clustered_no_re: { model: 'fixed_all_day', break_pattern: 'clustered', mid_shift_reallocation: false },
  staggered_no_re: { model: 'fixed_all_day', break_pattern: 'staggered', break_concurrency_max: 2, mid_shift_reallocation: false },
  staggered_1_re: {
    model: 'fixed_with_one_reallocation',
    break_pattern: 'staggered', break_concurrency_max: 2, mid_shift_reallocation: true,
    reallocations: [
      { at: '17:00', staff_id: 'F09', from_zone: 'infants', to_zone: 'womens_ethnic' },
    ],
  },
  staggered_2_re: {
    model: 'fixed_with_two_reallocations',
    break_pattern: 'staggered', break_concurrency_max: 2, mid_shift_reallocation: true,
    reallocations: [
      { at: '17:00', staff_id: 'F09', from_zone: 'infants', to_zone: 'womens_ethnic' },
      { at: '17:30', staff_id: 'F01', from_zone: 'power_wall', to_zone: 'womens_ethnic' },
    ],
  },
  // ── v3: staff_active_upsell variants ──────────────────────────────────
  // When upsell is on, skilled staff (impulse_upsell or *_expert) at full
  // attention bump the basket-add probability from 22% to 45% AND attempt
  // a cross-merch partner attach during the help interaction.
  staggered_2_re_upsell: {
    model: 'fixed_with_two_reallocations',
    break_pattern: 'staggered', break_concurrency_max: 2, mid_shift_reallocation: true,
    staff_active_upsell: true,
    reallocations: [
      { at: '17:00', staff_id: 'F09', from_zone: 'infants', to_zone: 'womens_ethnic' },
      { at: '17:30', staff_id: 'F01', from_zone: 'power_wall', to_zone: 'womens_ethnic' },
    ],
  },
  clustered_upsell_only: {
    model: 'fixed_all_day', break_pattern: 'clustered', mid_shift_reallocation: false,
    staff_active_upsell: true,
  },
};

const L3 = {
  no_attendant: { cubicle_split: { womens_bank: 7, mens_bank: 3, kids_bank: 0 }, attendant_present: false, item_cap_enforced: false },
  attendant_cap: { cubicle_split: { womens_bank: 7, mens_bank: 3, kids_bank: 0 }, attendant_present: true, item_cap_enforced: true, item_cap_count: 4 },
};

const L4 = {
  none: {
    power_wall: { refresh_cadence: 'weekly_monday_only', intra_day_refresh: false },
    impulse_fixture: { refresh_during_day: false },
  },
  powerwall: {
    power_wall: { refresh_cadence: 'per_block_4h', intra_day_refresh: true, festive_concentration_pct: 80 },
    impulse_fixture: { refresh_during_day: false },
  },
  impulse: {
    power_wall: { refresh_cadence: 'weekly_monday_only', intra_day_refresh: false },
    impulse_fixture: { refresh_during_day: true, curation: 'festive_jewellery' },
  },
  both: {
    power_wall: { refresh_cadence: 'per_block_4h', intra_day_refresh: true, festive_concentration_pct: 80 },
    impulse_fixture: { refresh_during_day: true, curation: 'festive_jewellery' },
  },
};

const L5 = {
  none: {
    outfit_bundle_fixtures: false,
    footwear_apparel_co_location: false,
    replenishment_schedule: ['10:00', '16:00'],
    mid_peak_replenishment: false,
  },
  bundles: {
    outfit_bundle_fixtures: true,
    footwear_apparel_co_location: false,
    replenishment_schedule: ['10:00', '13:00', '16:00', '18:30'],
    mid_peak_replenishment: true,
  },
  bundles_footwear: {
    outfit_bundle_fixtures: true,
    footwear_apparel_co_location: true,
    replenishment_schedule: ['10:00', '13:00', '16:00', '18:30'],
    mid_peak_replenishment: true,
  },
};

// ── 30 carefully-chosen combinations ──────────────────────────────────────
const COMBOS = [
  // — Pure baseline (control)
  { name: 'pure_baseline',          l1: 'reactive',     l2: 'clustered_no_re', l3: 'no_attendant',  l4: 'none',      l5: 'none' },

  // — Single-lever L1 variants (5)
  { name: 'L1_defensive',           l1: 'sched_18_19',  l2: 'clustered_no_re', l3: 'no_attendant',  l4: 'none',      l5: 'none' },
  { name: 'L1_moderate',            l1: 'sched_17_18',  l2: 'clustered_no_re', l3: 'no_attendant',  l4: 'none',      l5: 'none' },
  { name: 'L1_aggressive',          l1: 'sched_16_17',  l2: 'clustered_no_re', l3: 'no_attendant',  l4: 'none',      l5: 'none' },
  { name: 'L1_max',                 l1: 'sched_15_16',  l2: 'clustered_no_re', l3: 'no_attendant',  l4: 'none',      l5: 'none' },

  // — Single-lever L2 (3)
  { name: 'L2_stagger_only',        l1: 'reactive',     l2: 'staggered_no_re', l3: 'no_attendant',  l4: 'none',      l5: 'none' },
  { name: 'L2_realloc_1',           l1: 'reactive',     l2: 'staggered_1_re',  l3: 'no_attendant',  l4: 'none',      l5: 'none' },
  { name: 'L2_realloc_2',           l1: 'reactive',     l2: 'staggered_2_re',  l3: 'no_attendant',  l4: 'none',      l5: 'none' },

  // — Single-lever L3 (1)
  { name: 'L3_attendant_cap',       l1: 'reactive',     l2: 'clustered_no_re', l3: 'attendant_cap', l4: 'none',      l5: 'none' },

  // — Single-lever L4 (3)
  { name: 'L4_powerwall_only',      l1: 'reactive',     l2: 'clustered_no_re', l3: 'no_attendant',  l4: 'powerwall', l5: 'none' },
  { name: 'L4_impulse_only',        l1: 'reactive',     l2: 'clustered_no_re', l3: 'no_attendant',  l4: 'impulse',   l5: 'none' },
  { name: 'L4_both',                l1: 'reactive',     l2: 'clustered_no_re', l3: 'no_attendant',  l4: 'both',      l5: 'none' },

  // — Single-lever L5 (2)
  { name: 'L5_bundles_only',        l1: 'reactive',     l2: 'clustered_no_re', l3: 'no_attendant',  l4: 'none',      l5: 'bundles' },
  { name: 'L5_bundles_footwear',    l1: 'reactive',     l2: 'clustered_no_re', l3: 'no_attendant',  l4: 'none',      l5: 'bundles_footwear' },

  // — Pairs (no L1 changes; pure operational vs pure merchandising)
  { name: 'pair_L4_L5',             l1: 'reactive',     l2: 'clustered_no_re', l3: 'no_attendant',  l4: 'both',      l5: 'bundles_footwear' },
  { name: 'pair_L2_L3',             l1: 'reactive',     l2: 'staggered_2_re',  l3: 'attendant_cap', l4: 'none',      l5: 'none' },

  // — L1_max + each other lever
  { name: 'L1max_plus_L2',          l1: 'sched_15_16',  l2: 'staggered_2_re',  l3: 'no_attendant',  l4: 'none',      l5: 'none' },
  { name: 'L1max_plus_L3',          l1: 'sched_15_16',  l2: 'clustered_no_re', l3: 'attendant_cap', l4: 'none',      l5: 'none' },
  { name: 'L1max_plus_L4',          l1: 'sched_15_16',  l2: 'clustered_no_re', l3: 'no_attendant',  l4: 'both',      l5: 'none' },
  { name: 'L1max_plus_L5',          l1: 'sched_15_16',  l2: 'clustered_no_re', l3: 'no_attendant',  l4: 'none',      l5: 'bundles_footwear' },

  // — Combined v1-style (L1+L2+L3 only, no L4/L5)
  { name: 'combo_v1_replica',       l1: 'sched_17_18',  l2: 'staggered_1_re',  l3: 'attendant_cap', l4: 'none',      l5: 'none' },
  { name: 'combo_op_only',          l1: 'sched_15_16',  l2: 'staggered_2_re',  l3: 'attendant_cap', l4: 'none',      l5: 'none' },

  // — Combined with merchandising
  { name: 'combo_op_plus_merch',    l1: 'sched_15_16',  l2: 'staggered_2_re',  l3: 'attendant_cap', l4: 'both',      l5: 'bundles' },
  { name: 'combo_op_plus_full',     l1: 'sched_15_16',  l2: 'staggered_2_re',  l3: 'attendant_cap', l4: 'both',      l5: 'bundles_footwear' },
  { name: 'combo_moderate_full',    l1: 'sched_17_18',  l2: 'staggered_1_re',  l3: 'attendant_cap', l4: 'both',      l5: 'bundles_footwear' },
  { name: 'combo_defensive_full',   l1: 'sched_18_19',  l2: 'staggered_no_re', l3: 'attendant_cap', l4: 'both',      l5: 'bundles_footwear' },

  // — Merchandising-heavy with moderate ops
  { name: 'combo_merch_heavy_modL1',l1: 'sched_17_18',  l2: 'clustered_no_re', l3: 'no_attendant',  l4: 'both',      l5: 'bundles_footwear' },
  { name: 'combo_merch_heavy_aggrL1',l1:'sched_16_17',  l2: 'clustered_no_re', l3: 'no_attendant',  l4: 'both',      l5: 'bundles_footwear' },

  // — Kitchen sink (max everything)
  { name: 'kitchen_sink',           l1: 'sched_15_16',  l2: 'staggered_2_re',  l3: 'attendant_cap', l4: 'both',      l5: 'bundles_footwear' },

  // — Edge: no ops, full merch (does merchandising alone close the gap?)
  { name: 'merch_only_full',        l1: 'reactive',     l2: 'clustered_no_re', l3: 'no_attendant',  l4: 'both',      l5: 'bundles_footwear' },

  // — v3: staff upsell variants ──────────────────────────────────────────
  { name: 'L2_upsell_only',         l1: 'reactive',     l2: 'clustered_upsell_only',   l3: 'no_attendant',  l4: 'none', l5: 'none' },
  { name: 'L1max_plus_L2upsell',    l1: 'sched_15_16',  l2: 'staggered_2_re_upsell',   l3: 'no_attendant',  l4: 'none', l5: 'none' },
  { name: 'kitchen_sink_plus_upsell',l1:'sched_15_16',  l2: 'staggered_2_re_upsell',   l3: 'attendant_cap', l4: 'both', l5: 'bundles_footwear' },
  { name: 'upsell_plus_L5',         l1: 'reactive',     l2: 'clustered_upsell_only',   l3: 'no_attendant',  l4: 'none', l5: 'bundles_footwear' },
];

// ── Emit ──────────────────────────────────────────────────────────────────
COMBOS.forEach((combo, i) => {
  const num = String(i + 1).padStart(2, '0');
  const id = `P${num}_${combo.name}`;
  const policy = {
    id,
    name: `Sweep candidate: L1=${combo.l1} · L2=${combo.l2} · L3=${combo.l3} · L4=${combo.l4} · L5=${combo.l5}`,
    version: 'sweep_v2',
    levers_chosen: { L1: combo.l1, L2: combo.l2, L3: combo.l3, L4: combo.l4, L5: combo.l5 },
    compliance: { causal_chain_only: true, no_forbidden_keys: true },
    lever_1_billing: L1[combo.l1],
    lever_2_floor_staffing: L2[combo.l2],
    lever_3_trial_rooms: L3[combo.l3],
    lever_4_merchandising: L4[combo.l4],
    lever_5_cross_merch_and_replenishment: L5[combo.l5],
  };
  const out = path.join(OUT_DIR, `${num}_${combo.name}.json`);
  fs.writeFileSync(out, JSON.stringify(policy, null, 2));
  console.log(`  wrote ${id}`);
});

console.log(`\nemitted ${COMBOS.length} candidate policies in ${OUT_DIR}`);
