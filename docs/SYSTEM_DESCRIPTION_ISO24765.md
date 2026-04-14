# AI Career Pathfinder — Описание системы

> Документ подготовлен в соответствии с терминологией и структурой ISO/IEC/IEEE 24765:2017  
> «Systems and software engineering — Vocabulary»

---

## 1. Назначение системы (System Purpose)

**AI Career Pathfinder** (Career Copilot) — программная система (software system), предназначенная для автоматизированного построения персональных планов профессионального развития IT-специалистов. Система реализует полный цикл: от извлечения навыков из резюме (PDF) до генерации структурированного плана развития с недельными итерациями.

**Основные задачи:**
- Извлечение и нормализация навыков из неструктурированных документов (резюме)
- Gap-анализ: сопоставление профиля пользователя с требованиями целевой роли
- Генерация персонализированного плана развития по модели 70/20/10
- Исследование карьерных возможностей с семантическим ранжированием

**Целевая аудитория:** IT-специалисты уровня Middle+, стремящиеся к структурному переходу на следующий грейд, смене профессии или исследованию смежных направлений.

---

## 2. Архитектура системы (System Architecture)

### 2.1. Архитектурный стиль

Система построена по архитектуре **клиент-серверного SPA** (Single Page Application) с разделением на:

- **Frontend** — клиентское приложение (React SPA), отвечающее за пользовательский интерфейс
- **Backend** — REST API сервер (FastAPI), реализующий бизнес-логику, NLP/ML-пайплайн и управление данными
- **External Services** — внешние сервисы (OpenAI API, Qdrant Vector DB)

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (SPA)                       │
│  React 19 + TypeScript + Vite 7 + Tailwind CSS v4           │
│  Screens: Landing → Auth → Onboarding → Wizard → Result     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/JSON (REST API)
┌──────────────────────────▼──────────────────────────────────┐
│                     BACKEND (API Server)                     │
│  FastAPI + Uvicorn + SQLite                                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Auth Module  │  │  NLP/ML Core │  │  Plan Generator   │  │
│  │  JWT+bcrypt   │  │  Resume Parse│  │  LLM (gpt-4o)     │  │
│  │  Rate Limiter │  │  Gap Analysis│  │  Context Builder   │  │
│  └──────────────┘  │  Scenarios   │  └───────────────────┘  │
│                     └──────┬───────┘                         │
│                            │                                 │
│  ┌─────────────────────────▼────────────────────────────┐   │
│  │              RAG Service (Retrieval Layer)             │   │
│  │  Embeddings: MiniLM-L12 (legacy) + E5-large (v2)     │   │
│  │  Hybrid: Dense + Lexical (rapidfuzz) + RRF Fusion     │   │
│  │  Optional: Cross-Encoder reranking                    │   │
│  └──────────────────────────┬───────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌────────────┐    ┌──────────────┐    ┌──────────────┐
   │  OpenAI API │    │ Qdrant Cloud │    │   SQLite DB   │
   │  gpt-4o     │    │ Vector Search│    │  Users/Auth   │
   │  gpt-4o-mini│    │ 2 collections│    │  Analyses     │
   └────────────┘    └──────────────┘    │  Progress     │
                                          └──────────────┘
```

### 2.2. Модель развёртывания (Deployment)

- **Контейнеризация:** Docker (multi-stage build: Node.js 20 для frontend → Python 3.12-slim для runtime)
- **Хостинг:** Railway / любой Docker-совместимый PaaS
- **Процесс:** Единый процесс `uvicorn` обслуживает и API, и статику SPA

---

## 3. Компоненты системы (System Components)

### 3.1. Frontend (Presentation Layer)

| Характеристика | Значение |
|---|---|
| **Фреймворк** | React 19.2 |
| **Язык** | TypeScript 5.9 |
| **Сборщик** | Vite 7.3 |
| **Стилизация** | Tailwind CSS v4 (через `@tailwindcss/vite`) |
| **Иконки** | lucide-react |
| **Графики** | Recharts 3.7 |
| **Markdown** | react-markdown + remark-gfm |
| **Файловый upload** | react-dropzone |
| **Маршрутизация** | Hash-based (без React Router, через `window.history`) |
| **Управление состоянием** | React Context (AuthContext, ThemeContext) + useState/sessionStorage |
| **Тема** | Light/Dark через CSS custom properties + `document.documentElement.classList` |

**Основные экраны:**
1. `PublicLanding` — посадочная страница с hero, метриками, карточками функций
2. `Login` / `Register` — двухколоночный layout (преимущества + форма)
3. `OnboardingQuiz` — пошаговый flow (3 шага с progress bar)
4. `Welcome` — приветственный хаб с навигацией к wizard и dashboard
5. `GoalSetup` → `Skills` → `Confirmation` → `Result` — основной wizard
6. `Dashboard` — история анализов и прогресс

**Дизайн-система (UI primitives):**
- `Button` (primary / secondary / ghost, размеры sm / md / lg)
- `Eyebrow`, `Mark`, `Em`, `MonoLabel` — типографические примитивы
- `GridBg`, `Layout`, `NavBar`, `Stepper` — структурные компоненты
- `Alert`, `Toast` — обратная связь
- `ScenarioCard` — карточки выбора сценария

**Цветовая палитра (Design Tokens):**
- Light: `--bg: #f8f9fc`, `--paper: #ffffff`, `--blue-deep: #4f46e5` (индиго)
- Dark: `--bg: #0f1117`, `--paper: #171924`, `--blue-deep: #818cf8`
- Градиенты: `--gradient-hero` (индиго → фиолетовый)
- Тени: `--shadow-soft` с индиго-оттенком

**Типографика:**
- Display + Body: Instrument Sans (Google Fonts)
- Mono: JetBrains Mono

### 3.2. Backend — API Server (`api.py`)

| Характеристика | Значение |
|---|---|
| **Фреймворк** | FastAPI ≥ 0.100 |
| **ASGI-сервер** | Uvicorn ≥ 0.22 |
| **Формат данных** | JSON (Pydantic models для валидации) |
| **CORS** | `allow_origins=["*"]` (SPA на том же домене) |
| **Статика SPA** | Catch-all route `/{full_path:path}` → `frontend/dist/` |

**API Endpoints:**

| Метод | Путь | Назначение | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Регистрация | — |
| POST | `/api/auth/login` | Вход | — |
| POST | `/api/auth/refresh` | Обновление access token | — |
| POST | `/api/auth/logout` | Отзыв refresh token | — |
| GET | `/api/auth/me` | Текущий пользователь | JWT |
| PATCH | `/api/auth/onboarding` | Сохранение onboarding-ответов | JWT |
| GET | `/api/analyses` | Список анализов пользователя | JWT |
| POST | `/api/analyses` | Создание анализа | JWT |
| GET | `/api/analyses/{id}` | Детали анализа | JWT |
| GET | `/api/progress` | Прогресс по навыкам | JWT |
| PATCH | `/api/progress` | Обновление прогресса | JWT |
| GET | `/api/share/{id}` | Публичный read-only доступ | — |
| GET | `/api/professions` | Список профессий | — |
| GET | `/api/skills-for-role` | Навыки роли | — |
| GET | `/api/skills-by-category` | Навыки по категориям | — |
| GET | `/api/suggest-skills` | Подсказки навыков (RAG) | — |
| POST | `/api/analyze-resume` | Загрузка PDF, извлечение навыков | — |
| POST | `/api/plan` | Генерация плана (markdown + analysis) | — |
| POST | `/api/focused-plan` | Фокусный план (JSON: tasks/learning) | — |
| GET | `/health` | Health check | — |

### 3.3. Модуль аутентификации и авторизации

| Характеристика | Значение |
|---|---|
| **Хеширование паролей** | bcrypt (библиотека `bcrypt`) |
| **Токены** | JWT (библиотека `PyJWT`) |
| **Алгоритм подписи** | HS256 (настраивается через `JWT_ALGORITHM`) |
| **Access token TTL** | 3 дня (4320 мин, `JWT_ACCESS_TOKEN_TTL_MINUTES`) |
| **Refresh token TTL** | 30 дней (43200 мин, `JWT_REFRESH_TOKEN_TTL_MINUTES`) |
| **Хранение refresh** | SHA-256 hash в SQLite `refresh_tokens` |
| **Ротация refresh** | При refresh старый отзывается, создаётся новый |
| **Rate limiting** | In-memory sliding window (окно 60 сек, 10 попыток) |

### 3.4. Хранилище данных (Data Store)

**SQLite** (файл `data/app.db`) — MVP-хранилище.

**Таблицы:**

| Таблица | Назначение | Ключевые поля |
|---|---|---|
| `users` | Учётные записи | id (UUID), email, password_hash, experience_level, pain_point, development_hours_per_week |
| `analyses` | История анализов | id, user_id (FK), scenario, current_role, target_role, skills_json, result_json |
| `progress` | Прогресс по навыкам | id, user_id (FK), skill_name, status (todo/in_progress/done) |
| `refresh_tokens` | Refresh-токены | token_hash (SHA-256), user_id (FK), expires_at |

**Индексы:** по `user_id`, `created_at DESC`, `expires_at`.

### 3.5. Данные предметной области

| Файл | Формат | Содержание | Размер |
|---|---|---|---|
| `data/clean_skills.json` | JSON array | Канонические навыки с уровнями (Basic/Proficiency/Advanced), примерами задач, привязкой к профессиям | ~6900 записей |
| `data/atlas_params_clean.json` | JSON array | Параметры атласа компетенций (по грейдам Младший → Эксперт) | ~20 параметров |
| `data/skill_synonyms.json` | JSON object | Маппинг синонимов → канонические названия | ~250 записей |
| `data/skill_clusters.json` | JSON (runtime) | KMeans-кластеры навыков (генерируется при первом build_index) | 25 кластеров |

---

## 4. NLP/ML Pipeline (Intelligence Layer)

### 4.1. Обзор pipeline

```
PDF Resume
    │
    ▼
[1] Text Extraction (pypdf)
    │
    ▼
[2] Skill Extraction (gpt-4o, JSON mode)
    │ 3 few-shot examples (PM, Backend, Designer)
    ▼
[3] Hybrid Retrieval (E5-large + rapidfuzz lexical)
    │ Для каждого raw skill → top-5 canonical candidates
    ▼
[4] Batch LLM Reranking (gpt-4o-mini, single call for all skills)
    │ Match or "none" + confidence
    ▼
[5] Unknown Classification (gpt-4o-mini per unmatched skill)
    │ is_skill: true/false
    ▼
[6] Batch Level Assessment (gpt-4o-mini, single call)
    │ Level 0-3 + evidence snippet
    ▼
[7] Gap Analysis (deterministic + semantic matching)
    │
    ▼
[8] Scenario Processing (next_grade / switch / explore)
    │
    ▼
[9] Plan Generation (gpt-4o, 70/20/10 framework)
    │ RAG context (up to 12000 chars)
    ▼
Structured Result (markdown + analysis JSON)
```

### 4.2. Модели машинного обучения

| Модель | Тип | Назначение | Размерность | Провайдер |
|---|---|---|---|---|
| `gpt-4o` | LLM (генеративная) | Извлечение навыков из резюме, генерация плана 70/20/10 | — | OpenAI API |
| `gpt-4o-mini` | LLM (генеративная) | Реранкинг кандидатов, оценка уровней, классификация неизвестных навыков | — | OpenAI API |
| `intfloat/multilingual-e5-large-instruct` | Bi-encoder (dense retrieval) | Поиск канонических навыков (skills_v2), семантический мэтчинг в gap-анализе | 1024-dim | HuggingFace / sentence-transformers |
| `paraphrase-multilingual-MiniLM-L12-v2` | Bi-encoder (legacy) | Legacy RAG-поиск, ранжирование возможностей Explore | 384-dim | HuggingFace / sentence-transformers |
| Cross-Encoder (опционально) | Cross-encoder | Точный reranking после hybrid retrieval | — | sentence-transformers |
| KMeans (scikit-learn) | Кластеризация | Группировка навыков в треки для рекомендаций | 25 кластеров | scikit-learn |

### 4.3. RAG-сервис (Retrieval-Augmented Generation)

#### 4.3.1. Индексация (offline)

**Две коллекции в Qdrant:**

| Коллекция | Модель | Содержание | Метрика |
|---|---|---|---|
| `career_pathfinder_rag` | MiniLM-L12 (384-dim) | Навыки (полный текст: название + уровни + задачи) + параметры атласа | Cosine |
| `skills_v2` | E5-large-instruct (1024-dim) | Только канонические названия навыков (`passage: {name}`) | Cosine |

**Процесс:**
1. Загрузка `clean_skills.json` + `atlas_params_clean.json`
2. Построение текстовых документов (`_skill_to_text`, `_atlas_to_text`)
3. KMeans-кластеризация навыков → `skill_clusters.json`
4. Эмбеддирование всех документов
5. Upsert в Qdrant через REST API

#### 4.3.2. Retrieval (runtime)

**Hybrid retrieval (`get_skills_v2_candidates`):**
1. **Dense:** E5-large query → Qdrant cosine search (collection `skills_v2`)
2. **Lexical:** rapidfuzz `token_sort_ratio` (60%) + Jaccard (40%) по кэшу канонических навыков
3. **Fusion:** RRF (Reciprocal Rank Fusion, k=60) + weighted blend (dense: 0.7, lexical: 0.3)
4. **Optional:** Cross-encoder reranking top-N

**Qdrant интеграция:** REST API через `urllib.request` (без SDK).

#### 4.3.3. RAG для планов

Формирование контекста для LLM (`_build_context_block`):
1. Структурированный gap JSON (приоритет 1)
2. Описания навыков/уровней из `clean_skills.json` (приоритет 2)
3. Сильные навыки пользователя (приоритет 3)
4. RAG-сниппеты из Qdrant (приоритет 4)
5. Markdown-диагностика (приоритет 5)

Бюджет: до **12 000 символов** (`PLAN_CONTEXT_MAX_CHARS`).

### 4.4. Извлечение навыков из резюме (`resume_parser.py`)

**Pipeline v2 (batch-оптимизированный):**

| Этап | Модель | Режим | Tokens/call |
|---|---|---|---|
| Text extraction | pypdf | Offline | — |
| Raw skill extraction | gpt-4o | JSON mode, 3 few-shots | ~2000 |
| Batch reranking (все навыки) | gpt-4o-mini | JSON mode, 1 batch call | ~1500 |
| Unknown classification | gpt-4o-mini | Per unmatched skill | ~400 |
| Batch level assessment | gpt-4o-mini | JSON mode, 1 batch call | ~2000 |

**Оптимизации:**
- Batch calls: 30-45 вызовов → 3-4 вызова на резюме
- Evidence snippets: 300-500 символов контекста вместо 4000
- Light model (gpt-4o-mini) для вспомогательных операций
- Fallback на legacy pipeline при ошибке v2

### 4.5. Нормализация навыков (`skill_normalizer.py`)

| Компонент | Технология | Назначение |
|---|---|---|
| Лемматизация (русский) | pymorphy3 | Приведение к начальной форме |
| Стемминг (английский) | NLTK Snowball | Приведение к основе |
| Словарь синонимов | `skill_synonyms.json` (250+ записей) | Маппинг вариантов → канонические имена |
| Typo correction | Hardcoded map | «питон» → «python», «дата саенс» → «data science» |

**Цепочка нормализации:**
```
raw input → lower + strip → typo correction → lemmatize/stem → synonym lookup → canonical name
```

### 4.6. Gap-анализ (`gap_analyzer.py`)

**Два уровня мэтчинга:**
1. **Exact match:** нормализованное имя пользователя == имя в требованиях
2. **Semantic match:** embedding similarity ≥ 0.72 (E5-large, `semantic_match_skills`)

**Greedy 1:1 matching:** каждый user-навык сопоставляется максимум с одним required-навыком, пары отсортированы по убыванию similarity.

**Weighted scoring:**
- Stable навыки: вес 2
- Trending навыки: вес 3
- Неизвестные: вес 1

### 4.7. Сценарии

| Сценарий | Модуль | Описание |
|---|---|---|
| **Следующий грейд** | `scenario_handler.py` + `next_grade_service.py` | Сравнение текущего грейда с target (grade+1). Atlas narrative + RAG context для параметров. |
| **Смена профессии** | `scenario_handler.py` + `switch_profession_service.py` | Baseline = target−1. Matched/missing skills с RAG-сниппетами. Кластерные треки (`skill_clusters.json`). |
| **Исследование** | `scenario_handler.py` + `explore_recommendations.py` | Перебор всех ролей × грейдов. Exact + semantic overlap + profile similarity. RAG `get_rag_why_role_bullets`. Категории: closest (≥15%), adjacent (5-15%), far (<5%). |

### 4.8. Генерация плана (`plan_generator.py`)

| Параметр | Значение |
|---|---|
| Модель | gpt-4o (`PLAN_GENERATOR_MODEL`) |
| Temperature | 0.3 |
| Max tokens | 6144 (plan), 3000 (focused) |
| System prompt | Карьерный коуч, 10 лет, Middle+, только книги, только из контекста |
| Формат ответа | Markdown (plan) / JSON mode (focused) |
| Post-validation | Retry если отсутствуют обязательные секции |

**Обязательные секции плана:**
1. Приоритизация
2. Развитие через реальные задачи
3. Взаимодействие и обратная связь
4. Книги
5. Метрики и чекпоинты

### 4.9. Confidence-оценка навыков (`confidence_utils.py`)

| Band | Score | Условие |
|---|---|---|
| `exact` | 1.0 | raw_name == canonical_name (case-insensitive) |
| `fuzzy` | 0.9 | rapidfuzz ratio > 85 |
| `vector_llm` | 0.6–0.95 | LLM rerank confidence (clamped) |
| `llm_unknown` | 0.5 | Навык не из канонического списка |

### 4.10. Наблюдаемость (`llm_observability.py`)

- **Token counting:** tiktoken (точный) с fallback на language-aware heuristic (2.5 chars/token для кириллицы, 3.5 для латиницы)
- **Лог:** Structured JSON → stdout
- **Поля:** timestamp, component, operation, model, request_id, success, latency_ms, prompt/completion chars + tokens, error

---

## 5. Стек технологий (Technology Stack)

### 5.1. Frontend

| Технология | Версия | Назначение | ISO/IEC категория |
|---|---|---|---|
| React | 19.2 | UI framework (component-based SPA) | Application framework |
| TypeScript | 5.9 | Statically-typed language | Programming language |
| Vite | 7.3 | Build tool + dev server (HMR) | Build system |
| Tailwind CSS | 4.2 | Utility-first CSS framework | Styling framework |
| lucide-react | 0.575 | SVG icon library | UI library |
| Recharts | 3.7 | Charting (radar, bar) | Visualization library |
| react-markdown | 10.1 | Markdown → React components | Content rendering |
| remark-gfm | 4.0 | GitHub Flavored Markdown | Content extension |
| react-dropzone | 15.0 | File drag-and-drop | Input component |

### 5.2. Backend

| Технология | Версия | Назначение | ISO/IEC категория |
|---|---|---|---|
| Python | 3.12 | Runtime language | Programming language |
| FastAPI | ≥ 0.100 | ASGI web framework (REST API) | Application framework |
| Uvicorn | ≥ 0.22 | ASGI server | Application server |
| Pydantic | v2 | Data validation + serialization | Validation library |
| SQLite | 3 (stdlib) | Relational database (embedded) | DBMS |
| bcrypt | — | Password hashing | Security library |
| PyJWT | — | JSON Web Token (JWT) | Security library |
| email-validator | — | Email format validation | Validation library |

### 5.3. NLP / Machine Learning

| Технология | Версия | Назначение | ISO/IEC категория |
|---|---|---|---|
| OpenAI API (gpt-4o) | v1 SDK | Text generation (extraction, plans) | LLM service |
| OpenAI API (gpt-4o-mini) | v1 SDK | Lightweight generation (rerank, level) | LLM service |
| sentence-transformers | ≥ 2.2, < 3.0 | Embedding models (E5-large, MiniLM) | ML library |
| transformers | ≥ 4.40 | HuggingFace model infrastructure | ML library |
| torch | (CPU) | Neural network runtime | ML framework |
| scikit-learn | ≥ 1.0 | KMeans clustering | ML library |
| pymorphy3 | ≥ 2.0 | Russian morphological analysis | NLP library |
| rapidfuzz | — | Fuzzy string matching | NLP library |
| tiktoken | ≥ 0.5 | OpenAI tokenizer (token counting) | NLP utility |
| pypdf | ≥ 3.0 | PDF text extraction | Document processing |
| rouge-score | — | ROUGE-L faithfulness metric | Evaluation library |

### 5.4. Vector Database

| Технология | Версия | Назначение | ISO/IEC категория |
|---|---|---|---|
| Qdrant | Cloud | Vector similarity search | Vector DBMS |

**Интеграция:** REST API (HTTP/JSON) через `urllib.request`.

**Коллекции:**
- `career_pathfinder_rag` — полнотекстовые документы (384-dim, MiniLM)
- `skills_v2` — канонические навыки (1024-dim, E5-large)

### 5.5. DevOps / Infrastructure

| Технология | Назначение |
|---|---|
| Docker | Контейнеризация (multi-stage: Node.js 20 + Python 3.12) |
| Railway | PaaS-хостинг |
| Git | Система контроля версий |
| GitHub | Хостинг репозитория + CI |

---

## 6. Модель данных (Data Model)

### 6.1. Навык (Skill Entity)

```
{
  "Навык": string,                          // Каноническое имя
  "Профессия (лист)": string,               // Привязка к профессии
  "Категория": string,                       // Категория навыка
  "Skill level \\ Индикатор - Basic": string,
  "Skill level \\ Индикатор - Proficiency": string,
  "Skill level \\ Индикатор - Advanced": string,
  "Пример задач на развитие \\ уровень Basic": string,
  "Пример задач на развитие \\ уровень Proficiency": string,
  "Пример задач на развитие \\ уровень Advanced": string
}
```

### 6.2. Параметр атласа (Atlas Parameter Entity)

```
{
  "Параметр": string,
  "Описание": string,
  "Младший": string,     // Ожидания Junior
  "Специалист": string,  // Ожидания Middle
  "Старший": string,     // Ожидания Senior
  "Ведущий": string,     // Ожидания Lead
  "Эксперт": string      // Ожидания Expert
}
```

### 6.3. Результат извлечения навыка (Parsed Skill)

```
{
  "raw_name": string,              // Оригинальное название из резюме
  "name": string,                  // Каноническое название
  "level": int (0-3),             // Basic=1, Proficiency=2, Advanced=3
  "confidence": float (0-1),      // Confidence score
  "confidence_band": enum,        // exact | fuzzy | vector_llm | llm_unknown
  "evidence": string,             // Цитата из резюме
  "candidates": [{name, score}],  // Top-5 retrieval candidates
  "retrieval_mode": string,       // hybrid_dense_lexical | llm_unknown
  "retrieval_trace": object       // Debug info
}
```

---

## 7. Модель качества (Quality Model)

### 7.1. Метрики оценки

| Метрика | Модуль | Назначение |
|---|---|---|
| ROUGE-L faithfulness | `eval_metrics/faithfulness.py` | Оценка верности плана контексту |
| Confidence bands | `confidence_utils.py` | Прозрачность оценки навыков |
| Plan constraint violations | `eval.py` | Обнаружение курсов/тренингов в рекомендациях |
| ECE + Brier score | `eval.py` | Калибровка confidence-оценок |
| Retrieval ablation | `eval.py` | Сравнение режимов retrieval (dense/lexical/hybrid) |

### 7.2. Тестовое покрытие

29 unit-тестов:
- Auth config (`test_auth_config.py`)
- Eval metrics (`test_eval_metrics.py`)
- Explore recommendations (`test_explore_recommendations.py`)
- Next grade service (`test_next_grade_service.py`)
- Plan generator (`test_plan_generator.py`)
- RAG hybrid retrieval (`test_rag_hybrid.py`)
- Rate limiter (`test_rate_limiter.py`)
- Resume pipeline v2 (`test_resume_pipeline_v2.py`)
- Skill normalizer (`test_skill_normalizer.py`)
- Switch profession service (`test_switch_profession_service.py`)
- Weighted gap scoring (`test_weighted_gap_scoring.py`)

---

## 8. Безопасность (Security)

| Аспект | Реализация |
|---|---|
| Пароли | bcrypt (salt + hash) |
| Токены доступа | JWT HS256, TTL 3 дня |
| Refresh-токены | SHA-256 hash в БД, ротация при refresh, TTL 30 дней |
| Rate limiting | Sliding window (60 сек / 10 попыток) на login + register |
| Input validation | Pydantic models для всех endpoints |
| CORS | Разрешены все origins (SPA deployment) |
| API Key | OpenAI API key через переменную окружения |

---

## 9. Конфигурация (Configuration)

Все параметры системы определяются через переменные окружения (файл `.env`):

| Переменная | Default | Назначение |
|---|---|---|
| `OPENAI_API_KEY` | — | Ключ OpenAI API |
| `RESUME_PARSER_MODEL` | `gpt-4o` | Модель для извлечения навыков |
| `RESUME_PARSER_LIGHT_MODEL` | `gpt-4o-mini` | Лёгкая модель для rerank/level |
| `PLAN_GENERATOR_MODEL` | `gpt-4o` | Модель для генерации плана |
| `PLAN_CONTEXT_MAX_CHARS` | `12000` | Бюджет контекста для LLM |
| `EMBED_MODEL_NAME` | `paraphrase-multilingual-MiniLM-L12-v2` | Legacy embedding model |
| `EMBED_MODEL_NAME_V2` | `intfloat/multilingual-e5-large-instruct` | Primary embedding model |
| `QDRANT_URL` | — | URL Qdrant Cloud |
| `QDRANT_API_KEY` | — | API key Qdrant |
| `SKILL_MATCH_THRESHOLD` | `0.72` | Порог семантического мэтчинга |
| `SKILLS_RETRIEVAL_MODE` | `hybrid_rerank` | Режим retrieval |
| `JWT_SECRET` | `change-me-in-production` | Секрет подписи JWT |
| `DB_PATH` | `data/app.db` | Путь к SQLite |

---

## 10. Глоссарий (по ISO/IEC/IEEE 24765)

| Термин | Определение в контексте системы |
|---|---|
| **System** | AI Career Pathfinder — совокупность frontend, backend, ML pipeline и внешних сервисов |
| **Component** | Логически обособленный модуль (resume_parser, rag_service, plan_generator и т.д.) |
| **Module** | Python-файл, реализующий один аспект функциональности |
| **Interface** | REST API (HTTP/JSON) между frontend и backend |
| **Configuration item** | Файл исходного кода, данные навыков/атласа, конфигурация `.env` |
| **Baseline** | Уровень грейда минус один (для сценария смены профессии) |
| **Gap analysis** | Автоматическое определение разрывов между текущими и требуемыми навыками |
| **RAG** | Retrieval-Augmented Generation — обогащение LLM-контекста данными из векторной БД |
| **Embedding** | Плотное векторное представление текста для семантического поиска |
| **Canonical skill** | Нормализованное название навыка из справочника `clean_skills.json` |
| **Confidence band** | Категория уверенности в сопоставлении навыка (exact, fuzzy, vector_llm, llm_unknown) |
