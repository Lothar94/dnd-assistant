"""Pick ~30 representative pages per book (deterministic) and write sample.json.

Categories (a page gets the first matching one):
  full_art, stat_block, spell, table, sidebar, two_column, other
Usage: select_pages.py <raw_dir> <out_json> [--per-book 30]
"""

import argparse
import json
from pathlib import Path

import pymupdf

QUOTAS = {
    "full_art": 3,
    "stat_block": 6,
    "spell": 5,
    "table": 5,
    "sidebar": 5,
    "two_column": 6,
}


def image_coverage(page: pymupdf.Page) -> float:
    area = page.rect.width * page.rect.height
    covered = 0.0
    for info in page.get_image_info():
        rect = pymupdf.Rect(info["bbox"]) & page.rect
        covered = max(covered, rect.width * rect.height)
    return covered / area


def is_two_column(page: pymupdf.Page) -> bool:
    mid = page.rect.width / 2
    blocks = [b for b in page.get_text("blocks") if b[6] == 0 and len(b[4]) > 120]
    left = sum(1 for b in blocks if b[2] < mid + 10)
    right = sum(1 for b in blocks if b[0] > mid - 10)
    return left >= 2 and right >= 2


def has_sidebar(page: pymupdf.Page) -> bool:
    area = page.rect.width * page.rect.height
    for drawing in page.get_drawings():
        if drawing.get("fill") is None:
            continue
        ratio = drawing["rect"].width * drawing["rect"].height / area
        if 0.06 < ratio < 0.6:
            return True
    return False


def classify(page: pymupdf.Page) -> str:
    text = page.get_text()
    if len(text) < 400 and image_coverage(page) > 0.6:
        return "full_art"
    if "Armor Class" in text and "Hit Points" in text:
        return "stat_block"
    if "Casting Time" in text and "Duration" in text:
        return "spell"
    if page.find_tables().tables:
        return "table"
    if has_sidebar(page):
        return "sidebar"
    if is_two_column(page):
        return "two_column"
    return "other"


def spread(pages: list[int], count: int) -> list[int]:
    if count >= len(pages):
        return pages
    step = len(pages) / count
    return [pages[int(i * step + step / 2)] for i in range(count)]


def select(pdf: Path, per_book: int) -> dict:
    doc = pymupdf.open(pdf)
    # skip cover/legal pages at the very start: start at index 4
    by_cat: dict[str, list[int]] = {}
    for index in range(4, len(doc)):
        by_cat.setdefault(classify(doc[index]), []).append(index)
    chosen: dict[int, str] = {}
    for cat, quota in QUOTAS.items():
        for index in spread(by_cat.get(cat, []), quota):
            chosen[index] = cat
    rest = [i for i in by_cat.get("other", []) + by_cat.get("two_column", []) if i not in chosen]
    for index in spread(sorted(rest), max(0, per_book - len(chosen))):
        chosen[index] = "filler"
    return {
        "pdf": str(pdf),
        "total_pages": len(doc),
        "available": {cat: len(v) for cat, v in sorted(by_cat.items())},
        "pages": {str(i): chosen[i] for i in sorted(chosen)},
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("raw_dir", type=Path)
    ap.add_argument("out_json", type=Path)
    ap.add_argument("--per-book", type=int, default=30)
    args = ap.parse_args()
    result = {pdf.stem: select(pdf, args.per_book) for pdf in sorted(args.raw_dir.glob("*.pdf"))}
    args.out_json.parent.mkdir(parents=True, exist_ok=True)
    args.out_json.write_text(json.dumps(result, indent=2, ensure_ascii=False))
    for book, data in result.items():
        print(book, data["total_pages"], data["available"], len(data["pages"]), "selected")


if __name__ == "__main__":
    main()
