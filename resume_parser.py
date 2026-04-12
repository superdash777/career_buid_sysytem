


from openai import OpenAI
from pypdf import PdfReader
import json
from config import Config
from pydantic import BaseModel, ValidationError, Field
from typing import Dict, List, Optional, Any

from rag_service import get_skills_v2_candidates
from llm_observability import LLMCallMetrics, log_llm_call


class _ExtractSkillsResponse(BaseModel):
    skills: List[str] = Field(default_factory=list)


class _RerankResponse(BaseModel):
    match: str = ""
    confidence: Optional[float] = None


class _UnknownSkillResponse(BaseModel):
    is_skill: bool = False
    confidence: Optional[float] = None


class _LevelResponse(BaseModel):
    level: int = 1
    evidence: str = ""

class ResumeParser:
    def __init__(self):
        self._api_key = Config.OPENAI_API_KEY
        self.client = OpenAI(api_key=self._api_key) if self._api_key else None

    def extract_text(self, pdf_path):
        if pdf_path is None:
            return ""
        # Gradio может передать путь (str) или объект с атрибутом name
        path = getattr(pdf_path, "name", pdf_path)
        if isinstance(path, bytes):
            path = path.decode("utf-8")
        text = ""
        reader = PdfReader(path)
        for page in reader.pages:
            text += page.extract_text() + "\n"
        max_len = getattr(Config, "RESUME_TEXT_MAX_CHARS", 14000)
        if len(text) > max_len:
            text = text[:max_len] + "\n\n[Текст обрезан. Извлеки навыки из приведённой части.]"
        return text

    def _validate_payload(self, schema_cls: Any, payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            model = schema_cls(**(payload or {}))
            return model.model_dump()
        except ValidationError:
            return schema_cls().model_dump()

    def _run_json_chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int = 1800,
        operation: str = "generic_json_chat",
        schema_cls: Optional[Any] = None,
        request_id: Optional[str] = None,
    ) -> Dict:
        model = getattr(Config, "RESUME_PARSER_MODEL", "gpt-4o")
        prompt_chars = sum(len(m.get("content", "")) for m in messages)
        start_ms = None
        if Config.LLM_OBSERVABILITY_ENABLED:
            import time as _time
            start_ms = int(_time.time() * 1000)
        last_error = None
        for _attempt in range(2):
            try:
                response = self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                raw = response.choices[0].message.content
                payload = json.loads(raw)
                if schema_cls is not None:
                    payload = self._validate_payload(schema_cls, payload)
                if Config.LLM_OBSERVABILITY_ENABLED:
                    import time as _time
                    latency = int(_time.time() * 1000) - int(start_ms or 0)
                    log_llm_call(
                        LLMCallMetrics(
                            component="resume_parser",
                            operation=operation,
                            model=model,
                            request_id=request_id,
                            success=True,
                            latency_ms=latency,
                            prompt_chars=prompt_chars,
                            completion_chars=len(raw or ""),
                        )
                    )
                return payload
            except Exception as e:
                last_error = e
                continue
        if Config.LLM_OBSERVABILITY_ENABLED:
            import time as _time
            latency = int(_time.time() * 1000) - int(start_ms or 0)
            log_llm_call(
                LLMCallMetrics(
                    component="resume_parser",
                    operation=operation,
                    model=model,
                    request_id=request_id,
                    success=False,
                    latency_ms=latency,
                    prompt_chars=prompt_chars,
                    completion_chars=0,
                    error=str(last_error),
                )
            )
        if schema_cls is not None:
            return schema_cls().model_dump()
        return {}

    def _legacy_parse_skills(self, resume_text, allowed_skills):
        """Старый монолитный extraction: extraction+normalization+level одним вызовом."""
        if not self.client:
            raise ValueError(
                "OPENAI_API_KEY не задан. Добавьте ключ в .env для распознавания навыков из PDF."
            )
        model = getattr(Config, "RESUME_PARSER_MODEL", "gpt-4o")
        skills_str = ", ".join(allowed_skills)

        system_prompt = f"""
Ты HR-аналитик. Извлеки навыки из резюме, сопоставь со списком: [{skills_str}].
Оцени уровень 1-3 (1-Junior, 2-Middle, 3-Senior).
Верни только JSON без комментариев: {{"skills": [{{"name": "название навыка", "level": число}}]}}
"""

        for attempt in range(2):
            try:
                response = self.client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": resume_text}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1
                )
                raw = response.choices[0].message.content
                data = json.loads(raw)
                if not isinstance(data, dict) or "skills" not in data:
                    data = {"skills": []}
                if not isinstance(data["skills"], list):
                    data["skills"] = []
                return data
            except json.JSONDecodeError:
                if attempt == 0:
                    system_prompt = "Верни строго JSON: {\"skills\": [{\"name\": \"навык\", \"level\": 1}]}. Без markdown и текста вокруг."
                    continue
                return {"skills": []}
            except Exception:
                if attempt == 1:
                    raise
                import time
                time.sleep(1)
        return {"skills": []}

    def _extract_raw_skills(self, resume_text: str, request_id: Optional[str] = None) -> List[str]:
        """Вызов 1: чистое извлечение навыков без уровней и без нормализации."""
        system_prompt = (
            "Ты — HR-аналитик. Извлеки только навыки из резюме.\n"
            "Отвечай только валидным JSON: {\"skills\": [\"навык 1\", \"навык 2\"]}\n"
            "ПРАВИЛА:\n"
            "- НЕ извлекай должности\n"
            "- НЕ извлекай компании\n"
            "- НЕ извлекай города\n"
            "- НЕ извлекай университеты\n"
            "- НЕ извлекай названия сертификатов и курсов\n"
            "- НЕ извлекай названия продуктов/команд/проектов как навыки\n"
            "- Удали дубликаты\n"
            "- Короткие формулировки навыков"
        )
        few_shot_user = (
            "Резюме: Работал в Яндексе как Senior Product Manager в Москве. "
            "Окончил МГУ. Использовал SQL, проводил A/B тесты, строил дашборды в DataLens."
        )
        few_shot_assistant = "{\"skills\": [\"SQL\", \"A/B тесты\", \"DataLens\"]}"
        result = self._run_json_chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": few_shot_user},
                {"role": "assistant", "content": few_shot_assistant},
                {"role": "user", "content": resume_text},
            ],
            temperature=0.0,
            max_tokens=1200,
            operation="extract_raw_skills",
            schema_cls=_ExtractSkillsResponse,
            request_id=request_id,
        )
        skills = result.get("skills", [])
        if not isinstance(skills, list):
            return []
        clean = []
        seen = set()
        for s in skills:
            name = str(s or "").strip()
            if not name:
                continue
            key = name.lower()
            if key in seen:
                continue
            seen.add(key)
            clean.append(name)
        return clean

    def _llm_rerank_candidate(
        self,
        raw_skill: str,
        candidates: List[Dict[str, float]],
        request_id: Optional[str] = None,
    ) -> Dict[str, Optional[float]]:
        """Вызов 2: LLM re-ranking по top-5 кандидатам из E5."""
        candidate_names = [c.get("name", "") for c in candidates if c.get("name")]
        if not candidate_names:
            return {"match": None, "confidence": None}

        rich_candidates = []
        for c in candidates[:5]:
            rich_candidates.append(
                {
                    "name": c.get("name"),
                    "score": c.get("score"),
                    "dense_score": c.get("dense_score"),
                    "lexical_score": c.get("lexical_score"),
                }
            )

        prompt = (
            f"Навык пользователя: {raw_skill}\n"
            f"Кандидаты: {json.dumps(rich_candidates, ensure_ascii=False)}\n\n"
            "Выбери лучший вариант из списка или ответь none.\n"
            "Верни только JSON: {\"match\": \"название или none\", \"confidence\": число от 0 до 1}."
        )
        result = self._run_json_chat(
            messages=[
                {"role": "system", "content": "Отвечай только валидным JSON. Никакого markdown."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.0,
            max_tokens=300,
            operation="llm_rerank_candidate",
            schema_cls=_RerankResponse,
            request_id=request_id,
        )
        match = str(result.get("match", "")).strip()
        if match.lower() == "none":
            match = ""
        confidence = result.get("confidence")
        try:
            confidence = float(confidence) if confidence is not None else None
        except Exception:
            confidence = None
        return {"match": (match or None), "confidence": confidence}

    @staticmethod
    def _extract_resume_evidence(raw_skill: str, resume_text: str, max_len: int = 220) -> str:
        """
        Возвращает короткий фрагмент резюме вокруг найденного raw_skill.
        Если точного вхождения нет — fallback на начало резюме.
        """
        text = (resume_text or "").strip()
        needle = (raw_skill or "").strip()
        if not text:
            return ""
        if not needle:
            return text[:max_len]
        lower_text = text.lower()
        lower_needle = needle.lower()
        idx = lower_text.find(lower_needle)
        if idx < 0:
            return text[:max_len]
        start = max(0, idx - max_len // 3)
        end = min(len(text), idx + len(needle) + (2 * max_len // 3))
        snippet = text[start:end].strip()
        return snippet[:max_len]

    def _classify_unknown_skill(self, raw_skill: str, resume_text: str, request_id: Optional[str] = None) -> Dict[str, Optional[float]]:
        """LLM-классификация неизвестного навыка: это действительно навык или шум."""
        prompt = (
            f"Фраза из резюме: {raw_skill}\n\n"
            "Определи, является ли это навыком.\n"
            "Верни JSON: {\"is_skill\": true/false, \"confidence\": число от 0 до 1}.\n"
            "Не относить к навыкам: должности, компании, города, университеты."
        )
        result = self._run_json_chat(
            messages=[
                {"role": "system", "content": "Отвечай строго валидным JSON без пояснений."},
                {"role": "user", "content": f"{prompt}\n\nКонтекст резюме:\n{resume_text[:1500]}"},
            ],
            temperature=0.0,
            max_tokens=250,
            operation="classify_unknown_skill",
            schema_cls=_UnknownSkillResponse,
            request_id=request_id,
        )
        is_skill = bool(result.get("is_skill"))
        confidence = result.get("confidence")
        try:
            confidence = float(confidence) if confidence is not None else None
        except Exception:
            confidence = None
        return {"is_skill": is_skill, "confidence": confidence}

    def _assess_level(
        self,
        canonical_skill: str,
        resume_text: str,
        skill_levels: Dict[str, str],
        request_id: Optional[str] = None,
    ) -> Dict[str, Optional[str]]:
        """Вызов 3: оценка уровня (0..3) с цитатой-доказательством."""
        prompt = (
            f"Навык: {canonical_skill}\n\n"
            "Определи уровень по шкале:\n"
            f"- Basic: {skill_levels.get('basic', '')}\n"
            f"- Proficiency: {skill_levels.get('proficiency', '')}\n"
            f"- Advanced: {skill_levels.get('advanced', '')}\n\n"
            "Фрагмент резюме:\n"
            f"{resume_text[:4000]}\n\n"
            "Верни JSON: {\"level\": число 0..3, \"evidence\": \"короткая цитата из резюме\"}."
        )
        result = self._run_json_chat(
            messages=[
                {"role": "system", "content": "Отвечай только JSON. Уровень строго 0..3."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.0,
            max_tokens=400,
            operation="assess_level",
            schema_cls=_LevelResponse,
            request_id=request_id,
        )
        level = result.get("level")
        try:
            level = int(level)
        except Exception:
            level = 1
        level = max(0, min(3, level))
        evidence = str(result.get("evidence", "")).strip()
        return {"level": level, "evidence": evidence}

    @staticmethod
    def _skill_level_texts(allowed_skills: List[Dict], canonical_name: str) -> Dict[str, str]:
        for item in allowed_skills:
            name = (item.get("Навык") or item.get("name") or "").strip()
            if name != canonical_name:
                continue
            return {
                "basic": (
                    item.get("Skill level \\\\ Индикатор - Basic")
                    or item.get("Skill level \\ Индикатор - Basic")
                    or ""
                ),
                "proficiency": (
                    item.get("Skill level \\\\ Индикатор - Proficiency")
                    or item.get("Skill level \\ Индикатор - Proficiency")
                    or ""
                ),
                "advanced": (
                    item.get("Skill level \\\\ Индикатор - Advanced")
                    or item.get("Skill level \\ Индикатор - Advanced")
                    or ""
                ),
            }
        return {"basic": "", "proficiency": "", "advanced": ""}

    def parse_skills_v2(
        self,
        resume_text: str,
        allowed_skills: List[Dict],
        request_id: Optional[str] = None,
        retrieval_mode: Optional[str] = None,
    ) -> Dict:
        """Новый pipeline: extraction -> normalization/rerank -> level assessment."""
        raw_skills = self._extract_raw_skills(resume_text, request_id=request_id)
        if not raw_skills:
            return {"skills": [], "used_fallback": False}

        result_skills = []
        for raw_skill in raw_skills:
            candidates = get_skills_v2_candidates(raw_skill, top_k=5, retrieval_mode=retrieval_mode)
            rerank = self._llm_rerank_candidate(raw_skill, candidates, request_id=request_id)
            matched_name = rerank.get("match")
            llm_conf = rerank.get("confidence")

            if not matched_name and candidates:
                matched_name = candidates[0].get("name")
            if not matched_name:
                unknown = self._classify_unknown_skill(raw_skill, resume_text, request_id=request_id)
                if not unknown.get("is_skill"):
                    continue
                evidence_quote = self._extract_resume_evidence(raw_skill, resume_text)
                result_skills.append(
                    {
                        "raw_name": raw_skill,
                        "name": raw_skill,
                        "level": 1,
                        "evidence": evidence_quote,
                        "resume_evidence_span": evidence_quote,
                        "llm_rerank_confidence": unknown.get("confidence"),
                        "candidates": [],
                        "is_unknown": True,
                        "source_skill_id": None,
                        "retrieval_mode": "llm_unknown",
                        "retrieval_trace": {"candidates": []},
                    }
                )
                continue

            levels = self._skill_level_texts(allowed_skills, matched_name)
            level_info = self._assess_level(matched_name, resume_text, levels, request_id=request_id)
            evidence_quote = (level_info.get("evidence") or "").strip() or self._extract_resume_evidence(raw_skill, resume_text)
            result_skills.append(
                {
                    "raw_name": raw_skill,
                    "name": matched_name,
                    "level": level_info.get("level", 1),
                    "evidence": evidence_quote,
                    "resume_evidence_span": evidence_quote,
                    "llm_rerank_confidence": llm_conf,
                    "candidates": candidates[:5],
                    "source_skill_id": matched_name,
                    "retrieval_mode": "hybrid_dense_lexical",
                    "retrieval_trace": {
                        "candidates": [
                            {
                                "name": c.get("name"),
                                "score": c.get("score"),
                                "dense_score": c.get("dense_score"),
                                "lexical_score": c.get("lexical_score"),
                            }
                            for c in candidates[:5]
                        ]
                    },
                }
            )

        # Deduplicate by canonical skill, keeping the highest level
        dedup = {}
        for s in result_skills:
            key = s["name"]
            cur = dedup.get(key)
            if not cur or int(s.get("level", 0)) > int(cur.get("level", 0)):
                dedup[key] = s
        return {"skills": list(dedup.values()), "used_fallback": False}

    def parse_skills(
        self,
        resume_text,
        allowed_skills,
        request_id: Optional[str] = None,
        retrieval_mode: Optional[str] = None,
    ):
        """Совместимый интерфейс: сначала v2, при ошибке — legacy fallback."""
        if not self.client:
            raise ValueError(
                "OPENAI_API_KEY не задан. Добавьте ключ в .env для распознавания навыков из PDF."
            )

        try:
            return self.parse_skills_v2(
                resume_text,
                allowed_skills,
                request_id=request_id,
                retrieval_mode=retrieval_mode,
            )
        except Exception:
            legacy = self._legacy_parse_skills(
                resume_text,
                [s.get("Навык") or s.get("name") for s in allowed_skills],
            )
            return {"skills": legacy.get("skills", []), "used_fallback": True}
