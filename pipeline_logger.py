"""Structured pipeline logging for Career Copilot."""

import json
import logging
import time
from uuid import uuid4

logger = logging.getLogger("career_copilot.pipeline")


class PipelineLogger:
    def __init__(self, user_id: str, request_id: str | None = None):
        self.user_id = user_id
        self.request_id = request_id or str(uuid4())
        self.start_time = time.time()
        self.events: list[dict] = []

    def log_skill_mapping(self, raw_skill: str, result: dict) -> None:
        event = {
            "event": "skill_mapping",
            "raw_skill": raw_skill,
            "canonical": result.get("canonical_name"),
            "confidence": result.get("confidence"),
            "source": result.get("source"),
            "matched": result.get("canonical_name") is not None,
        }
        self.events.append(event)

        if not result.get("canonical_name"):
            logger.warning(json.dumps({
                "type": "skill_not_matched",
                "raw_skill": raw_skill,
                "user_id": self.user_id,
                "request_id": self.request_id,
            }, ensure_ascii=False))

    def log_gap_analysis(self, match_percent: float, critical_count: int, moderate_count: int) -> None:
        logger.info(json.dumps({
            "event": "gap_analysis_complete",
            "user_id": self.user_id,
            "request_id": self.request_id,
            "match_percent": match_percent,
            "critical_gaps": critical_count,
            "moderate_gaps": moderate_count,
            "latency_ms": round((time.time() - self.start_time) * 1000),
        }, ensure_ascii=False))

    def log_plan_generation(self, skills_requested: int, skills_in_response: int, success: bool) -> None:
        completeness = skills_in_response / skills_requested if skills_requested > 0 else 0
        logger.info(json.dumps({
            "event": "plan_generation",
            "user_id": self.user_id,
            "request_id": self.request_id,
            "skills_requested": skills_requested,
            "skills_in_response": skills_in_response,
            "completeness": round(completeness, 2),
            "success": success,
            "total_latency_ms": round((time.time() - self.start_time) * 1000),
        }, ensure_ascii=False))

    def summary(self) -> dict:
        matched = sum(1 for e in self.events if e.get("matched"))
        total = len(self.events)
        return {
            "request_id": self.request_id,
            "user_id": self.user_id,
            "skills_total": total,
            "skills_matched": matched,
            "skills_unmatched": total - matched,
            "match_rate": round(matched / total, 2) if total > 0 else 0,
            "total_latency_ms": round((time.time() - self.start_time) * 1000),
        }
