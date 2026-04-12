# -*- coding: utf-8 -*-
"""Тесты метрик eval (calibration + verifier)."""

import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_DIR))

from eval import (
    _bootstrap_mean_ci,
    _calc_ece_brier,
    _plan_constraint_violations,
    _run_retrieval_ablation,
)


def test_calc_ece_brier_returns_valid_values():
    confidences = [0.9, 0.8, 0.7, 0.2, 0.4, 0.6]
    labels = [1, 1, 0, 0, 0, 1]
    ece, brier = _calc_ece_brier(confidences, labels, bins=5)
    assert 0.0 <= ece <= 1.0
    assert 0.0 <= brier <= 1.0


def test_plan_constraint_violations_detects_courses():
    plan = "Рекомендую курс на Coursera за $99 и тренинг по SQL."
    violations = _plan_constraint_violations(plan)
    assert violations >= 1


def test_bootstrap_mean_ci_has_ordered_bounds():
    values = [0.2, 0.4, 0.6, 0.8]
    out = _bootstrap_mean_ci(values, iterations=100, alpha=0.1)
    assert out["ci_low"] <= out["mean"] <= out["ci_high"]


def test_run_retrieval_ablation_returns_modes(monkeypatch):
    class DummyParser:
        def _extract_raw_skills(self, _resume_text, **_kwargs):
            return ["python", "sql"]

    monkeypatch.setattr(
        "rag_service.get_skills_v2_candidates",
        lambda raw, top_k=1, retrieval_mode=None: (
            [{"name": "Python"}] if retrieval_mode == "dense_only" and raw == "python" else
            ([{"name": "SQL, YQL"}] if retrieval_mode == "lexical_only" and raw == "sql" else
             [{"name": "Python"}, {"name": "SQL, YQL"}][:top_k])
        ),
    )

    dummy_data = [{"resume_text": "x", "expected_skills": ["Python", "SQL, YQL"]}]
    out = _run_retrieval_ablation(dataset=dummy_data, parser=DummyParser(), data_loader=None)
    assert "dense_only" in out and "lexical_only" in out and "hybrid_rerank" in out
