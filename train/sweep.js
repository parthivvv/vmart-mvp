/**
 * Policy sweep — runs every candidate in train/candidates/ across every
 * cohort in train/cohorts/, with a fixed simulation RNG seed so the only
 * thing varying within a cohort is the policy.
 *
 * Output: train/results/sweep_<timestamp>.json
 *
 * Result schema:
 *   {
 *     timestamp, sim_seed, n_runs, candidates: [...],
 *     runs: [{ policy, cohort, kpis }],
 *     aggregates: [{ policy, mean_revenue, std_revenue, ..., delta_vs_baseline }]
 *   }
 */

const fs = require('fs');
const path = require('path');
const { runSim } = require('./headless');

const CAND_DIR   = path.resolve(__dirname, 'candidates');
const COHORT_DIR = path.resolve(__dirname, 'cohorts');
const OUT_DIR    = path.resolve(__dirname, 'results');
const SIM_SEED   = 42;        // fixed across all runs — pure A/B inside a cohort

fs.mkdirSync(OUT_DIR, { recursive: true });

const candidates = fs.readdirSync(CAND_DIR)
  .filter(f => f.endsWith('.json'))
  .sort()
  .map(f => ({ file: f, path: path.join(CAND_DIR, f), policy: JSON.parse(fs.readFileSync(path.join(CAND_DIR, f))) }));

const cohorts = fs.readdirSync(COHORT_DIR)
  .filter(f => f.startsWith('cohort_') && f.endsWith('.json'))
  .sort()
  .map(f => path.join(COHORT_DIR, f));

console.log(`sweeping ${candidates.length} policies × ${cohorts.length} cohorts = ${candidates.length * cohorts.length} runs`);
console.log(`sim_seed = ${SIM_SEED} (held constant)\n`);

const runs = [];
const t0 = Date.now();

for (const cand of candidates) {
  const perCohort = [];
  for (const cohortPath of cohorts) {
    const t1 = Date.now();
    const result = runSim(cand.policy, cohortPath, SIM_SEED);
    const ms = Date.now() - t1;
    runs.push({
      policy_id: cand.policy.id,
      policy_file: cand.file,
      cohort: path.basename(cohortPath),
      ms,
      ...result,
    });
    perCohort.push(result.revenue);
  }
  const mean = perCohort.reduce((a, b) => a + b, 0) / perCohort.length;
  console.log(`  ${cand.policy.id.padEnd(34)}  rev=₹${(mean / 100000).toFixed(2)}L  (${perCohort.map(r => (r / 100000).toFixed(2)).join(', ')}L)`);
}

const totalMs = Date.now() - t0;

// ── Aggregate by policy ──────────────────────────────────────────────────
function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function std(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1));
}

const byPolicy = {};
for (const r of runs) {
  if (!byPolicy[r.policy_id]) byPolicy[r.policy_id] = [];
  byPolicy[r.policy_id].push(r);
}

const aggregates = Object.entries(byPolicy).map(([pid, rs]) => ({
  policy_id: pid,
  policy_file: rs[0].policy_file,
  n: rs.length,
  mean_revenue: mean(rs.map(r => r.revenue)),
  std_revenue: std(rs.map(r => r.revenue)),
  mean_memos: mean(rs.map(r => r.memos)),
  mean_conversion: mean(rs.map(r => r.conversion)),
  mean_avg_ticket: mean(rs.map(r => r.avg_ticket)),
  mean_peak_bill_wait: mean(rs.map(r => r.peak_bill_wait)),
  mean_avg_bill_wait: mean(rs.map(r => r.avg_bill_wait)),
  mean_abandon_pct: mean(rs.map(r => r.abandon_pct)),
  mean_abandonments_bill: mean(rs.map(r => r.abandonments_bill)),
  mean_walkouts: mean(rs.map(r => r.walkouts)),
  mean_no_purchase_walkouts: mean(rs.map(r => r.no_purchase_walkouts)),
}));

// Delta-vs-baseline
const baseline = aggregates.find(a => a.policy_id === 'P01_pure_baseline');
if (baseline) {
  for (const a of aggregates) {
    a.delta_revenue = a.mean_revenue - baseline.mean_revenue;
    a.delta_revenue_pct = baseline.mean_revenue > 0
      ? (a.mean_revenue - baseline.mean_revenue) / baseline.mean_revenue * 100
      : 0;
    a.delta_bill_wait = a.mean_peak_bill_wait - baseline.mean_peak_bill_wait;
    a.delta_abandon_pct = a.mean_abandon_pct - baseline.mean_abandon_pct;
  }
}

// Sort by mean revenue descending
aggregates.sort((a, b) => b.mean_revenue - a.mean_revenue);

console.log(`\nsweep finished in ${(totalMs / 1000).toFixed(2)}s  (avg ${(totalMs / runs.length).toFixed(0)} ms/run)\n`);
console.log('TOP 10 BY MEAN REVENUE:');
console.log('  rank  policy                                  mean ₹L    Δvs baseline   conv   peak-bill   abandon%');
aggregates.slice(0, 10).forEach((a, i) => {
  const dPct = (a.delta_revenue_pct || 0).toFixed(2);
  const sign = (a.delta_revenue_pct || 0) >= 0 ? '+' : '';
  console.log(
    `  ${String(i + 1).padStart(2)}.   ${a.policy_id.padEnd(34)}  ₹${(a.mean_revenue / 100000).toFixed(3)}L  ${sign}${dPct}%  ` +
    `${(a.mean_conversion * 100).toFixed(1)}%   ${a.mean_peak_bill_wait.toFixed(1)}m      ${(a.mean_abandon_pct * 100).toFixed(1)}%`
  );
});

// ── Save full results ────────────────────────────────────────────────────
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outPath = path.join(OUT_DIR, `sweep_${stamp}.json`);
const latestPath = path.join(OUT_DIR, 'latest.json');

const payload = {
  timestamp: new Date().toISOString(),
  sim_seed: SIM_SEED,
  n_candidates: candidates.length,
  n_cohorts: cohorts.length,
  n_runs: runs.length,
  total_ms: totalMs,
  cohorts: cohorts.map(p => path.basename(p)),
  candidates: candidates.map(c => c.policy.id),
  runs,
  aggregates,
};

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
fs.writeFileSync(latestPath, JSON.stringify(payload, null, 2));
console.log(`\nwrote ${outPath}`);
console.log(`wrote ${latestPath}  (alias for plot.py)`);
