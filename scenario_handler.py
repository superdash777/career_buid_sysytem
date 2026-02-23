class ScenarioHandler:
    def __init__(self, data_loader):
        self.data = data_loader

    def next_grade(self, current_role, current_grade, user_skills):
        """Сценарий: Переход на следующий грейд"""
        grade_sequence = {
            "Junior": "Middle",
            "Middle": "Senior",
            "Senior": "Lead",
            "Lead": "Expert",
            "Expert": "Expert"
        }
        target_grade = grade_sequence.get(current_grade, "Senior")
        target_reqs = self.data.get_role_requirements(current_role, target_grade)
        return target_reqs, f"{current_role} ({target_grade})"

    def change_profession(self, target_role, user_skills):
        """Сценарий: Смена профессии."""
        target_reqs = self.data.get_role_requirements(target_role, "Middle")
        return target_reqs, f"{target_role} (Transition)"

    def explore_opportunities(self, user_skills):
        """Сценарий: Исследование возможностей с нормализацией навыков."""
        try:
            from gap_analyzer import _normalize_skill_set
            norm = _normalize_skill_set(user_skills)
        except Exception:
            norm = user_skills

        opportunities = []
        for role_display in self.data.get_all_roles():
            internal = self.data.get_internal_role_name(role_display)
            if not internal:
                continue
            for grade in ["Junior", "Middle", "Senior"]:
                requirements = self.data.get_role_requirements(internal, grade)
                if not requirements:
                    continue
                skill_reqs = {k: v for k, v in requirements.items() if k not in self.data.atlas_map}
                if not skill_reqs:
                    continue
                overlap = sum(1 for s, req in skill_reqs.items()
                              if s in norm and norm[s] >= req)
                total = len(skill_reqs)
                score = int((overlap / total) * 100) if total else 0
                opportunities.append({
                    "role": f"{role_display} ({grade})",
                    "match": score,
                    "internal_role": internal,
                })
        return sorted(opportunities, key=lambda x: (-x["match"], x["role"]))[:30]
