# -*- coding: utf-8 -*-
"""Тесты rate limiter для auth endpoint-ов."""

import sys
from pathlib import Path

import pytest

PROJECT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_DIR))

from rate_limiter import check_rate_limit_or_raise


def test_rate_limiter_blocks_after_limit():
    key = "unit-test-rate-limit-key"
    check_rate_limit_or_raise(key, limit=2, window_sec=60)
    check_rate_limit_or_raise(key, limit=2, window_sec=60)
    with pytest.raises(Exception):
        check_rate_limit_or_raise(key, limit=2, window_sec=60)
