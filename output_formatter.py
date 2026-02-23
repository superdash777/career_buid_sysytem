# -*- coding: utf-8 -*-
"""Форматирование ответа: шаг 1 (диагностика) и шаг 2 (план)."""

from gap_analyzer import LEVEL_NAMES


def _build_skill_context(data_loader, skill_gaps, grade):
    """Собирает описания уровней + примеры задач для навыков из gap-списка."""
    parts = []
    for g in skill_gaps[:15]:
        detail = data_loader.get_skill_detail(g["name"], grade)
        if not detail:
            continue
        block = f"[Навык: {g['name']}] Требуемый уровень: {detail['level_key']}"
        if detail["description"]:
            block += f"\nОписание уровня: {detail['description']}"
        if detail["tasks"]:
            block += f"\nПримеры задач на развитие: {detail['tasks']}"
        parts.append(block)
    return "\n\n".join(parts)


class OutputFormatter:
    def __init__(self, data_loader):
        self.data = data_loader
        self._plan_gen = None

    def _get_plan_generator(self):
        if self._plan_gen is None:
            try:
                from plan_generator import PlanGenerator
                self._plan_gen = PlanGenerator()
            except ImportError:
                self._plan_gen = None
        return self._plan_gen

    def format_plan(self, gap_analysis, target_role_name):
        work = gap_analysis.get("missing", []) + [
            (g[0], g[2]) if len(g) == 3 else (g[0], g[1]) for g in gap_analysis.get("gaps", [])
        ]
        out = f"# План развития: {target_role_name}\n\n"
        out += f"Совпадение профиля: {gap_analysis.get('match_percent', 0)}%\n\n"
        if work:
            out += "## Зона роста\n\n"
            for item in work:
                out += f"- {item[0]} → целевой уровень {item[1]}\n"
        if gap_analysis.get("strong"):
            out += "\n## Сильные стороны\n\n"
            for s, lvl in gap_analysis["strong"]:
                out += f"- {s} (уровень {lvl})\n"
        return out

    def format_next_grade(self, structured, target_role_name, profession_display,
                          current_grade=None, target_grade=None, profession_internal=None):
        atlas_gaps = structured.get("atlas_gaps", [])
        skill_gaps = structured.get("skill_gaps", [])
        match_percent = structured.get("match_percent", 0)

        all_gaps = sorted(atlas_gaps + skill_gaps, key=lambda x: -x["delta"])
        top_blockers = all_gaps[:5]
        focus_str = ", ".join(b["name"] for b in top_blockers) if top_blockers else "—"

        out = f"# Цель: Перейти на следующий грейд\n\n"
        out += f"**Целевая роль:** {target_role_name}\n\n"
        out += f"**Сводка:** совпадение с целевым профилем — {match_percent}%. Фокус роста: {focus_str}\n\n---\n\n"

        out += "## Шаг 1 — Ожидания уровня и диагностика\n\n"
        out += f"**1. Цель:** целевой грейд — {target_role_name}\n\n"

        cur_grade = current_grade or "Middle"
        tgt_grade = target_grade or "Senior"
        try:
            from next_grade_service import build_next_grade_narrative, build_skill_support, build_next_grade_rag_context
            narrative = build_next_grade_narrative(cur_grade, tgt_grade, self.data.atlas_map)
            out += "**2. Что значит следующий грейд (параметры атласа)**\n\n"
            for pe in narrative.param_expectations:
                desc = pe.get('description', '')
                out += f"- **{pe['param_name']}**: {desc}\n"
                if pe.get("target_text"):
                    out += f"  *Ожидание на целевом уровне:* {pe['target_text']}\n\n"
        except Exception:
            pass

        out += "**3. Разрыв по параметрам (атлас)**\n\n"
        if atlas_gaps:
            try:
                from rag_service import get_rag_explanation_for_gap
                for g in atlas_gaps:
                    curr = LEVEL_NAMES.get(g["current"], str(g["current"]))
                    req = LEVEL_NAMES.get(g["required"], str(g["required"]))
                    out += f"- **{g['name']}** — текущий: {curr}, требуемый: {req}, разрыв: {g['delta']}\n"
                    expl = get_rag_explanation_for_gap(g["name"], is_skill=False)
                    why_text = expl or g.get('why', '—')
                    out += f"  *Из базы:* {why_text}\n\n"
            except Exception:
                for g in atlas_gaps:
                    curr = LEVEL_NAMES.get(g["current"], str(g["current"]))
                    req = LEVEL_NAMES.get(g["required"], str(g["required"]))
                    out += f"- **{g['name']}** — текущий: {curr}, требуемый: {req}, разрыв: {g['delta']}\n"
                    out += f"  *Из базы:* {g.get('why', '—')}\n\n"
        else:
            out += "Нет критичных разрывов по параметрам атласа.\n\n"

        try:
            role_internal = profession_internal or self.data.get_internal_role_name(profession_display)
            priority_params = [g["name"] for g in atlas_gaps[:5]]
            if role_internal and priority_params:
                support = build_skill_support(priority_params, role_internal, tgt_grade, self.data, top_per_param=4)
                out += "**4. Навыки, поддерживающие параметры (из базы)**\n\n"
                for param, skills in support.items():
                    if skills:
                        out += f"- *{param}:* {', '.join(skills[:5])}\n"
                out += "\n"
        except Exception:
            pass

        out += "**5. Разрыв по навыкам**\n\n"
        if skill_gaps:
            for g in skill_gaps[:15]:
                curr = LEVEL_NAMES.get(g["current"], str(g["current"]))
                req = LEVEL_NAMES.get(g["required"], str(g["required"]))
                out += f"- **{g['name']}** — текущий: {curr}, требуемый: {req}\n"
                detail = self.data.get_skill_detail(g["name"], tgt_grade)
                if detail:
                    if detail["description"]:
                        out += f"  *Целевой уровень:* {detail['description']}\n"
                    if detail["tasks"]:
                        out += f"  *Задачи на развитие:* {detail['tasks']}\n"
                out += "\n"
        else:
            out += "Нет критичных разрывов по навыкам.\n\n"

        out += "**6. Сводка**\n\n"
        if top_blockers:
            out += "Фокус: " + ", ".join(b["name"] for b in top_blockers) + ".\n\n"
        out += "---\n\n"

        out += "## Шаг 2 — План развития\n\n"
        gen = self._get_plan_generator()
        if gen and gen.client:
            rag_context = ""
            skill_context = _build_skill_context(self.data, skill_gaps, tgt_grade)
            try:
                role_internal = profession_internal or self.data.get_internal_role_name(profession_display)
                rag_context = build_next_grade_rag_context(
                    atlas_gaps, skill_gaps, tgt_grade, self.data.atlas_map, self.data, role_internal
                )
            except Exception:
                try:
                    from rag_service import get_rag_context_for_plan
                    step1_summary = " ".join([g["name"] for g in atlas_gaps[:5] + skill_gaps[:5]])
                    rag_context = get_rag_context_for_plan(step1_summary, target_role_name)
                except Exception:
                    pass
            step2 = gen.generate_plan_702010(
                "next_grade", out, target_role_name,
                context=f"Профессия: {profession_display}. Используй только параметры и навыки из контекста выше.",
                rag_context=rag_context,
                skill_context=skill_context,
            )
            out += step2
        else:
            out += "*Для генерации персонального плана укажите OPENAI_API_KEY в .env.*\n\n"
            out += "**Развитие через реальные задачи:** задачи из диагностики с фиксацией результата.\n"
            out += "**Взаимодействие и обратная связь:** обратная связь, наставник, калибровки каждые 2–4 недели.\n"
            out += "**Курсы и тренинги:** материалы по недостающим навыкам.\n\n"
            out += "**Чекпоинты:** пересмотр через 4, 8 и 12 недель.\n"

        return out

    def format_change_profession(self, switch_view_model, target_role_name, target_profession_display):
        from switch_profession_service import SwitchViewModel, build_switch_rag_context

        if not isinstance(switch_view_model, SwitchViewModel):
            return self.format_change_profession_legacy(
                switch_view_model, target_role_name, target_profession_display
            )

        vm = switch_view_model
        match_pct = int(vm.match_score * 100)
        focus_names = [m.get("name", "") for m in vm.missing_skills[:5] if m.get("name")]
        focus_str = ", ".join(focus_names) if focus_names else "—"

        out = f"# Цель: Сменить профессию\n\n"
        out += f"**Целевая профессия:** {target_profession_display}\n\n"
        out += f"**Сводка:** совпадение с baseline — {match_pct}%. В приоритете: {focus_str}\n\n"
        out += f"**Уровень для сравнения (baseline):** {vm.baseline_level}\n\n---\n\n"

        out += "## Шаг 1 — Оценка соответствия\n\n"
        out += f"**1. Совпадение:** {match_pct}%\n\n"

        out += "**2. Что уже совпадает:**\n\n"
        for m in vm.matched_skills[:8]:
            snip = (m.get("snippet") or "").strip()
            out += f"- **{m.get('name', '')}**" + (f" — {snip}" if snip else "") + "\n"
        if not vm.matched_skills:
            out += "Пока мало пересечений — фокус на ключевых навыках целевой роли.\n"
        out += "\n"

        out += "**3. Чего не хватает:**\n\n"
        for m in vm.missing_skills[:12]:
            imp = m.get("importance", "")
            out += f"- **{m.get('name', '')}** — {imp}\n"
            detail = self.data.get_skill_detail(m.get("name", ""), "Middle")
            if detail:
                if detail["description"]:
                    out += f"  *Описание уровня:* {detail['description']}\n"
                if detail["tasks"]:
                    out += f"  *Задачи на развитие:* {detail['tasks']}\n"
            expl = (m.get("explanation") or "").strip()
            if expl:
                out += f"  *Из базы:* {expl}\n"
        out += "\n"

        if vm.suggested_tracks:
            out += "**4. Возможные треки:** " + " | ".join(vm.suggested_tracks[:3]) + "\n\n"
        out += "---\n\n"

        out += "## Шаг 2 — План развития\n\n"
        focus_names_for_plan = [m.get("name", "") for m in vm.missing_skills[:7] if m.get("name")]
        gen = self._get_plan_generator()
        if gen and gen.client and focus_names_for_plan:
            try:
                rag_context = build_switch_rag_context(
                    focus_names_for_plan, target_profession_display, vm.baseline_level, self.data,
                )
            except Exception:
                rag_context = ""
            skill_context = _build_skill_context(
                self.data,
                [{"name": n, "delta": 1} for n in focus_names_for_plan],
                "Middle",
            )
            step2 = gen.generate_plan_702010(
                "change_profession", out, target_role_name,
                context="Используй только навыки из контекста. Сфокусируй план на недостающих навыках.",
                rag_context=rag_context,
                skill_context=skill_context,
            )
            out += step2
        else:
            out += "*Укажите OPENAI_API_KEY для генерации плана.*\n\n"
            out += "**Развитие через реальные задачи:** мини-проекты по недостающим навыкам.\n"
            out += "**Взаимодействие и обратная связь:** наставник, интервью.\n"
            out += "**Курсы и тренинги:** курсы по ключевым навыкам.\n"
        return out

    def format_change_profession_legacy(self, structured, target_role_name, target_profession_display):
        match_percent = structured.get("match_percent", 0)
        strong = structured.get("strong", [])
        missing = structured.get("missing", [])
        gaps = structured.get("gaps", [])

        out = f"# Цель: Сменить профессию\n\n"
        out += f"**Целевая профессия/роль:** {target_role_name}\n\n---\n\n"
        out += "## Шаг 1 — Оценка соответствия\n\n"
        out += f"**Совпадение:** {match_percent}%\n\n"
        if strong:
            for s, lvl in strong[:20]:
                out += f"- {s} (уровень {lvl})\n"
        work = [(m[0], m[1]) for m in missing] + [(g[0], g[2]) for g in gaps if len(g) == 3]
        for name, req in work[:15]:
            out += f"- {name} (требуется {req})\n"
        out += "\n---\n\n## Шаг 2 — План развития\n\n"
        gen = self._get_plan_generator()
        if gen and gen.client:
            try:
                from rag_service import get_rag_context_for_plan
                rag_context = get_rag_context_for_plan(" ".join([m[0] for m in missing[:5]]), target_role_name)
            except Exception:
                rag_context = ""
            out += gen.generate_plan_702010("change_profession", out, target_role_name, context="", rag_context=rag_context)
        else:
            out += "*Укажите OPENAI_API_KEY.*\n"
        return out

    def format_explore(self, view_model, user_skills):
        from explore_recommendations import ExploreViewModel

        if not isinstance(view_model, ExploreViewModel):
            return "# Цель: Исследовать возможности\n\n*Нет данных для отображения.*"

        def card_block(cards, section_title):
            if not cards:
                return ""
            out = f"### {section_title}\n\n"
            for c in cards:
                out += f"**{c.title}** — {c.match_label}"
                if c.percent_text:
                    out += f" ({c.percent_text})"
                out += "\n\n"
                if c.reasons:
                    out += "*Почему подходит:* " + "; ".join(c.reasons[:5]) + "\n\n"
                if c.add_skills:
                    out += "*Что добавить:* " + ", ".join(c.add_skills[:3]) + "\n\n"
                if c.key_skills:
                    out += "*Навыки роли:* " + ", ".join(c.key_skills[:8]) + "\n\n"
            return out

        out = "# Возможные направления\n\n"
        out += card_block(view_model.closest, "Ближайшие роли (реалистичный переход)")
        out += card_block(view_model.adjacent, "Смежные направления (требуют усиления базы)")
        if view_model.far:
            out += "### Требуют переквалификации\n\n"
            for c in view_model.far:
                out += f"- **{c.title}** — {c.match_label} ({c.percent_text})\n"
            out += "\n"

        out += "---\n\n"
        out += "**Следующий шаг:** выберите роль и нажмите «Сгенерировать план».\n"
        return out
