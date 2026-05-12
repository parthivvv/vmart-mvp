"""
Build the whitepaper PDF from the markdown source.

Pipeline:
  documents/optimization-report.md
    → render to styled HTML (Aaru-style serif + warm bg, page-break friendly)
    → headless Chrome print-to-PDF
    → documents/VMart-Diwali-Whitepaper.pdf
    → also keeps documents/whitepaper.html as a viewable artifact

Requirements:
  - python3 + markdown library (pip install markdown)
  - Google Chrome installed at /Applications/Google Chrome.app

Usage:
  python3 documents/build_pdf.py
"""

import subprocess
import sys
from pathlib import Path

try:
    import markdown
except ImportError:
    sys.exit("pip install markdown")

HERE   = Path(__file__).resolve().parent           # documents/
REPO   = HERE.parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Two artefacts: (markdown source, html output, pdf output)
DOCS = [
    {
        "md":   HERE / "whitepaper.md",
        "html": HERE / "whitepaper.html",
        "pdf":  HERE / "VMart-Diwali-Whitepaper.pdf",
        "title": "V-Mart Diwali · Whitepaper",
    },
    {
        "md":   HERE / "optimization-report.md",
        "html": HERE / "methodology.html",
        "pdf":  HERE / "VMart-Diwali-Methodology.pdf",
        "title": "V-Mart Diwali · Methodology",
    },
]

CSS = """
@page {
  size: A4;
  margin: 22mm 18mm 24mm 18mm;
}
@page :first {
  margin-top: 35mm;
}

* { box-sizing: border-box; }
html, body {
  font-family: 'Charter', 'Iowan Old Style', 'Georgia', serif;
  font-size: 10.5pt;
  line-height: 1.58;
  color: #1A1815;
  background: #F2EFE8;
}
body {
  max-width: 100%;
  padding: 0;
}

/* TITLE BLOCK — first H1 acts as cover header */
h1 {
  font-size: 30pt;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0 0 8pt 0;
  line-height: 1.12;
  color: #1A1815;
  page-break-before: avoid;
}
h1 + p strong:first-child { color: #7A746B; }

h2 {
  font-size: 18pt;
  font-weight: 600;
  letter-spacing: -0.005em;
  margin: 28pt 0 12pt 0;
  padding-bottom: 8pt;
  border-bottom: 1.5pt solid #1F4D4A;
  color: #1A1815;
  page-break-after: avoid;
}

h3 {
  font-size: 13pt;
  font-weight: 600;
  margin: 20pt 0 8pt 0;
  color: #1A1815;
  page-break-after: avoid;
}

h4 {
  font-size: 11.5pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #1F4D4A;
  margin: 16pt 0 6pt 0;
}

p {
  margin: 0 0 9pt 0;
  text-align: justify;
}

strong { color: #1A1815; font-weight: 700; }
em { font-style: italic; }

ul, ol {
  margin: 0 0 12pt 0;
  padding-left: 22pt;
}
li {
  margin-bottom: 4pt;
  line-height: 1.55;
}

code {
  font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', monospace;
  background: #ECE7DD;
  padding: 1pt 5pt;
  border-radius: 2pt;
  font-size: 9.5pt;
  color: #2A2A2A;
}
pre {
  background: #FAF7F0;
  border: 1pt solid #D8D2C7;
  border-radius: 3pt;
  padding: 10pt 12pt;
  margin: 10pt 0 14pt 0;
  font-size: 9pt;
  line-height: 1.45;
  overflow-x: auto;
  page-break-inside: avoid;
}
pre code { background: transparent; padding: 0; font-size: inherit; }

blockquote {
  border-left: 3pt solid #1F4D4A;
  padding: 10pt 16pt;
  margin: 12pt 0;
  background: rgba(31,77,74,0.05);
  color: #2A2A2A;
  page-break-inside: avoid;
}
blockquote p { margin-bottom: 6pt; }
blockquote p:last-child { margin-bottom: 0; }

table {
  border-collapse: collapse;
  width: 100%;
  margin: 12pt 0 18pt 0;
  font-size: 9.5pt;
  page-break-inside: avoid;
  background: white;
}
th, td {
  border-bottom: 0.7pt solid #D8D2C7;
  padding: 6pt 8pt;
  text-align: left;
  vertical-align: top;
}
th {
  background: #FAF7F0;
  font-weight: 700;
  letter-spacing: 0.02em;
  border-bottom: 1.2pt solid #1A1815;
  color: #1A1815;
  text-transform: uppercase;
  font-size: 8.5pt;
}
tr:nth-child(even) td { background: rgba(250,247,240,0.5); }

img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 14pt auto;
  page-break-inside: avoid;
  border-radius: 3pt;
}

hr {
  border: none;
  border-top: 0.8pt solid #D8D2C7;
  margin: 22pt 0;
}

a { color: #1F4D4A; text-decoration: none; border-bottom: 0.5pt dashed #1F4D4A; }
a code { color: #1F4D4A; }

/* Avoid orphans where possible */
h2 + p, h3 + p, h4 + p { page-break-before: avoid; }

/* Image-after-h2 — keep them together */
h2 + img, h3 + img, p + img { page-break-before: avoid; }

/* Footer note: published date stamp + page number rendered by Chrome */
"""


def build_one(spec):
    md_text = spec["md"].read_text()
    html_body = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "sane_lists", "nl2br"],
        output_format="html5",
    )
    html_doc = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{spec["title"]}</title>
<style>{CSS}</style>
</head>
<body>
{html_body}
</body>
</html>"""
    spec["html"].write_text(html_doc)
    print(f"  wrote {spec['html'].name} ({spec['html'].stat().st_size / 1024:.1f} KB)")

    if not Path(CHROME).exists():
        sys.exit(f"chrome not at {CHROME}")
    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=10000",
        f"--print-to-pdf={spec['pdf']}",
        f"file://{spec['html'].resolve()}",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("  STDERR:", result.stderr[-800:])
        sys.exit(result.returncode)
    print(f"  wrote {spec['pdf'].name} ({spec['pdf'].stat().st_size / 1024:.1f} KB)")


def main():
    for spec in DOCS:
        if not spec["md"].exists():
            print(f"skip {spec['md'].name} (missing)")
            continue
        print(f"\n[{spec['title']}]")
        build_one(spec)
    print("\ndone.")


if __name__ == "__main__":
    main()
