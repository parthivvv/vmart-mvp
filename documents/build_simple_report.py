"""
Build a short, plain-language V-Mart simulation brief.

Outputs:
  documents/VMart-Simulation-Brief.html
  documents/VMart-Simulation-Brief.pdf
  documents/simple_report_assets/*.png
"""

import json
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


HERE = Path(__file__).resolve().parent
REPO = HERE.parent
OUT_HTML = HERE / "VMart-Simulation-Brief.html"
OUT_PDF = HERE / "VMart-Simulation-Brief.pdf"
ASSET_DIR = HERE / "simple_report_assets"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

RED = "#E11D26"
RED_D = "#B0141B"
GREEN = "#2E7D52"
INK = "#1A1815"
INK_DIM = "#6B6258"
LINE = "#D8D2C7"
PAPER = "#FAF7F0"


def load_json(rel):
    return json.loads((REPO / rel).read_text())


def inr_lakh(x):
    return f"₹{x / 100000:.2f}L"


def pct(x):
    return f"{x * 100:.1f}%"


def esc(s):
    clean = str(s).replace("—", " - ")
    return clean.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def save_fig(fig, name):
    ASSET_DIR.mkdir(exist_ok=True)
    path = ASSET_DIR / name
    fig.savefig(path, dpi=180, bbox_inches="tight", facecolor=PAPER)
    plt.close(fig)
    return path


def profile_mix_chart(agents, profiles):
    counts = Counter(a["profile"] for a in agents)
    items = sorted(counts.items(), key=lambda kv: kv[1])
    labels = [profiles[k]["label"].replace("Mission-driven ", "Mission ") for k, _ in items]
    values = [v for _, v in items]
    fig, ax = plt.subplots(figsize=(7.2, 4.1), facecolor=PAPER)
    ax.barh(labels, values, color=RED)
    ax.set_title("Shopper mix in the digital store", loc="left", fontsize=15, color=INK, pad=12)
    ax.set_xlabel("Number of shoppers out of 1,000", color=INK_DIM)
    ax.tick_params(axis="y", labelsize=8.5, colors=INK)
    ax.tick_params(axis="x", labelsize=8.5, colors=INK_DIM)
    ax.grid(axis="x", color=LINE, linewidth=0.8)
    for spine in ax.spines.values():
        spine.set_visible(False)
    return save_fig(fig, "profile_mix.png")


def arrivals_chart(agents):
    bins = [0] * 12
    for a in agents:
        idx = min(11, int(a["arrival_minute"] // 60))
        bins[idx] += 1
    labels = ["10", "11", "12", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
    fig, ax = plt.subplots(figsize=(7.2, 3.2), facecolor=PAPER)
    ax.plot(labels, bins, color=RED, linewidth=2.5, marker="o", markersize=5)
    ax.fill_between(labels, bins, color=RED, alpha=0.12)
    ax.set_title("Arrival pattern across the day", loc="left", fontsize=15, color=INK, pad=12)
    ax.set_ylabel("Shoppers arriving", color=INK_DIM)
    ax.set_xlabel("Hour starting", color=INK_DIM)
    ax.tick_params(axis="both", labelsize=9, colors=INK_DIM)
    ax.grid(axis="y", color=LINE, linewidth=0.8)
    for spine in ax.spines.values():
        spine.set_visible(False)
    return save_fig(fig, "arrival_pattern.png")


def result_chart(results):
    aggs = results["aggregates"]
    base = next(a for a in aggs if a["policy_id"] == "P01_pure_baseline")
    win = aggs[0]
    rows = [
        ("Revenue", base["mean_revenue"] / 100000, win["mean_revenue"] / 100000, "₹L", "up"),
        ("Conversion", base["mean_conversion"] * 100, win["mean_conversion"] * 100, "%", "up"),
        ("Memos", base["mean_memos"], win["mean_memos"], "", "up"),
        ("Average bill", base["mean_avg_ticket"], win["mean_avg_ticket"], "₹", "up"),
        ("Peak bill wait", base["mean_peak_bill_wait"], win["mean_peak_bill_wait"], "m", "down"),
        ("Bill abandonments", base["mean_abandonments_bill"], win["mean_abandonments_bill"], "", "down"),
    ]
    fig, ax = plt.subplots(figsize=(7.2, 4.2), facecolor=PAPER)
    y = list(range(len(rows)))
    base_vals = [r[1] for r in rows]
    win_vals = [r[2] for r in rows]
    labels = [r[0] for r in rows]
    ax.scatter(base_vals, y, color="#9A938A", s=58, label="Baseline", zorder=3)
    ax.scatter(win_vals, y, color=GREEN, s=58, label="Optimized", zorder=3)
    for i, row in enumerate(rows):
        ax.plot([base_vals[i], win_vals[i]], [i, i], color=LINE, linewidth=2, zorder=1)
        ax.text(max(base_vals[i], win_vals[i]) * 1.04, i, row[3], va="center", fontsize=8, color=INK_DIM)
    ax.set_yticks(y)
    ax.set_yticklabels(labels, fontsize=9, color=INK)
    ax.invert_yaxis()
    ax.set_title("Baseline vs optimized result", loc="left", fontsize=15, color=INK, pad=12)
    ax.legend(frameon=False, loc="lower right")
    ax.tick_params(axis="x", labelsize=8.5, colors=INK_DIM)
    ax.grid(axis="x", color=LINE, linewidth=0.8)
    for spine in ax.spines.values():
        spine.set_visible(False)
    return save_fig(fig, "baseline_vs_optimized.png")


def policy_chart(results):
    top = results["aggregates"][:8][::-1]
    labels = [a["policy_id"].replace("_", " ") for a in top]
    vals = [a["mean_revenue"] / 100000 for a in top]
    colors = [GREEN if i == len(top) - 1 else RED for i in range(len(top))]
    fig, ax = plt.subplots(figsize=(7.2, 3.8), facecolor=PAPER)
    ax.barh(labels, vals, color=colors)
    ax.set_title("Best policies by revenue", loc="left", fontsize=15, color=INK, pad=12)
    ax.set_xlabel("Mean daily revenue, ₹ lakh", color=INK_DIM)
    ax.tick_params(axis="y", labelsize=7.8, colors=INK)
    ax.tick_params(axis="x", labelsize=8.5, colors=INK_DIM)
    ax.grid(axis="x", color=LINE, linewidth=0.8)
    for spine in ax.spines.values():
        spine.set_visible(False)
    return save_fig(fig, "policy_ranking_simple.png")


def sku_summary(skus):
    by_zone = defaultdict(list)
    for s in skus:
        by_zone[s["zone"]].append(s)
    zone_names = {
        "power_wall": "Power wall",
        "womens_ethnic": "Women ethnic",
        "womens_western": "Women western",
        "womens_fa": "Women footwear and accessories",
        "mens_casual": "Men casual",
        "mens_formal_ethnic": "Men formal and ethnic",
        "mens_fa": "Men footwear and accessories",
        "kids": "Kids",
        "infants": "Infants",
    }
    rows = []
    for zone, arr in sorted(by_zone.items(), key=lambda kv: -len(kv[1])):
        prices = [s["diwali_price"] for s in arr]
        subs = sorted(set(s["sub_category"] for s in arr))
        examples = "; ".join(s["description"] for s in arr[:2])
        rows.append({
            "zone": zone_names.get(zone, zone),
            "count": len(arr),
            "types": ", ".join(subs[:5]) + ("..." if len(subs) > 5 else ""),
            "price": f"₹{min(prices):,.0f} to ₹{max(prices):,.0f}",
            "examples": examples,
        })
    return rows


def profile_rows(profiles):
    rows = []
    for pid, p in profiles.items():
        target = p.get("basket_size_target", {})
        if isinstance(target, dict):
            basket = f"{target.get('min')} to {target.get('max')} items"
        else:
            basket = str(target)
        zones = ", ".join((p.get("primary_zones") or [])[:2])
        rows.append({
            "profile": p["label"],
            "share": f"{int(round(p['weight'] * 100))}%",
            "basket": basket,
            "zones": zones.replace("_", " "),
            "plain": p["description"].split(".")[0] + ".",
        })
    return rows


def table(rows, cols):
    head = "".join(f"<th>{esc(label)}</th>" for _, label in cols)
    body = []
    for r in rows:
        body.append("<tr>" + "".join(f"<td>{esc(r[key])}</td>" for key, _ in cols) + "</tr>")
    return f"<table><thead><tr>{head}</tr></thead><tbody>{''.join(body)}</tbody></table>"


def main():
    skus = load_json("data/skus.json")["skus"]
    profiles = load_json("data/profiles.json")["profiles"]
    agents = load_json("data/agents.json")["agents"]
    results = load_json("train/results/latest.json")
    base = next(a for a in results["aggregates"] if a["policy_id"] == "P01_pure_baseline")
    win = results["aggregates"][0]

    charts = {
        "profile": profile_mix_chart(agents, profiles),
        "arrivals": arrivals_chart(agents),
        "results": result_chart(results),
        "policy": policy_chart(results),
    }

    sku_rows = sku_summary(skus)
    prof_rows = profile_rows(profiles)

    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>V-Mart Simulation Brief</title>
<style>
@page {{ size: A4; margin: 16mm 15mm 18mm; }}
* {{ box-sizing: border-box; }}
body {{
  font-family: Arial, Helvetica, sans-serif;
  color: {INK};
  background: {PAPER};
  font-size: 10.2pt;
  line-height: 1.42;
}}
h1 {{ font-size: 28pt; margin: 0 0 8pt; letter-spacing: -0.02em; }}
h2 {{ font-size: 15pt; margin: 18pt 0 8pt; color: {RED}; }}
h3 {{ font-size: 11pt; margin: 12pt 0 6pt; }}
p {{ margin: 0 0 8pt; }}
.meta {{ color: {INK_DIM}; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.08em; }}
.hero {{ border-top: 5pt solid {RED}; padding-top: 14pt; }}
.grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 8pt; margin: 12pt 0 10pt; }}
.card {{ background: white; border: 1pt solid {LINE}; padding: 9pt; border-radius: 4pt; }}
.card .k {{ color: {INK_DIM}; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4pt; }}
.card .v {{ font-size: 16pt; font-weight: 700; }}
.card.good .v {{ color: {GREEN}; }}
.note {{ background: white; border-left: 4pt solid {RED}; padding: 9pt 11pt; margin: 10pt 0; }}
table {{ width: 100%; border-collapse: collapse; background: white; margin: 8pt 0 10pt; page-break-inside: avoid; }}
th {{ text-align: left; background: #F1EDE5; color: {INK}; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.04em; padding: 6pt; border-bottom: 1pt solid {INK}; }}
td {{ padding: 6pt; border-bottom: 0.6pt solid {LINE}; vertical-align: top; font-size: 8.6pt; }}
.small td {{ font-size: 8.1pt; }}
.two {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12pt; align-items: start; }}
img {{ width: 100%; display: block; margin: 8pt 0 12pt; border: 1pt solid {LINE}; background: {PAPER}; }}
.page-break {{ break-before: page; }}
.footer {{ color: {INK_DIM}; font-size: 8pt; margin-top: 12pt; border-top: 1pt solid {LINE}; padding-top: 8pt; }}
</style>
</head>
<body>
<section class="hero">
  <div class="meta">V-Mart Unlimited simulation brief</div>
  <h1>What we tested and what changed</h1>
  <p>This is a simple view of the digital store model. We created a digital clone of one V-Mart Unlimited store on a Diwali Saturday, then tested better ways to run the same store with the same shopper demand.</p>
  <div class="grid">
    <div class="card"><div class="k">SKUs modeled</div><div class="v">{len(skus)}</div></div>
    <div class="card"><div class="k">Digital shoppers</div><div class="v">{len(agents)}</div></div>
    <div class="card"><div class="k">Policies tested</div><div class="v">{results['n_candidates']}</div></div>
    <div class="card good"><div class="k">Revenue lift</div><div class="v">+{win['delta_revenue_pct']:.1f}%</div></div>
  </div>
  <div class="note"><b>Plain-English result:</b> the best policy recovered about {inr_lakh(win['delta_revenue'])} per peak day by opening counters earlier, moving staff to busier areas, managing trial rooms better, refreshing key displays, and placing related outfit items together.</div>
  <h2>The levers we changed</h2>
  {table([
    {'lever':'Billing', 'baseline':'Counters open after queues form.', 'optimized':'Counters open before peak demand.'},
    {'lever':'Staffing', 'baseline':'Breaks overlap and staff stay fixed in zones.', 'optimized':'Breaks are staggered and staff move to busy zones.'},
    {'lever':'Trial rooms', 'baseline':'Loose management and no active item cap.', 'optimized':'Attendant at the women trial bank with a four-item cap.'},
    {'lever':'Merchandising', 'baseline':'Power wall and impulse fixture stay mostly static.', 'optimized':'Key displays refresh during the day.'},
    {'lever':'Cross-sell', 'baseline':'Related products sit in different areas.', 'optimized':'Outfit bundles and footwear are placed closer together.'},
  ], [('lever','Lever'),('baseline','Baseline'),('optimized','Optimized policy')])}
</section>

<section class="page-break">
  <h2>What SKUs are in the model</h2>
  <p>The model uses 100 SKUs across apparel, footwear, accessories, kids, infants, and entry displays. The table below summarizes the SKU mix by store area.</p>
  {table(sku_rows, [('zone','Store area'),('count','SKUs'),('types','SKU types'),('price','Diwali price range'),('examples','Example items')])}
</section>

<section class="page-break">
  <h2>What the shopper profiles look like</h2>
  <p>Each digital shopper belongs to a profile with a different mission, basket size, patience level, and shopping path.</p>
  {table(prof_rows, [('profile','Profile'),('share','Share'),('basket','Typical basket'),('zones','Main zones'),('plain','Plain-language behavior')])}
</section>

<section class="page-break">
  <h2>Two simple distributions</h2>
  <div class="two">
    <div>
      <h3>Shopper mix</h3>
      <img src="{charts['profile'].relative_to(HERE)}">
    </div>
    <div>
      <h3>Arrival pattern</h3>
      <img src="{charts['arrivals'].relative_to(HERE)}">
    </div>
  </div>
  <p>These distributions are why the store gets stressed in specific places. Families and mission-led shoppers create larger baskets. Evening arrivals create pressure at billing and trial rooms.</p>
</section>

<section class="page-break">
  <h2>End result</h2>
  <div class="grid">
    <div class="card"><div class="k">Baseline revenue</div><div class="v">{inr_lakh(base['mean_revenue'])}</div></div>
    <div class="card good"><div class="k">Optimized revenue</div><div class="v">{inr_lakh(win['mean_revenue'])}</div></div>
    <div class="card good"><div class="k">Conversion</div><div class="v">{pct(win['mean_conversion'])}</div></div>
    <div class="card good"><div class="k">Peak bill wait</div><div class="v">{win['mean_peak_bill_wait']:.0f}m</div></div>
  </div>
  <div class="two">
    <div>
      <h3>Baseline vs optimized</h3>
      <img src="{charts['results'].relative_to(HERE)}">
    </div>
    <div>
      <h3>Best policies</h3>
      <img src="{charts['policy'].relative_to(HERE)}">
    </div>
  </div>
  <div class="footer">For more detail, use the full methodology report and whitepaper in the documents folder.</div>
</section>
</body>
</html>"""

    if "—" in html:
        raise SystemExit("em dash found in generated HTML")
    OUT_HTML.write_text(html)
    print(f"wrote {OUT_HTML}")

    if not Path(CHROME).exists():
        raise SystemExit(f"Chrome not found at {CHROME}")
    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=10000",
        f"--print-to-pdf={OUT_PDF}",
        f"file://{OUT_HTML.resolve()}",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr[-1000:])
        raise SystemExit(result.returncode)
    print(f"wrote {OUT_PDF}")


if __name__ == "__main__":
    main()
