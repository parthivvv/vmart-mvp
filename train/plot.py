"""
Aaru-style charts for the V-Mart policy sweep.

Editorial serif headlines, generous whitespace, no chart-junk, dashed
gridlines, off-white warm background. Designed to look at home in a
pitch deck or a static report rather than a Jupyter notebook.

Reads train/results/latest.json, writes 5 plots to train/plots/.

Design:
  - serif: Charter (transitional, wide-aperture)
  - sans:  Helvetica Neue
  - palette: V-Mart reds + warm off-white bg
  - all caps small-bold for legend / labels
  - small "V-MART" mark + italic tagline at footer
"""

import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib as mpl
import numpy as np


# -- PALETTE ----------------------------------------------------------------
BG          = '#F2EFE8'
INK         = '#1A1815'
INK_DIM     = '#7A746B'
LINE        = '#D8D2C7'
LINE_DARK   = '#B8B0A2'

RED_DARK    = '#B0141B'
RED         = '#E11D26'
RED_MID     = '#EF5A63'
ROSE        = '#F08A92'
ROSE_LIGHT  = '#F7B7BD'
SLATE       = '#3A3F45'
GRAY_MID    = '#9A938A'
GRAY_LIGHT  = '#C0B8AC'

# Color coded by L1 level, the dominant signal we discovered in the sweep
L1_COLORS = {
    'reactive':    GRAY_MID,
    'sched_18_19': ROSE_LIGHT,
    'sched_17_18': ROSE,
    'sched_16_17': RED_MID,
    'sched_15_16': RED_DARK,
}

L1_LABELS = {
    'reactive':    'REACTIVE',
    'sched_18_19': '18:00 / 19:00',
    'sched_17_18': '17:00 / 18:00',
    'sched_16_17': '16:00 / 17:00',
    'sched_15_16': '15:00 / 16:00 / 17:30',
}

# Cohort colors for dot plots
COHORT_COLORS = {
    'cohort_101.json': RED_DARK,
    'cohort_202.json': RED,
    'cohort_303.json': ROSE,
}

# -- FONTS ------------------------------------------------------------------
mpl.rcParams['font.serif']      = ['Charter', 'Iowan Old Style', 'Georgia', 'DejaVu Serif']
mpl.rcParams['font.sans-serif'] = ['Helvetica Neue', 'Helvetica', 'Arial', 'DejaVu Sans']
mpl.rcParams['font.family']     = 'sans-serif'
mpl.rcParams['axes.facecolor']  = BG
mpl.rcParams['figure.facecolor'] = BG
mpl.rcParams['savefig.facecolor'] = BG
mpl.rcParams['axes.edgecolor']  = INK_DIM
mpl.rcParams['axes.labelcolor'] = INK
mpl.rcParams['xtick.color']     = INK_DIM
mpl.rcParams['ytick.color']     = INK
mpl.rcParams['axes.titlecolor'] = INK
mpl.rcParams['text.color']      = INK
mpl.rcParams['legend.frameon']  = False


# -- LOAD -------------------------------------------------------------------
HERE     = Path(__file__).resolve().parent
RESULTS  = json.loads((HERE / 'results' / 'latest.json').read_text())
OUT_DIR  = HERE / 'plots'
OUT_DIR.mkdir(exist_ok=True)

aggregates = RESULTS['aggregates']
runs       = RESULTS['runs']
cohorts    = RESULTS['cohorts']

agg_by_id  = {a['policy_id']: a for a in aggregates}

def policy_num(pid: str) -> int:
    return int(pid[1:3]) if pid.startswith('P') and pid[1:3].isdigit() else 99

def short_label(pid: str) -> str:
    parts = pid.split('_', 2)
    if len(parts) < 2:
        return pid
    return f"{parts[0]}  {parts[1]} {parts[2] if len(parts) > 2 else ''}".strip()

def l1_of(pid: str) -> str:
    p = agg_by_id.get(pid, {})
    f = HERE / 'candidates' / p.get('policy_file', '')
    if not f.exists():
        return 'unknown'
    return json.loads(f.read_text())['levers_chosen']['L1']


# -- FRAMING ----------------------------------------------------------------
def aaru_frame(fig, title, subtitle=None, footer_y=0.035):
    """Apply standard Aaru-esque framing: title top-left, footer bottom-center."""
    fig.text(0.065, 0.93, title, fontsize=32, family='serif', color=INK,
             weight='normal', va='top')
    if subtitle:
        fig.text(0.065, 0.875, subtitle, fontsize=11.5, family='sans-serif',
                 color=INK_DIM, weight='normal', va='top')

    # Footer brand mark
    fig.text(0.5, footer_y, 'V-MART · DIWALI SATURDAY OPTIMIZATION · 2026',
             ha='center', fontsize=8.5, family='sans-serif', color=INK_DIM,
             weight='normal', style='italic')


def clean_axes(ax, x_grid=True, y_grid=False, x_ticks_only=False):
    """Strip default spines + ticks for the editorial look."""
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.tick_params(left=False, bottom=False, length=0, pad=8)
    ax.grid(False)
    if x_grid:
        ax.grid(axis='x', linestyle=(0, (2, 4)), color=LINE_DARK,
                linewidth=0.7, alpha=0.85, zorder=0)
    if y_grid:
        ax.grid(axis='y', linestyle=(0, (2, 4)), color=LINE_DARK,
                linewidth=0.7, alpha=0.85, zorder=0)


def l1_legend(fig, y=0.07):
    """Inline legend row at bottom of the figure showing the L1 color key."""
    x = 0.065
    fig.text(x, y + 0.024, 'BILLING-SCHEDULE LEVER (L1)', fontsize=8.2,
             family='sans-serif', color=INK_DIM, weight='bold')
    for key, color in L1_COLORS.items():
        fig.add_artist(plt.Circle((x + 0.001, y + 0.006), 0.0058,
                                  color=color, transform=fig.transFigure,
                                  clip_on=False, zorder=10))
        label = L1_LABELS[key]
        fig.text(x + 0.013, y + 0.005, label, fontsize=8.5,
                 family='sans-serif', color=INK, weight='normal')
        x += 0.013 + 0.005 + 0.011 * (len(label) + 2)


# ─────────────────────────────────────────────────────────────────────────────
# PLOT 1 - POLICY RANKING (horizontal bars, sorted desc)
# ─────────────────────────────────────────────────────────────────────────────
def plot_ranking():
    sorted_aggs = sorted(aggregates, key=lambda a: -a['mean_revenue'])
    n = len(sorted_aggs)
    labels = [short_label(a['policy_id']) for a in sorted_aggs]
    revs   = [a['mean_revenue'] / 1e5 for a in sorted_aggs]
    stds   = [a['std_revenue'] / 1e5 for a in sorted_aggs]
    deltas = [a.get('delta_revenue_pct', 0) for a in sorted_aggs]
    colors = [L1_COLORS.get(l1_of(a['policy_id']), GRAY_MID) for a in sorted_aggs]

    fig = plt.figure(figsize=(13, 11))
    aaru_frame(
        fig,
        'Which policy generates the most revenue?',
        f'Mean across {len(cohorts)} cohorts × 1,000 shopper agents each, sim seed locked. Higher is better.',
    )
    ax = fig.add_axes([0.32, 0.16, 0.61, 0.66])

    y_pos = np.arange(n)
    ax.barh(y_pos, revs, color=colors, height=0.62, zorder=2,
            xerr=stds, error_kw={'ecolor': INK_DIM, 'capsize': 0, 'lw': 1.0, 'alpha': 0.5})

    # Y labels
    ax.set_yticks(y_pos)
    ax.set_yticklabels(labels, fontsize=9.5, color=INK, family='sans-serif')
    ax.invert_yaxis()
    ax.set_xlim(0, max(revs) * 1.18)
    xticks = np.arange(0, 6, 1)
    ax.set_xticks(xticks)
    ax.set_xticklabels([f'₹{x:.0f}L' if x > 0 else '0' for x in xticks],
                       fontsize=9, color=INK_DIM)

    # Delta annotations
    for i, (r, d) in enumerate(zip(revs, deltas)):
        sign = '+' if d >= 0 else ''
        color = INK if abs(d) >= 15 else INK_DIM
        weight = 'bold' if abs(d) >= 15 else 'normal'
        ax.text(r + max(revs) * 0.018, i, f'{sign}{d:.1f}%',
                va='center', fontsize=10.5, color=color,
                family='sans-serif', weight=weight)

    clean_axes(ax, x_grid=True, y_grid=False)

    # L1 color legend
    l1_legend(fig, y=0.08)

    out = OUT_DIR / 'policy_ranking.png'
    plt.savefig(out, dpi=150, bbox_inches=None)
    plt.close()
    print(f'wrote {out.name}')


# ─────────────────────────────────────────────────────────────────────────────
# PLOT 2 - LEVER DECOMPOSITION (the L1 signal)
# ─────────────────────────────────────────────────────────────────────────────
def plot_lever_decomposition():
    l1_groups = {}
    for a in aggregates:
        lv = l1_of(a['policy_id'])
        l1_groups.setdefault(lv, []).append(a['mean_revenue'] / 1e5)

    l1_order = ['reactive', 'sched_18_19', 'sched_17_18', 'sched_16_17', 'sched_15_16']
    means = [np.mean(l1_groups.get(lv, [0])) for lv in l1_order]
    stds  = [np.std(l1_groups.get(lv, [0])) if len(l1_groups.get(lv, [])) > 1 else 0
             for lv in l1_order]
    colors = [L1_COLORS[lv] for lv in l1_order]

    fig = plt.figure(figsize=(13, 9))
    aaru_frame(
        fig,
        'Billing schedule is the dominant lever',
        'Average revenue across L2 × L3 combinations, grouped by L1 (when counters open).',
    )
    ax = fig.add_axes([0.085, 0.18, 0.85, 0.64])

    positions = np.arange(len(l1_order))
    ax.bar(positions, means, color=colors, width=0.62, zorder=3,
           yerr=stds, error_kw={'ecolor': INK_DIM, 'capsize': 6, 'lw': 1.0, 'alpha': 0.55})

    for pos, m in zip(positions, means):
        ax.text(pos, m + 0.13, f'₹{m:.2f}L', ha='center', va='bottom',
                fontsize=14, color=INK, family='sans-serif', weight='normal')

    # Subtle subtitles under each bar describing the schedule
    descriptions = [
        'open reactively\nwhen queue ≥ 15',
        'C2 at 18:00\nC3 at 19:00',
        'C2 at 17:00\nC3 at 18:00',
        'C2 at 16:00\nC3 at 17:00',
        'C2 at 15:00\nC3 at 16:00\nC4 at 17:30',
    ]

    ax.set_xticks(positions)
    ax.set_xticklabels([L1_LABELS[lv] for lv in l1_order],
                       fontsize=11, color=INK, family='sans-serif')

    # Description below x-labels
    y_desc = -0.4
    for pos, d in zip(positions, descriptions):
        ax.text(pos, y_desc, d, ha='center', va='top',
                fontsize=9, color=INK_DIM, family='sans-serif', linespacing=1.4)

    ax.set_ylim(0, max(means) * 1.18)
    yt = np.arange(0, max(means) * 1.18, 1)
    ax.set_yticks(yt)
    ax.set_yticklabels([f'₹{y:.0f}L' if y > 0 else '0' for y in yt],
                       fontsize=10, color=INK_DIM)

    clean_axes(ax, x_grid=False, y_grid=True)

    out = OUT_DIR / 'lever_decomposition.png'
    plt.savefig(out, dpi=150)
    plt.close()
    print(f'wrote {out.name}')


# ─────────────────────────────────────────────────────────────────────────────
# PLOT 3 - COHORT CONSISTENCY
# ─────────────────────────────────────────────────────────────────────────────
def plot_cohort_consistency():
    # Top 10 policies
    top = sorted(aggregates, key=lambda a: -a['mean_revenue'])[:10]
    top_ids = [a['policy_id'] for a in top]

    # For each (policy, cohort) pull revenue from runs
    per = {pid: {} for pid in top_ids}
    for r in runs:
        if r['policy_id'] in per:
            per[r['policy_id']][r['cohort']] = r['revenue'] / 1e5

    fig = plt.figure(figsize=(14, 11))
    aaru_frame(
        fig,
        'Does the winning policy win on every shopper cohort?',
        f"Each policy was tested on {len(cohorts)} independent 1,000-agent cohorts. "
        "Dots connected = same policy.",
    )
    ax = fig.add_axes([0.34, 0.16, 0.59, 0.66])

    y_positions = np.arange(len(top_ids))
    for i, pid in enumerate(top_ids):
        revs = [per[pid].get(c, 0) for c in cohorts]
        # Connecting line in gray
        ax.hlines(y=i, xmin=min(revs), xmax=max(revs),
                  color=GRAY_LIGHT, linewidth=2.5, zorder=2, alpha=0.85)
        # Cohort dots
        for c in cohorts:
            ax.scatter(per[pid][c], i, s=120, color=COHORT_COLORS[c], zorder=4,
                       edgecolor=BG, linewidth=2)

    ax.set_yticks(y_positions)
    ax.set_yticklabels([short_label(p) for p in top_ids],
                       fontsize=10, color=INK, family='sans-serif')
    ax.invert_yaxis()

    xmin = min(r['revenue'] / 1e5 for r in runs if r['policy_id'] in top_ids) - 0.15
    xmax = max(r['revenue'] / 1e5 for r in runs if r['policy_id'] in top_ids) + 0.2
    ax.set_xlim(xmin, xmax)
    xt = np.arange(np.floor(xmin), np.ceil(xmax) + 0.25, 0.25)
    ax.set_xticks(xt)
    ax.set_xticklabels([f'₹{x:.2f}L' for x in xt], fontsize=9, color=INK_DIM)

    clean_axes(ax, x_grid=True, y_grid=False)

    # Cohort legend
    legend_y = 0.075
    x = 0.34
    fig.text(x, legend_y + 0.028, 'COHORT', fontsize=8.2, family='sans-serif',
             color=INK_DIM, weight='bold')
    for c in cohorts:
        fig.add_artist(plt.Circle((x + 0.001, legend_y + 0.006), 0.0062,
                                  color=COHORT_COLORS[c], transform=fig.transFigure,
                                  clip_on=False, zorder=10))
        label = c.replace('cohort_', 'seed ').replace('.json', '')
        fig.text(x + 0.014, legend_y + 0.005, label, fontsize=9.5,
                 family='sans-serif', color=INK)
        x += 0.013 + 0.005 + 0.010 * (len(label) + 4)

    out = OUT_DIR / 'cohort_consistency.png'
    plt.savefig(out, dpi=150)
    plt.close()
    print(f'wrote {out.name}')


# ─────────────────────────────────────────────────────────────────────────────
# PLOT 4 - KPI COMPARISON BASELINE vs WINNER (slope/before-after)
# ─────────────────────────────────────────────────────────────────────────────
def plot_kpi_comparison():
    base = agg_by_id.get('P01_pure_baseline')
    winner = sorted(aggregates, key=lambda a: -a['mean_revenue'])[0]
    if not base or not winner:
        return

    # Format: (label, baseline_value, winner_value, fmt, good_direction)
    rows = [
        ('Revenue (₹ lakhs)',          base['mean_revenue'] / 1e5,        winner['mean_revenue'] / 1e5,        '₹{:.2f}L',    'up'),
        ('Conversion',                 base['mean_conversion'] * 100,     winner['mean_conversion'] * 100,     '{:.1f}%',      'up'),
        ('Memos issued',               base['mean_memos'],                winner['mean_memos'],                '{:.0f}',       'up'),
        ('Avg ticket (₹)',             base['mean_avg_ticket'],           winner['mean_avg_ticket'],           '₹{:.0f}',      'up'),
        ('Peak billing wait (min)',    base['mean_peak_bill_wait'],       winner['mean_peak_bill_wait'],       '{:.1f}m',      'down'),
        ('Avg billing wait (min)',     base['mean_avg_bill_wait'],        winner['mean_avg_bill_wait'],        '{:.1f}m',      'down'),
        ('Walk-out + abandon',         base['mean_walkouts'],             winner['mean_walkouts'],             '{:.0f}',       'down'),
        ('Billing abandonments',       base['mean_abandonments_bill'],    winner['mean_abandonments_bill'],    '{:.0f}',       'down'),
    ]

    fig = plt.figure(figsize=(13, 11))
    aaru_frame(
        fig,
        'Before & after: baseline policy vs sweep winner',
        f'Same 3 cohorts × 1,000 agents · same sim seed · only the policy changed.',
    )
    ax = fig.add_axes([0.085, 0.13, 0.83, 0.70])

    n = len(rows)
    y_positions = np.arange(n)[::-1]
    x_left = 0
    x_right = 1

    for y, (label, b, w, fmt, direction) in zip(y_positions, rows):
        # Determine if "better" is up or down
        better = (direction == 'up' and w > b) or (direction == 'down' and w < b)
        line_color = RED_DARK if better else GRAY_MID
        pct_change = ((w - b) / b * 100) if b != 0 else 0
        sign = '+' if pct_change >= 0 else ''

        # Connecting line
        ax.plot([x_left, x_right], [y, y], color=line_color, linewidth=2.4,
                alpha=0.85, zorder=2)
        # Dots
        ax.scatter(x_left,  y, s=200, color=GRAY_MID,   zorder=3, edgecolor=BG, linewidth=2)
        ax.scatter(x_right, y, s=200, color=RED_DARK,  zorder=3, edgecolor=BG, linewidth=2)

        # Label on left
        ax.text(-0.04, y, label, ha='right', va='center', fontsize=11,
                color=INK, family='sans-serif')
        # Baseline value
        ax.text(x_left - 0.005, y - 0.32, fmt.format(b), ha='right', va='top',
                fontsize=10, color=INK_DIM, family='sans-serif')
        # Winner value
        ax.text(x_right + 0.005, y - 0.32, fmt.format(w), ha='left', va='top',
                fontsize=10, color=INK, family='sans-serif', weight='bold')
        # % change in the middle (above line)
        ax.text((x_left + x_right) / 2, y + 0.30, f'{sign}{pct_change:.1f}%',
                ha='center', va='bottom', fontsize=10.5,
                color=RED_DARK if better else SLATE,
                family='sans-serif', weight='bold')

    # Headers
    ax.text(x_left,  n - 0.2, 'B A S E L I N E', ha='center', va='bottom',
            fontsize=10, color=INK_DIM, weight='bold', family='sans-serif')
    ax.text(x_right, n - 0.2, 'O P T I M I Z E D   V 2', ha='center', va='bottom',
            fontsize=10, color=RED_DARK, weight='bold', family='sans-serif')

    ax.set_xlim(-0.38, 1.18)
    ax.set_ylim(-0.8, n + 0.1)
    ax.set_xticks([])
    ax.set_yticks([])
    for sp in ax.spines.values():
        sp.set_visible(False)

    out = OUT_DIR / 'kpi_comparison.png'
    plt.savefig(out, dpi=150)
    plt.close()
    print(f'wrote {out.name}')


# ─────────────────────────────────────────────────────────────────────────────
# PLOT 5 - TRADEOFF SCATTER (revenue vs peak billing wait)
# ─────────────────────────────────────────────────────────────────────────────
def plot_tradeoff_scatter():
    fig = plt.figure(figsize=(13, 9.5))
    aaru_frame(
        fig,
        'The operational frontier',
        'Each point is one policy averaged across 3 cohorts. Top-left = the goal: high revenue, low waits.',
    )
    ax = fig.add_axes([0.085, 0.18, 0.87, 0.64])

    # Plot points
    for a in aggregates:
        c = L1_COLORS.get(l1_of(a['policy_id']), GRAY_MID)
        ax.scatter(a['mean_peak_bill_wait'], a['mean_revenue'] / 1e5,
                   c=c, s=180, alpha=0.92, edgecolor=BG, linewidth=2, zorder=3)
        ax.annotate(a['policy_id'].split('_')[0],
                    (a['mean_peak_bill_wait'], a['mean_revenue'] / 1e5),
                    fontsize=8, color=INK_DIM, xytext=(8, 4),
                    textcoords='offset points', family='sans-serif')

    ax.set_xlabel('Peak billing wait (minutes at evening peak)',
                  fontsize=11, color=INK, family='sans-serif',
                  labelpad=12)
    ax.set_ylabel('Mean revenue (₹ lakhs)',
                  fontsize=11, color=INK, family='sans-serif',
                  labelpad=12)

    ax.set_xticks(np.arange(0, 35, 5))
    ax.set_xticklabels([f'{x}m' for x in np.arange(0, 35, 5)],
                       fontsize=9.5, color=INK_DIM)
    ax.set_yticks(np.arange(3.8, 5.4, 0.2))
    ax.set_yticklabels([f'₹{y:.1f}L' for y in np.arange(3.8, 5.4, 0.2)],
                       fontsize=9.5, color=INK_DIM)

    clean_axes(ax, x_grid=True, y_grid=True)
    l1_legend(fig, y=0.08)

    out = OUT_DIR / 'tradeoff_scatter.png'
    plt.savefig(out, dpi=150)
    plt.close()
    print(f'wrote {out.name}')


# MAIN
if __name__ == '__main__':
    # Removed: plot_tradeoff_scatter() - points clumped at the right edge,
    # adds no insight beyond what policy_ranking + lever_decomposition show.
    plot_ranking()
    plot_lever_decomposition()
    plot_cohort_consistency()
    plot_kpi_comparison()
    # Clean up any stale tradeoff_scatter.png from earlier runs
    stale = OUT_DIR / 'tradeoff_scatter.png'
    if stale.exists():
        stale.unlink()
        print(f'removed stale {stale.name}')
    print('\nall plots in', OUT_DIR)
