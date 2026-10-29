import pytest

from dnd_eval import dataset
from dnd_eval.metrics import citation_accuracy, mrr, ndcg_at_k, recall_at_k

A, B, C = ("PHB", 1), ("PHB", 2), ("PHB", 3)


def test_recall_mrr_ndcg() -> None:
    assert recall_at_k([C, A], {A, B}, 2) == 0.5
    assert recall_at_k([C, A], {A, B}, 1) == 0.0
    assert mrr([C, A], {A}) == 0.5
    assert mrr([C], {A}) == 0.0
    assert ndcg_at_k([A, B], {A, B}, 5) == pytest.approx(1.0)
    assert ndcg_at_k([A, A], {A, B}, 5) < 1.0  # duplicates not double counted


def test_citation_accuracy() -> None:
    assert citation_accuracy([A, C], {A}) == 0.5
    assert citation_accuracy([], {A}) == 0.0


def test_validation_rejects_bad_rows() -> None:
    bad = '{"id":"x","category":"reglas","question":"q","reference_answer":"a"}'
    with pytest.raises(ValueError):
        dataset.parse(bad)
