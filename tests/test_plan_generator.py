# -*- coding: utf-8 -*-
"""Тесты для policy/контекста PlanGenerator."""

import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_DIR))

from plan_generator import PlanGenerator


def test_context_block_respects_max_budget():
    gen = PlanGenerator()
    block = gen._build_context_block(  # type: ignore[attr-defined]
        step1_markdown="A" * 2000,
        context="B" * 1200,
        rag_context="C" * 1200,
        skill_context="D" * 1200,
        strong_skills=["Python", "SQL", "DataLens"],
        gap_summary={"skill_gaps": [{"name": "Python", "delta": 2}]},
        max_chars=4000,
    )
    assert block
    assert len(block) <= 4000
    assert "[СТРУКТУРИРОВАННЫЙ_GAP_JSON]" in block
    assert "[ОПИСАНИЯ_НАВЫКОВ]" in block


def test_normalize_focused_json_fills_missing_fields():
    raw = {"tasks": [{"skill": "Python", "items": []}], "communication": [], "learning": []}
    normalized = PlanGenerator._normalize_focused_json(raw)  # type: ignore[attr-defined]
    assert normalized["tasks"][0]["skill"] == "Python"
    assert normalized["tasks"][0]["items"] == ["Требуется уточнение"]
    assert normalized["communication"] == ["Требуется уточнение"]
    assert normalized["learning"] == ["Требуется уточнение"]
