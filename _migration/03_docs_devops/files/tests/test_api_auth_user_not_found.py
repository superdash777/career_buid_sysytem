# -*- coding: utf-8 -*-
"""401 «пользователь не найден» возвращает структурированный detail с code USER_NOT_FOUND."""

import sys
import uuid
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

PROJECT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_DIR))

import api as api_mod  # noqa: E402


def test_get_current_user_returns_structured_user_not_found():
    fake_id = str(uuid.uuid4())
    token = api_mod._create_access_token(user_id=fake_id, email="ghost@example.com")
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    with patch.object(api_mod, "_get_user_by_id", return_value=None):
        with pytest.raises(HTTPException) as exc_info:
            api_mod._get_current_user(credentials=creds)
    assert exc_info.value.status_code == 401
    detail = exc_info.value.detail
    assert isinstance(detail, dict)
    assert detail.get("code") == "USER_NOT_FOUND"
    assert isinstance(detail.get("message"), str)
