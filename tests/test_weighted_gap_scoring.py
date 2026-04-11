# -*- coding: utf-8 -*-
"""Тесты для weighted gap scoring в GapAnalyzer."""

import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_DIR))

from gap_analyzer import GapAnalyzer


def test_weighted_match_uses_skill_weights(monkeypatch):
    class FakeLoader:
        def get_skill_weight(self, skill_name):
            return {"Python": 1, "SQL, YQL": 3}.get(skill_name, 1)

    monkeypatch.setattr("data_loader.DataLoader", lambda: FakeLoader())

    user_skills = {
        "Python": 2,
        "SQL, YQL": 1,
        "Автономность": 3,
    }
    target_requirements = {
        "Python": 2,
        "SQL, YQL": 2,
        "Автономность": 3,
    }
    atlas_params = ["Автономность"]

    result = GapAnalyzer.analyze_structured(
        user_skills,
        target_requirements,
        atlas_params,
        atlas_map={"Автономность": {"Описание": "Тест"}},
    )

    # legacy: 2 strong из 3 total -> 66%
    assert result["match_percent_legacy"] == 66
    # weighted (skills only): matched=1, required=1+3=4 -> 25%
    assert result["weighted_match_percent"] == 25
    assert result["match_percent"] == 25


def test_weighted_match_fallbacks_to_legacy_when_no_skill_reqs():
    result = GapAnalyzer.analyze_structured(
        user_skills={"Автономность": 2},
        target_requirements={"Автономность": 3},
        atlas_param_names=["Автономность"],
        atlas_map={"Автономность": {"Описание": "Тест"}},
    )
    assert result["weighted_match_percent"] == result["match_percent_legacy"]
