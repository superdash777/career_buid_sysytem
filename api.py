# -*- coding: utf-8 -*-
"""
REST API для AI Career Pathfinder (для подключения отдельного фронтенда).
Запуск: uvicorn api:app --reload --host 127.0.0.1 --port 8000
"""

import os
import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))
if os.getcwd() != str(PROJECT_DIR):
    os.chdir(PROJECT_DIR)

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

# Инициализация модулей (как в main)
from data_loader import DataLoader
from resume_parser import ResumeParser
from gap_analyzer import GapAnalyzer
from scenario_handler import ScenarioHandler
from output_formatter import OutputFormatter

data = DataLoader()
parser = ResumeParser()
analyzer = GapAnalyzer()
scenarios = ScenarioHandler(data)
formatter = OutputFormatter(data)

GRADE_MAP = {
    "Младший (Junior)": "Junior",
    "Специалист (Middle)": "Middle",
    "Старший (Senior)": "Senior",
    "Ведущий (Lead)": "Lead",
    "Эксперт (Expert)": "Expert",
}

app = FastAPI(title="AI Career Pathfinder API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/professions")
def get_professions():
    """Список профессий для выбора."""
    try:
        return {"professions": data.get_all_roles()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/skills-for-role")
def get_skills_for_role(profession: str):
    """Навыки скиллсета для данной профессии."""
    if not profession:
        return {"skills": []}
    return {"skills": data.get_skills_for_role(profession)}


@app.get("/api/suggest-skills")
def suggest_skills(q: str = ""):
    """Подсказки навыков по строке (синонимы + RAG)."""
    if not q or len(q.strip()) < 2:
        return {"suggestions": []}
    suggestions = []
    try:
        from skill_normalizer import resolve_to_canonical, get_canonical_skills_set
        canonical_set = get_canonical_skills_set()
        by_syn = resolve_to_canonical(q.strip(), canonical_set)
        if by_syn:
            suggestions.append(by_syn)
    except Exception:
        pass
    try:
        from rag_service import suggest_skills as rag_suggest
        for s in rag_suggest(q.strip()):
            if s and s not in suggestions:
                suggestions.append(s)
    except Exception:
        pass
    return {"suggestions": suggestions[:8]}


@app.post("/api/analyze-resume")
async def analyze_resume(file: UploadFile = File(...)):
    """Загрузка PDF, извлечение навыков. Возвращает список [{name, level}]."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Нужен PDF файл")
    if not parser.client:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY не задан")
    try:
        contents = await file.read()
        tmp = Path(PROJECT_DIR) / "_tmp_resume.pdf"
        tmp.write_bytes(contents)
        try:
            text = parser.extract_text(tmp)
            if not text or not text.strip():
                return {"skills": [], "error": "Не удалось извлечь текст из PDF"}
            skills_list = list(data.skills_map.keys())
            result = parser.parse_skills(text, skills_list)
            try:
                from rag_service import map_to_canonical_skill
                for s in result.get("skills", []):
                    can = map_to_canonical_skill(s.get("name") or "")
                    if can:
                        s["name"] = can
            except Exception:
                pass
            level_mapping = {1: 1, 2: 1.5, 3: 2}
            out = [{"name": s.get("name", ""), "level": level_mapping.get(s.get("level"), 1)} for s in result.get("skills", [])]
            return {"skills": out}
        finally:
            if tmp.exists():
                tmp.unlink(missing_ok=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class PlanRequest(BaseModel):
    profession: str
    grade: str  # ключ из GRADE_MAP, например "Специалист (Middle)"
    skills: List[dict]  # [{"name": str, "level": float}]
    scenario: str  # "Следующий грейд" | "Смена профессии" | "Исследование возможностей"
    target_profession: Optional[str] = None


def _skills_table_to_user_skills(skills: List[dict]) -> dict:
    user_skills = {}
    for item in skills:
        name = (item.get("name") or "").strip()
        if not name or name == "Навык" or name.startswith("⚠️"):
            continue
        try:
            level = float(item.get("level", 1))
        except (TypeError, ValueError):
            continue
        if level != level:
            continue
        if level < 1:
            internal_level = 0
        elif level == 1:
            internal_level = 1
        elif level == 1.5:
            internal_level = 2
        else:
            internal_level = 3
        user_skills[name] = internal_level
    return user_skills


def _dedupe_opportunities(opportunities):
    by_internal = {}
    for opp in opportunities:
        internal = opp.get("internal_role")
        if not internal:
            continue
        cur = (opp.get("semantic_score", 0), opp.get("match", 0))
        if internal not in by_internal or cur > (by_internal[internal].get("semantic_score", 0), by_internal[internal].get("match", 0)):
            by_internal[internal] = dict(opp)
    result = list(by_internal.values())
    result.sort(key=lambda x: (-x.get("semantic_score", 0), -x.get("match", 0)))
    for o in result:
        if " (" in o.get("role", ""):
            o["role"] = o["role"].split(" (")[0].strip()
    return result[:30]


def _build_role_matches(opps, user_skills):
    from explore_recommendations import RoleMatch
    try:
        from rag_service import get_rag_why_role_bullets
    except Exception:
        get_rag_why_role_bullets = lambda u, r, **kw: []
    matches = []
    for opp in opps:
        role_title = opp.get("role", "")
        internal = opp.get("internal_role")
        reqs = data.get_role_requirements(internal, "Middle") if internal else {}
        skill_keys = [k for k in reqs.keys() if k not in data.atlas_map]
        matched = [{"name": s} for s in user_skills if s in reqs][:5]
        missing = [{"name": s} for s in skill_keys if s not in user_skills][:3]
        why = get_rag_why_role_bullets(user_skills, role_title, top_k=5)
        score = (opp.get("match", 0) or 0) / 100.0
        matches.append(RoleMatch(
            role_title=role_title,
            match_score=score,
            why_match=why,
            matched_skills=matched,
            key_skills=skill_keys[:8],
            missing_skills=missing,
            internal_role=internal,
        ))
    return matches


@app.post("/api/plan")
def build_plan_api(req: PlanRequest):
    """Построение плана. Возвращает { markdown, role_titles? }."""
    if not req.skills:
        raise HTTPException(status_code=400, detail="Добавьте хотя бы один навык")
    if not req.profession:
        raise HTTPException(status_code=400, detail="Выберите профессию")
    if req.scenario == "Смена профессии" and not req.target_profession:
        raise HTTPException(status_code=400, detail="Выберите целевую профессию")

    skills_table = [[s.get("name"), s.get("level", 1)] for s in req.skills]
    user_skills = _skills_table_to_user_skills(req.skills)
    if not user_skills:
        raise HTTPException(status_code=400, detail="В списке нет корректных навыков")

    grade_key = GRADE_MAP.get(req.grade, "Middle")
    atlas_param_names = list(data.atlas_map.keys())
    role_titles = []

    try:
        if req.scenario == "Следующий грейд":
            profession_internal = data.get_internal_role_name(req.profession)
            reqs, role_name = scenarios.next_grade(profession_internal, grade_key, user_skills)
            structured = analyzer.analyze_structured(
                user_skills, reqs, atlas_param_names, data.atlas_map
            )
            grade_sequence = ["Junior", "Middle", "Senior", "Lead", "Expert"]
            current_index = grade_sequence.index(grade_key) if grade_key in grade_sequence else 1
            next_index = min(current_index + 1, len(grade_sequence) - 1)
            target_grade = grade_sequence[next_index]
            md = formatter.format_next_grade(
                structured, role_name, req.profession,
                current_grade=grade_key, target_grade=target_grade, profession_internal=profession_internal,
            )

        elif req.scenario == "Смена профессии":
            target_internal = data.get_internal_role_name(req.target_profession)
            try:
                from switch_profession_service import build_switch_comparison
                switch_vm = build_switch_comparison(user_skills, target_internal, "Middle", data)
                role_name = f"{req.target_profession} ({switch_vm.baseline_level} → Middle)"
                md = formatter.format_change_profession(switch_vm, role_name, req.target_profession)
            except Exception:
                reqs, role_name = scenarios.change_profession(target_internal, user_skills)
                structured = analyzer.analyze_structured(
                    user_skills, reqs, atlas_param_names, data.atlas_map
                )
                md = formatter.format_change_profession_legacy(structured, role_name, req.target_profession)

        else:
            opps = scenarios.explore_opportunities(user_skills)
            try:
                from rag_service import rank_opportunities
                opps = rank_opportunities(user_skills, opps, data)
            except Exception:
                pass
            opps = _dedupe_opportunities(opps)
            matches = _build_role_matches(opps, user_skills)
            from explore_recommendations import build_explore_recommendations
            view_model = build_explore_recommendations(matches)
            role_titles = [c.title for c in view_model.closest + view_model.adjacent + view_model.far]
            md = formatter.format_explore(view_model, user_skills)

        out = {"markdown": md}
        if role_titles:
            out["role_titles"] = role_titles
        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
