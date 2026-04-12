# -*- coding: utf-8 -*-
"""Тесты auth config aliases и TTL-параметров."""

import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_DIR))

from config import Config


def test_jwt_aliases_exist_and_are_consistent():
    assert isinstance(Config.JWT_SECRET, str)
    assert isinstance(Config.JWT_SECRET_KEY, str)
    assert Config.JWT_SECRET_KEY
    assert Config.JWT_SECRET
    assert Config.JWT_ALGORITHM
    assert Config.JWT_ACCESS_TOKEN_TTL_MINUTES > 0
    assert Config.JWT_REFRESH_TOKEN_TTL_MINUTES > 0
    assert Config.JWT_REFRESH_EXPIRE_MINUTES > 0
