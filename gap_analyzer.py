# -*- coding: utf-8 -*-
"""Анализ разрывов: атлас-параметры и навыки с нормализацией."""

LEVEL_NAMES = {0: "Нет", 1: "Базовый", 2: "Продвинутый", 3: "Эксперт"}


def _normalize_skill_set(user_skills: dict, canonical_set: set = None) -> dict:
    """Нормализует ключи user_skills через skill_normalizer, если доступен."""
    if not user_skills:
        return {}
    try:
        from skill_normalizer import resolve_to_canonical, get_canonical_skills_set
        if canonical_set is None:
            canonical_set = get_canonical_skills_set()
        normalized = {}
        for name, level in user_skills.items():
            canonical = resolve_to_canonical(name, canonical_set)
            key = canonical if canonical else name
            if key not in normalized or level > normalized[key]:
                normalized[key] = level
        return normalized
    except Exception:
        return dict(user_skills)


class GapAnalyzer:
    @staticmethod
    def analyze(user_skills, target_requirements):
        """Классический формат (обратная совместимость) с нормализацией."""
        norm = _normalize_skill_set(user_skills)
        missing = []
        gaps = []
        strong = []

        for skill, req_level in target_requirements.items():
            curr_level = norm.get(skill, 0)
            if curr_level == 0:
                missing.append((skill, req_level))
            elif curr_level < req_level:
                gaps.append((skill, curr_level, req_level))
            else:
                strong.append((skill, curr_level))

        match_percent = int((len(strong) / len(target_requirements)) * 100) if target_requirements else 0
        return {
            "match_percent": match_percent,
            "missing": missing,
            "gaps": gaps,
            "strong": strong,
        }

    @staticmethod
    def analyze_structured(user_skills, target_requirements, atlas_param_names, atlas_map):
        """Разделение на разрывы по параметрам атласа и по навыкам с нормализацией."""
        norm = _normalize_skill_set(user_skills)

        atlas_gaps = []
        atlas_strong = []
        skill_gaps = []
        skill_strong = []

        for name, req_level in target_requirements.items():
            curr = norm.get(name, 0)
            delta = req_level - curr
            is_atlas = name in atlas_param_names

            if curr >= req_level:
                if is_atlas:
                    atlas_strong.append({"name": name, "level": curr})
                else:
                    skill_strong.append({"name": name, "level": curr})
            else:
                why = ""
                if is_atlas and name in atlas_map:
                    desc = (atlas_map[name].get("Описание") or atlas_map[name].get("Description") or "")
                    why = desc or "Важно для целевого грейда."
                item = {
                    "name": name,
                    "current": curr,
                    "required": req_level,
                    "delta": delta,
                    "priority": 1 if delta >= 2 else (2 if delta >= 1 else 3),
                }
                if is_atlas:
                    item["why"] = why or "Важно для целевого грейда."
                    atlas_gaps.append(item)
                else:
                    skill_gaps.append(item)

        atlas_gaps.sort(key=lambda x: (-x["delta"], x["name"]))
        skill_gaps.sort(key=lambda x: (-x["delta"], x["name"]))

        total = len(target_requirements)
        strong_count = len(atlas_strong) + len(skill_strong)
        match_percent = int((strong_count / total) * 100) if total else 0

        return {
            "match_percent": match_percent,
            "atlas_gaps": atlas_gaps,
            "atlas_strong": atlas_strong,
            "skill_gaps": skill_gaps,
            "skill_strong": skill_strong,
            "missing": [(g["name"], g["required"]) for g in atlas_gaps + skill_gaps if g["current"] == 0],
            "gaps": [(g["name"], g["current"], g["required"]) for g in atlas_gaps + skill_gaps if g["current"] > 0],
            "strong": [(s["name"], s["level"]) for s in atlas_strong + skill_strong],
        }
