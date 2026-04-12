"""Минимальная наблюдаемость для LLM-вызовов."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class LLMCallMetrics:
    component: str
    operation: str
    model: str
    request_id: Optional[str]
    success: bool
    latency_ms: int
    prompt_chars: int
    completion_chars: int
    error: Optional[str] = None


def estimate_tokens_from_text(text: str) -> int:
    # Простая эвристика: ~4 символа на токен
    return max(1, len((text or "").strip()) // 4)


def log_llm_call(metrics: LLMCallMetrics) -> None:
    payload: Dict[str, Any] = {
        "event": "llm_call",
        "component": metrics.component,
        "operation": metrics.operation,
        "model": metrics.model,
        "request_id": metrics.request_id,
        "success": metrics.success,
        "latency_ms": metrics.latency_ms,
        "prompt_chars": metrics.prompt_chars,
        "completion_chars": metrics.completion_chars,
        "prompt_tokens_est": estimate_tokens_from_text("x" * metrics.prompt_chars),
        "completion_tokens_est": estimate_tokens_from_text("x" * metrics.completion_chars),
    }
    if metrics.error:
        payload["error"] = metrics.error
    print(json.dumps(payload, ensure_ascii=False))


def now_ms() -> int:
    return int(time.time() * 1000)
