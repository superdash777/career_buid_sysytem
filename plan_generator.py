
"""Генерация плана развития через LLM с категориями реальных задач / взаимодействия / курсов."""

import time
from config import Config

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

MAX_STEP1_CHARS = 2500
MAX_TOKENS_RESPONSE = 3500


def _compress_step1(markdown: str) -> str:
    if not markdown or len(markdown) <= MAX_STEP1_CHARS:
        return markdown or ""
    return markdown[:MAX_STEP1_CHARS] + "\n\n[... диагностика сокращена, используй контекст выше и RAG ...]"


class PlanGenerator:
    def __init__(self):
        self._api_key = Config.OPENAI_API_KEY
        self.client = OpenAI(api_key=self._api_key) if (OpenAI and self._api_key) else None

    def generate_plan_702010(self, scenario_type, step1_markdown, target_name,
                              context="", rag_context="", skill_context=""):
        if not self.client:
            return self._fallback_plan(target_name)

        step1_short = _compress_step1(step1_markdown or "")
        extra_rag = ""
        if rag_context and rag_context.strip():
            extra_rag = (
                "\n\nРелевантные материалы из базы навыков и атласа "
                "(используй для конкретики задач и примеров):\n\n" + rag_context.strip()
            )
        extra_skills = ""
        if skill_context and skill_context.strip():
            extra_skills = (
                "\n\nОписания навыков и примеры задач на развитие (используй как основу "
                "для рекомендаций, не выдумывай):\n\n" + skill_context.strip()
            )

        prompt = f"""Ты карьерный консультант. На основе диагностики составь персональный план развития.

Цель: {target_name}
Тип сценария: {scenario_type}

Диагностика:
{step1_short}
{extra_rag}
{extra_skills}

Дополнительно: {context}

Требования к ответу на русском языке:
1. План развития, привязанный к выявленным параметрам/навыкам, разделённый на три категории:

   **Развитие через реальные задачи** — конкретные действия и задачи в работе с ожидаемым результатом/артефактом. Опирайся на примеры задач из контекста.

   **Взаимодействие и обратная связь** — наставничество, code review, ретроспективы, калибровки, запрос фидбэка.

   **Курсы и тренинги** — конкретные курсы, материалы, ресурсы для самообучения.

2. Метрики прогресса и чекпоинты:
   - как понять, что параметр/навык прокачался
   - точки пересмотра (4 / 8 / 12 недель)

Формат: структурированно, с заголовками и списками. Без вступления, сразу по делу.
Важно: не обрывай текст, не используй «…» в конце, давай завершённые рекомендации.
Опирайся ТОЛЬКО на данные из контекста выше."""

        last_error = None
        for attempt in range(3):
            try:
                response = self.client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "Ты эксперт по карьерному развитию. Отвечай только на русском, структурированно. Никогда не обрывай текст многоточием."},
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
        return f"""## План развития: {target_name}

Для персонального плана с генерацией через ИИ укажите OPENAI_API_KEY в .env.

**Развитие через реальные задачи:** Возьмите задачи из блока «Зона роста» выше и выполняйте их в работе с фиксацией результата.
**Взаимодействие и обратная связь:** Обсудите с руководителем и наставником приоритеты, запросите обратную связь раз в 2–4 недели.
**Курсы и тренинги:** Изучите материалы по недостающим навыкам из рекомендаций выше.

**Чекпоинты:** пересмотр прогресса через 4, 8 и 12 недель."""
