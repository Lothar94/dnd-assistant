"""Entry point: `uv run python -m dnd_eval [--subset srd] [--compare A.json B.json]`."""

import argparse
import json
import sys
from pathlib import Path

from . import dataset
from .report import compare

ROOT = Path(__file__).resolve().parents[2]


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="dnd_eval")
    ap.add_argument("--subset", choices=["srd", "private"])
    ap.add_argument("--dataset", type=Path, default=ROOT / "datasets" / "golden.jsonl")
    ap.add_argument("--compare", nargs=2, type=Path, metavar=("BASE", "NEW"))
    args = ap.parse_args(argv)

    if args.compare:
        s = [json.loads(p.read_text())["summary"] for p in args.compare]
        print(compare(*s))
        return 0

    qs = dataset.load(args.dataset, args.subset)
    by_cat: dict[str, int] = {}
    for q in qs:
        by_cat[q.category] = by_cat.get(q.category, 0) + 1
    print(f"dataset OK: {len(qs)} questions {by_cat}")
    print("no RAG system connected yet: retrieval/answer scoring skipped", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
