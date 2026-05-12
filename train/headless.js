/**
 * Headless V-Mart sim runner.
 *
 * Loads store/engine.js into a Node `vm` context with a deterministic
 * `Math.random()` (mulberry32, seeded). Ticks the full 12-hour sim day
 * to completion in ~10-50ms per run with no rendering.
 *
 * Same (policy, cohort, seed) triple → identical KPIs every time. That
 * makes baseline vs optimized A/B comparisons clean — within a cohort
 * the only thing varying is the policy.
 *
 * Usage:
 *   const { runSim } = require('./headless');
 *   const result = runSim(policyObj, 'train/cohorts/cohort_101.json', 42);
 *
 * CLI:
 *   node train/headless.js <policy.json> <cohort.json> [sim_seed]
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '..');

// ── Seeded RNG (mulberry32) ────────────────────────────────────────────────
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Copy all Math members (including non-enumerable methods like .imul, .floor)
// onto a plain object, then override `random` with our seeded fn. This becomes
// the vm context's Math global.
function makeSeededMath(seed) {
  const m = {};
  Object.defineProperties(m, Object.getOwnPropertyDescriptors(Math));
  m.random = mulberry32(seed);
  return m;
}

// ── Shared static data (load once) ─────────────────────────────────────────
function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const STATIC = {
  ZONES:    loadJson(path.join(REPO, 'data/zones.json')),
  SKUS:     loadJson(path.join(REPO, 'data/skus.json')),
  PROFILES: loadJson(path.join(REPO, 'data/profiles.json')),
  STAFF:    loadJson(path.join(REPO, 'data/staff.json')),
  POLICY_BASELINE: loadJson(path.join(REPO, 'data/policies/baseline.json')),
};

const ENGINE_SRC = fs.readFileSync(path.join(REPO, 'store/engine.js'), 'utf8');

// ── Single-run wrapper ─────────────────────────────────────────────────────
function runSim(policyObj, cohortPath, simSeed = 42) {
  const AGENTS = loadJson(cohortPath);

  const ctx = {
    Math: makeSeededMath(simSeed),
    console: { log: () => {}, warn: () => {}, error: () => {} },
    window: {
      AGENTS,
      ZONES:    STATIC.ZONES,
      SKUS:     STATIC.SKUS,
      PROFILES: STATIC.PROFILES,
      STAFF:    STATIC.STAFF,
      POLICY_BASELINE:     STATIC.POLICY_BASELINE,
      POLICY_OPTIMIZED_V1: policyObj,
    },
  };

  vm.createContext(ctx);
  vm.runInContext(ENGINE_SRC, ctx, { filename: 'store/engine.js' });

  const Sim = ctx.window.Sim;
  const sim = new Sim(policyObj);

  // Tick the full day. Each tick advances by `dtMin` sim-minutes.
  const dtMin = 2; // 2-minute ticks — fine enough resolution
  let safety = 0;
  while ((sim.simMin < sim.totalMin || sim.activeAgents.length > 0) && safety < 500) {
    sim.tick(dtMin);
    safety++;
  }

  const k = sim.kpis();
  const peakBillWait = sim.metrics.bill_waits.length
    ? Math.max(...sim.metrics.bill_waits) : 0;
  const peakTrialWait = sim.metrics.trial_waits.length
    ? Math.max(...sim.metrics.trial_waits) : 0;

  return {
    revenue: k.revenue,
    memos: k.memos,
    conversion: k.conversion,
    avg_ticket: k.avg_ticket,
    footfall: k.footfall,
    walkouts: k.walkouts,
    abandon_pct: k.abandon_pct,
    abandonments_trial: sim.metrics.abandonments_trial,
    abandonments_bill: sim.metrics.abandonments_bill,
    no_purchase_walkouts: sim.metrics.no_purchase_walkouts,
    peak_bill_wait: peakBillWait,
    peak_trial_wait: peakTrialWait,
    avg_bill_wait: k.bill_wait,
    avg_trial_wait: k.trial_wait,
  };
}

module.exports = { runSim };

// ── CLI mode ───────────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('usage: node headless.js <policy.json> <cohort.json> [sim_seed]');
    process.exit(2);
  }
  const policy = loadJson(args[0]);
  const cohortPath = path.resolve(args[1]);
  const seed = args[2] ? parseInt(args[2]) : 42;

  const t0 = Date.now();
  const result = runSim(policy, cohortPath, seed);
  const ms = Date.now() - t0;

  console.log(`policy=${policy.id} cohort=${path.basename(cohortPath)} seed=${seed} took=${ms}ms`);
  console.log(JSON.stringify(result, null, 2));
}
