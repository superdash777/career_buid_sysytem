# -*- coding: utf-8 -*-
"""Тесты hybrid retrieval в rag_service."""

import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_DIR))

from rag_service import get_skills_v2_candidates


def test_get_skills_v2_candidates_hybrid_merges_dense_and_lexical(monkeypatch):
    monkeypatch.setattr(
        "rag_service._dense_skill_candidates",
        lambda *args, **kwargs: [
            {"score": 0.91, "payload": {"name": "Python", "profession": "Data"}},
            {"score": 0.89, "payload": {"name": "SQL, YQL", "profession": "Data"}},
        ],
    )
    monkeypatch.setattr(
        "rag_service._lexical_skill_candidates",
        lambda *args, **kwargs: [
            {"score": 0.7, "payload": {"name": "Python", "profession": "Data"}},
            {"score": 0.8, "payload": {"name": "SQL, YQL", "profession": "Data"}},
        ],
    )

    out = get_skills_v2_candidates("питон sql", top_k=2, retrieval_mode="hybrid_rerank")
    assert len(out) == 2
    assert {r["name"] for r in out} == {"Python", "SQL, YQL"}
    assert all("dense_score" in r and "lexical_score" in r for r in out)
    assert all(r.get("retrieval_mode") == "hybrid_rerank" for r in out)


def test_get_skills_v2_candidates_dense_only_mode(monkeypatch):
    monkeypatch.setattr(
        "rag_service._dense_skill_candidates",
        lambda *args, **kwargs: [
            {"score": 0.92, "payload": {"name": "Python", "profession": "Data"}},
            {"score": 0.85, "payload": {"name": "Git", "profession": "Dev"}},
        ],
    )
    monkeypatch.setattr("rag_service._lexical_skill_candidates", lambda *args, **kwargs: [])
    out = get_skills_v2_candidates("python", top_k=1, retrieval_mode="dense_only")
    assert len(out) == 1
    assert out[0]["name"] == "Python"
    assert out[0]["retrieval_mode"] == "dense_only"


def test_get_skills_v2_candidates_lexical_only_mode(monkeypatch):
    monkeypatch.setattr("rag_service._dense_skill_candidates", lambda *args, **kwargs: [])
    monkeypatch.setattr(
        "rag_service._lexical_skill_candidates",
        lambda *args, **kwargs: [
            {"score": 0.77, "payload": {"name": "SQL, YQL", "profession": "Data"}},
            {"score": 0.66, "payload": {"name": "Python", "profession": "Data"}},
        ],
    )
    out = get_skills_v2_candidates("sql", top_k=1, retrieval_mode="lexical_only")
    assert len(out) == 1
    assert out[0]["name"] == "SQL, YQL"
    assert out[0]["retrieval_mode"] == "lexical_only"
