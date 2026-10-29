"""Aggregate out/<parser>/<book>/metrics.json into the ADR comparison table.

Also measures folio (printed page number) retention: a page counts as retained when the
digits-only word found in the bottom/top 8% band of the PDF page appears as a standalone
line in the parser's markdown. Heuristic, meant for relative comparison only.

Usage: summarize.py <sample.json> <out_dir>
"""

import json
import re
import sys
from pathlib import Path

import pymupdf

PARSERS = ("pymupdf4llm", "docling", "marker")


def folio(page: pymupdf.Page) -> str | None:
    height = page.rect.height
    for _x0, y0, _x1, y1, word, *_ in page.get_text("words"):
        if word.isdigit() and (y0 > height * 0.92 or y1 < height * 0.08):
            return word
    return None


def folio_retention(info: dict, md_dir: Path) -> tuple[int, int]:
    doc = pymupdf.open(info["pdf"])
    expected = retained = 0
    for index in map(int, info["pages"]):
        number = folio(doc[index])
        if number is None:
            continue
        expected += 1
        text = (md_dir / f"{index:04d}.md").read_text()
        if re.search(rf"(?m)^\W*{number}\W*$", text):
            retained += 1
    return retained, expected


def main() -> None:
    sample = json.loads(Path(sys.argv[1]).read_text())
    out = Path(sys.argv[2])
    print(
        "| parser | book | s/page | headings (levels) | table rows "
        "| figures (captioned) | empty pages | folios kept |"
    )
    print("|---|---|---|---|---|---|---|---|")
    for parser in PARSERS:
        for book, info in sample.items():
            target = out / parser / book.replace(" ", "_").replace("'", "")
            m = json.loads((target / "metrics.json").read_text())
            kept, total = folio_retention(info, target / "pages")
            levels = ",".join(map(str, m["heading_levels"]))
            print(
                f"| {parser} | {book} | {m['s_per_page']} | {m['headings']} ({levels}) "
                f"| {m['table_rows']} | {m['figures']} ({m['figures_with_caption']}) "
                f"| {m['empty_pages']} | {kept}/{total} |"
            )


if __name__ == "__main__":
    main()
