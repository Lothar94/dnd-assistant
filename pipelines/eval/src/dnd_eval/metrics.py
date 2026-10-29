"""Retrieval and answer metrics. Pure functions, no I/O."""

import math
from collections.abc import Sequence

Source = tuple[str, int]  # (book, page)


def recall_at_k(ranked: Sequence[Source], expected: set[Source], k: int) -> float:
    if not expected:
        return 0.0
    return len(expected & set(ranked[:k])) / len(expected)


def mrr(ranked: Sequence[Source], expected: set[Source]) -> float:
    for i, src in enumerate(ranked, start=1):
        if src in expected:
            return 1.0 / i
    return 0.0


def ndcg_at_k(ranked: Sequence[Source], expected: set[Source], k: int) -> float:
    if not expected:
        return 0.0
    seen: set[Source] = set()
    dcg = 0.0
    for i, src in enumerate(ranked[:k], start=1):
        if src in expected and src not in seen:
            seen.add(src)
            dcg += 1.0 / math.log2(i + 1)
    ideal = sum(1.0 / math.log2(i + 1) for i in range(1, min(len(expected), k) + 1))
    return dcg / ideal


def citation_accuracy(cited: Sequence[Source], expected: set[Source]) -> float:
    """Fraction of cited sources that are expected. No citations -> 0.0."""
    if not cited:
        return 0.0
    return sum(1 for c in set(cited) if c in expected) / len(set(cited))


def faithfulness(claims_supported: int, claims_total: int) -> float:
    """Supported claims / total claims (judge supplies counts)."""
    return claims_supported / claims_total if claims_total else 0.0
