"""Aggregate per-question results and compare two runs."""

import json
from collections import defaultdict
from pathlib import Path

from .dataset import Question
from .metrics import citation_accuracy, mrr, ndcg_at_k, recall_at_k

K = 5


def score(q: Question, ranked: list[tuple[str, int]], cited: list[tuple[str, int]],
          abstained: bool, faith: float | None) -> dict:
    exp = set(q.sources)
    row: dict = {"id": q.id, "category": q.category,
                 "abstain_correct": float(abstained == q.abstain)}
    if not q.abstain:
        row |= {f"recall@{K}": recall_at_k(ranked, exp, K), "mrr": mrr(ranked, exp),
                f"ndcg@{K}": ndcg_at_k(ranked, exp, K),
                "citation_accuracy": citation_accuracy(cited, exp)}
        if faith is not None:
            row["faithfulness"] = faith
    return row


def aggregate(rows: list[dict]) -> dict[str, float]:
    sums: dict[str, list[float]] = defaultdict(list)
    for r in rows:
        for k, v in r.items():
            if isinstance(v, float):
                sums[k].append(v)
    return {k: sum(v) / len(v) for k, v in sums.items()}


def compare(base: dict[str, float], new: dict[str, float]) -> str:
    lines = [f"{'metric':<20}{'base':>8}{'new':>8}{'delta':>8}"]
    for m in sorted(set(base) | set(new)):
        b, n = base.get(m), new.get(m)
        d = f"{n - b:+.3f}" if b is not None and n is not None else "n/a"
        fmt = lambda x: "-" if x is None else f"{x:.3f}"  # noqa: E731
        lines.append(f"{m:<20}{fmt(b):>8}{fmt(n):>8}{d:>8}")
    return "\n".join(lines)


def save(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"rows": rows, "summary": aggregate(rows)}, indent=1))
