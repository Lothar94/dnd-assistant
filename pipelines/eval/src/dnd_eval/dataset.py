"""Golden set loading and validation (JSONL, one question per line)."""

import json
from dataclasses import dataclass, field
from pathlib import Path

CATEGORIES = {
    "reglas", "entidades", "comparaciones", "multi-salto",
    "imagenes", "fuera-de-corpus", "sinonimos",
}


@dataclass(frozen=True)
class Question:
    id: str
    category: str
    question: str
    reference_answer: str | None
    sources: tuple[tuple[str, int], ...] = ()
    entities: tuple[str, ...] = ()
    subset: str = "private"  # "srd" runs in CI
    verified: bool = False
    extra: dict = field(default_factory=dict)

    @property
    def abstain(self) -> bool:
        return self.category == "fuera-de-corpus"


def parse(line: str) -> Question:
    d = json.loads(line)
    q = Question(
        id=d["id"], category=d["category"], question=d["question"],
        reference_answer=d.get("reference_answer"),
        sources=tuple((b, int(p)) for b, p in d.get("sources", [])),
        entities=tuple(d.get("entities", [])), subset=d.get("subset", "private"),
        verified=d.get("verified", False),
    )
    errors = validate(q)
    if errors:
        raise ValueError(f"{q.id}: {'; '.join(errors)}")
    return q


def validate(q: Question) -> list[str]:
    errs = []
    if q.category not in CATEGORIES:
        errs.append(f"unknown category {q.category!r}")
    if q.subset not in {"srd", "private"}:
        errs.append(f"unknown subset {q.subset!r}")
    if q.abstain and q.sources:
        errs.append("out-of-corpus question must have no sources")
    if not q.abstain and not q.sources:
        errs.append("in-corpus question needs expected sources")
    if not q.abstain and not q.reference_answer:
        errs.append("in-corpus question needs reference_answer")
    return errs


def load(path: Path, subset: str | None = None) -> list[Question]:
    qs = [parse(ln) for ln in path.read_text("utf-8").splitlines() if ln.strip()]
    ids = [q.id for q in qs]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate question ids")
    return [q for q in qs if subset is None or q.subset == subset]
