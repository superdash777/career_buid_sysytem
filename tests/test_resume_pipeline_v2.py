# -*- coding: utf-8 -*-
"""Тесты для V2 extraction pipeline и fallback-поведения."""

import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_DIR))

from resume_parser import ResumeParser


def test_parse_skills_v2_flow_with_stubbed_llm_calls(monkeypatch):
    parser = ResumeParser()

    # Стабим все этапы LLM pipeline
    parser._extract_raw_skills = lambda _text, **_kwargs: ["питон", "sql"]  # type: ignore[attr-defined]
    parser._llm_rerank_candidate = lambda raw, cands, **_kwargs: {  # type: ignore[attr-defined]
        "match": "Python" if raw == "питон" else "SQL, YQL",
        "confidence": 0.88,
    }
    parser._assess_level = lambda skill, _text, _levels, **_kwargs: {  # type: ignore[attr-defined]
        "level": 2 if skill == "Python" else 1,
        "evidence": f"Упоминание навыка {skill}",
    }

    monkeypatch.setattr(
        "resume_parser.get_skills_v2_candidates",
        lambda _raw, top_k=5, retrieval_mode=None: [{"name": "Python", "score": 0.93}] if top_k else [],
    )

    allowed = [
        {"Навык": "Python"},
        {"Навык": "SQL, YQL"},
    ]
    out = parser.parse_skills_v2("Резюме...", allowed)
    assert out["used_fallback"] is False
    assert len(out["skills"]) == 2
    names = {s["name"] for s in out["skills"]}
    assert names == {"Python", "SQL, YQL"}
    assert all("llm_rerank_confidence" in s for s in out["skills"])
    assert all("candidates" in s for s in out["skills"])
    assert all("retrieval_trace" in s for s in out["skills"])
    assert all("source_skill_id" in s for s in out["skills"])


def test_parse_skills_falls_back_to_legacy_on_v2_error():
    parser = ResumeParser()
    parser.client = object()
    parser.parse_skills_v2 = lambda _text, _allowed: (_ for _ in ()).throw(RuntimeError("boom"))  # type: ignore[attr-defined]
    parser._legacy_parse_skills = lambda _text, _allowed: {  # type: ignore[attr-defined]
        "skills": [{"name": "Python", "level": 2}]
    }

    out = parser.parse_skills("Резюме...", [{"Навык": "Python"}])
    assert out["used_fallback"] is True
    assert out["skills"] == [{"name": "Python", "level": 2}]
