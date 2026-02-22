# -*- coding: utf-8 -*-
"""Генерация плана развития 70/20/10 через LLM."""

import json
import time
from config import Config

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

MAX_STEP1_CHARS = 1000
MAX_TOKENS_RESPONSE = 2000


def _compress_step1(markdown: str) -> str:
    """Сжимает диагностику для промпта LLM, чтобы не раздувать контекст."""
    if not markdown or len(markdown) <= MAX_STEP1_CHARS:
        return markdown or ""
    return markdown[:MAX_STEP1_CHARS] + "\n\n[... диагностика сокращена, используй контекст выше и RAG ...]"


class PlanGenerator:
    def __init__(self):
        self._api_key = Config.OPENAI_API_KEY
        self.client = OpenAI(api_key=self._api_key) if (OpenAI and self._api_key) else None

    def generate_plan_702010(self, scenario_type, step1_markdown, target_name, context="", rag_context=""):
        """
        Генерирует план 70/20/10 на основе результата шага 1.
        scenario_type: "next_grade" | "change_profession" | "explore"
        rag_context: опциональный контекст из RAG (релевантные чанки по навыкам/атласу).
        """
        if not self.client:
            return self._fallback_plan(target_name)

        step1_short = _compress_step1(step1_markdown or "")
        extra_rag = ""
        if rag_context and rag_context.strip():
            extra_rag = "\n\nРелевантные материалы из базы навыков и атласа (используй для конкретики задач и примеров):\n\n" + rag_context.strip()

        prompt = f"""Ты карьерный консультант. На основе диагностики (шаг 1) составь персональный план развития в формате 70/20/10.

Цель: {target_name}
Тип сценария: {scenario_type}

Диагностика (шаг 1):
{step1_short}
{extra_rag}

Дополнительно: {context}

Требования к ответу на русском языке:
1. План развития 70/20/10, привязанный к выявленным параметрам/навыкам:
   - 70% (опыт): конкретные действия и задачи в работе с ожидаемым результатом/артефактом
   - 20% (социальное): обратная связь, наставник, калибровки, ревью
   - 10% (обучение): курсы, материалы, ресурсы

2. Метрики прогресса и чекпоинты:
   - как понять, что параметр/навык прокачался
   - точки пересмотра (например, 4/8/12 недель)

Ответ дай структурированно, с заголовками и списками. Без вступления, сразу по делу."""

        last_error = None
        for attempt in range(3):
            try:
                response = self.client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "Ты эксперт по карьерному развитию. Отвечай только на русском, структурированно."},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.3,
                    max_tokens=MAX_TOKENS_RESPONSE,
                )
                return response.choices[0].message.content.strip()
            except Exception as e:
                last_error = e
                if attempt < 2:
                    time.sleep(1 + attempt)
        return self._fallback_plan(target_name) + f"\n\n*(Ошибка генерации плана: {last_error})*"

    def _fallback_plan(self, target_name):
        return f"""## План развития 70/20/10: {target_name}

Для персонального плана с генерацией через ИИ укажите OPENAI_API_KEY в .env.

**70% (опыт):** Возьмите задачи из блока «Зона роста» выше и выполняйте их в работе с фиксацией результата.
**20% (социальное):** Обсудите с руководителем и наставником приоритеты, запросите обратную связь раз в 2–4 недели.
**10% (обучение):** Изучите материалы по недостающим навыкам из рекомендаций выше.

**Чекпоинты:** пересмотр прогресса через 4, 8 и 12 недель."""