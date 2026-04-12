# -*- coding: utf-8 -*-
"""Тесты метрик eval (calibration + verifier)."""

import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_DIR))

from eval import _calc_ece_brier, _plan_constraint_violations


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
