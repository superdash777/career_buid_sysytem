# Career Copilot: технологический отчёт по NLP+LLM+RAG

## 1. Аннотация

Данный отчёт описывает технологическое решение интеллектуальной системы карьерного планирования **Career Copilot**: от извлечения навыков из резюме до генерации персонального плана развития.  
Решение построено как production-oriented pipeline на базе FastAPI, LLM (GPT-4o), гибридного retrieval (dense + lexical + rerank), векторного хранилища Qdrant и формализованного контура offline-оценки.

Ключевая цель: повысить качество и воспроизводимость рекомендаций по сравнению с монолитным baseline-пайплайном.

---

## 2. Постановка задачи

### 2.1 Входные данные
- PDF-резюме пользователя.
- Целевая роль/сценарий развития.
- Справочники:
  - `data/clean_skills.json`
  - `data/atlas_params_clean.json`
  - `data/skill_synonyms.json`

### 2.2 Выход системы
- Нормализованный список навыков с уровнями и confidence.
- Gap-анализ относительно целевой роли.
- Персональный план развития на русском языке.

---

## 3. Архитектура решения

### 3.1 Сервисный слой
- **API:** `api.py` (FastAPI)
- **NLP pipeline:** `resume_parser.py`
- **RAG/retrieval:** `rag_service.py`
- **Gap analysis:** `gap_analyzer.py`
- **Plan generation:** `plan_generator.py`
- **Eval:** `eval.py`
- **Auth/DB:** `db.py`, SQLite

### 3.2 Основные хранилища
- **SQLite** (`Config.DB_PATH`): пользователи, анализы, прогресс, refresh-токены.
- **Qdrant**:
  - `skills_v2` (канонические навыки, E5 embedding).

### 3.3 Безопасность доступа
- JWT access + refresh токены.
- Хеширование паролей через bcrypt.
- Rate limiting на register/login.

---

## 4. NLP+LLM+RAG пайплайн

### Шаг 1: Extraction (LLM)
Файл: `resume_parser.py`

- Модель: `RESUME_PARSER_MODEL` (по умолчанию `gpt-4o`).
- JSON mode + low temperature.
- Few-shot и hard negative constraints:
  - не извлекать компании/города/университеты/должности,
  - не извлекать сертификаты, курсы, названия проектов/продуктов как навыки.
- Выход: список raw skills.

### Шаг 2: Normalization (Hybrid Retrieval + LLM rerank)
Файл: `rag_service.py`, `resume_parser.py`

Для каждого raw skill:
1. Dense retrieval (E5 + Qdrant).
2. Lexical retrieval (token overlap/Jaccard).
3. Fusion:
   - weighted dense/lexical score,
   - RRF (`SKILLS_HYBRID_RRF_K`).
4. Optional cross-encoder rerank top-N (`SKILLS_CROSS_ENCODER_MODEL`).
5. LLM reranker выбирает лучший canonical match или `none`.

Режимы для абляций:
- `dense_only`
- `lexical_only`
- `hybrid_rerank` (default)

### Шаг 3: Level Assessment
Файл: `resume_parser.py`

- Для канонического навыка подаются:
  - дескрипторы уровней Basic/Proficiency/Advanced,
  - фрагмент резюме.
- Выход:
  - уровень `0..3`,
  - `evidence` (цитата/обоснование).

### Шаг 4: Unknown skill handling
- Если canonical match не найден:
  - LLM-классификация «навык/не навык».
  - При положительном решении используется conservative confidence band (`llm_unknown`).

---

## 5. Explainability и traceability

Для каждого распознанного навыка возвращаются:
- `confidence`
- `confidence_band`
- `resume_evidence_span`
- `source_skill_id`
- `retrieval_mode`
- `retrieval_trace` (кандидаты, dense/lexical сигналы)
- `alternatives` (топ альтернативы)

Это позволяет объяснить, **почему** система выбрала конкретную нормализацию.

---

## 6. Генерация плана развития

Файл: `plan_generator.py`

### 6.1 Policy
- Persona: карьерный коуч (10+ лет в IT).
- Grounding: использовать только предоставленный контекст.
- При нехватке данных: `Требуется уточнение`.
- Ограничения:
  - задачи 1–4 часа,
  - в обучении только книги (без курсов/тренингов/подписок).

### 6.2 Контекстный бюджет
- Контекст режется и приоритизируется до `PLAN_CONTEXT_MAX_CHARS` (default 4000).
- Секции: structured gaps → skill descriptions → strong skills → RAG context → diagnostics.

### 6.3 JSON-focused генерация
- Для focused plan используется schema-aware JSON output.

---

## 7. Авторизация и хранение пользовательских данных

### 7.1 Auth endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### 7.2 DB tables
- `users`
- `analyses`
- `progress`
- `refresh_tokens`

### 7.3 Защита
- bcrypt password hash
- JWT signature + exp validation
- refresh token rotation
- rate limit на auth endpoints

---

## 8. Observability

Файл: `llm_observability.py`

Для LLM-вызовов логируются:
- component/operation/model
- request_id
- latency_ms
- estimated prompt/completion tokens
- success/error

Это снижает сложность диагностики и улучшает воспроизводимость экспериментов.

---

## 9. Экспериментальный контур (offline eval)

Файл: `eval.py`

### 9.1 Метрики
- Extraction: Precision / Recall / F1
- Normalization: Accuracy
- Gap detection: Precision / Recall / F1
- Faithfulness: ROUGE-L
- Calibration: ECE, Brier
- Constraint violations (rules-based)
- Latency / cost

### 9.2 Расширенные блоки
- Bootstrap CI 95% для ключевых метрик.
- Error taxonomy:
  - false positives
  - false negatives
  - unknown skills
  - llm_unknown mode hits
- Retrieval ablation matrix:
  - dense_only
  - lexical_only
  - hybrid_rerank

### 9.3 Воспроизводимость
```bash
python3 -m pytest -q
python3 eval.py --version v2 --verbose
python3 eval.py --version v2 --verbose --retrieval-mode dense_only
python3 eval.py --version v2 --verbose --retrieval-mode lexical_only
python3 eval.py --version v2 --verbose --retrieval-mode hybrid_rerank
python3 scripts/threshold_analysis.py --dataset eval_dataset.json
```

Результаты сохраняются в `eval_results/`.

---

## 10. Качество реализации на момент отчёта

- Полный тестовый прогон: **29 passed**.
- Архитектура поддерживает:
  - модульную замену retrieval-компонентов,
  - абляционные исследования,
  - production-hardened auth flow.

---

## 11. Ограничения и направления развития

1. Cross-encoder reranker включается при наличии модели в окружении.
2. Rate limiter реализован in-memory (для single-node MVP).
3. Для multi-instance production рекомендуется:
   - Redis-based rate limit,
   - централизованный tracing/metrics backend.

---

## 12. Вывод

Реализованное решение представляет собой инженерно и исследовательски зрелый стек NLP+LLM+RAG:
- гибридный retrieval с абляциями,
- schema-validated LLM pipeline,
- explainability на уровне skill-решений,
- auth hardening,
- воспроизводимый eval с калибровкой, CI и error taxonomy.

Такой подход делает систему пригодной как для практического использования, так и для защищаемой научно-инженерной оценки в рамках дипломной работы.
