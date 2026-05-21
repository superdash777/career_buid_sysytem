# Архитектура Career Copilot

## 1. Обзор

Career Copilot — клиент-серверное веб-приложение, объединяющее NLP, семантический поиск (RAG) и генеративный AI для построения персонализированных планов карьерного развития.

Единый сервис: Python-бэкенд обслуживает REST API и раздаёт статические файлы React-фронтенда. Такой монолитный подход исключает необходимость в отдельном веб-сервере и отдельном CDN для MVP; при необходимости CORS уже включён в приложение (см. `api.py`).

---

## 2. Архитектурная схема

```
┌────────────────────────────────────────────────────────────────────────┐
│                         КЛИЕНТ (Браузер)                               │
│                                                                        │
│   React 19 · TypeScript 5.9 · Tailwind CSS 4 · Vite 7 · Recharts       │
│                                                                        │
│   PublicLanding / Auth · Onboarding · Dashboard                        │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐   │
│   │ GoalSetup│→ │  Skills  │→ │ Confirm  │→ │ Result   │ (+ Growth/   │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘  Switch по    │
│        ↑              ↑             ↑            ↑        сценарию)   │
│        └────────── History API (browser back / forward) ────────┘     │
│                    sessionStorage (wizard + план)                      │
│                                                                        │
│   AuthContext (JWT access + refresh) · ProtectedRoute                  │
│                                                                        │
│   UI-компоненты:                                                       │
│   SearchableSelect · SkillCard · ScenarioCard · Alert · Toast         │
│   Stepper · Skeleton · Spinner · ErrorBoundary · FeedbackRating         │
│   Layout · NavBar · MiniProgress · SoftOnboardingHint · ShareCard      │
│                                                                        │
│   API-клиент: fetch + AbortController (отмена при размонтировании)    │
│                                                                        │
└────────────────────────────┬───────────────────────────────────────────┘
                             │
                             │ HTTP (JSON / multipart/form-data)
                             │  Authorization: Bearer … для защищённых маршрутов
                             │
┌────────────────────────────▼───────────────────────────────────────────┐
│                      FastAPI (api.py)                                   │
│                                                                        │
│   REST-эндпоинты:                   SPA Fallback:                      │
│   GET  /api/professions             /{path} → frontend/dist/index.html │
│   GET  /api/skills-for-role         POST /api/auth/register|login      │
│   GET  /api/skills-by-category      POST /api/auth/refresh|logout      │
│   GET  /api/suggest-skills          GET  /api/auth/me                  │
│   POST /api/analyze-resume          PATCH /api/auth/onboarding         │
│   POST /api/plan                    GET|POST /api/analyses               │
│   POST /api/focused-plan            GET  /api/analyses/{id}            │
│   GET  /api/share/{analysis_id}     GET|PATCH /api/progress            │
│   GET  /health                                                         │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                       БИЗНЕС-ЛОГИКА                                    │
│                                                                        │
│  ┌───────────────────┐   ┌──────────────┐   ┌───────────────────────┐ │
│  │ scenario_handler  │   │ gap_analyzer │   │ output_formatter      │ │
│  │                   │   │              │   │                       │ │
│  │ Маршрутизация:    │──▶│ Сопоставление│──▶│ Markdown-отчёт       │ │
│  │ - next_grade      │   │ текущих      │   │ (диагностика +       │ │
│  │ - change_prof     │   │ навыков с    │   │  план 70/20/10)      │ │
│  │ - explore         │   │ требованиями │   │                       │ │
│  └───────┬───────────┘   └──────────────┘   └────────────┬──────────┘ │
│          │                                                │           │
│  ┌───────▼──────────────────────┐    ┌────────────────────▼─────────┐ │
│  │ Детализация сценариев:       │    │ plan_generator              │ │
│  │                              │    │                              │ │
│  │ next_grade_service           │    │ GPT-4o:                      │ │
│  │ → ожидания по грейду,       │    │ - промпт с ролью консультанта│ │
│  │   связи навык↔параметр      │    │ - сжатая диагностика         │ │
│  │                              │    │ - RAG-контекст               │ │
│  │ switch_profession_service    │    │ - retry с backoff            │ │
│  │ → baseline, пересечения,    │    │ - fallback при недоступности │ │
│  │   кластеризация треков      │    │                              │ │
│  │                              │    │ Выход: план в формате        │ │
│  │ explore_recommendations      │    │ 70% практика                 │ │
│  │ → closest / adjacent / far  │    │ 20% менторство               │ │
│  │   категоризация ролей       │    │ 10% обучение                 │ │
│  └──────────────────────────────┘    └──────────────────────────────┘ │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                       ДАННЫЕ И NLP                                     │
│                                                                        │
│  ┌───────────────┐   ┌──────────────────┐   ┌───────────────────────┐ │
│  │ data_loader   │   │ skill_normalizer │   │ rag_service           │ │
│  │               │   │                  │   │                       │ │
│  │ JSON →        │   │ 1. lower + trim  │   │ Sentence-Transformers │ │
│  │ skills_map    │   │ 2. опечатки      │   │ E5 v2 + MiniLM        │ │
│  │ atlas_map     │   │ 3. pymorphy3 (RU)│   │ fallback (dual index) │ │
│  │ role_map      │   │    Snowball (EN) │   │                       │ │
│  │               │   │ 4. синонимы      │   │                       │ │
│  │ Методы:       │   │    (JSON-словарь)│   │ Qdrant REST API:      │ │
│  │ get_role_reqs │   │                  │   │ - suggest_skills      │ │
│  │ get_all_roles │   │ Цепочка          │   │ - map_to_canonical    │ │
│  │ get_skills_   │   │ ответственности  │   │ - rank_opportunities  │ │
│  │   for_role    │   │                  │   │ - get_rag_context     │ │
│  └───────────────┘   └──────────────────┘   └───────────────────────┘ │
│                                                                        │
│  ┌───────────────┐                                                    │
│  │ resume_parser │                                                    │
│  │               │                                                    │
│  │ 1. pypdf →    │                                                    │
│  │    текст      │                                                    │
│  │ 2. GPT-4o (3  │                                                    │
│  │    вызова):   │                                                    │
│  │    extraction │                                                    │
│  │    + rerank   │                                                    │
│  │    + level    │                                                    │
│  └───────────────┘                                                    │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                       ХРАНЕНИЕ И БЕЗОПАСНОСТЬ                          │
│                                                                        │
│  Справочники (JSON, read-only):      SQLite (путь `DB_PATH`, см. env): │
│  clean_skills.json                   users, refresh_tokens, analyses,  │
│  atlas_params_clean.json             progress                          │
│  skill_synonyms.json (+ roles.json)  bcrypt + JWT (access / refresh)   │
│                                                                        │
│  Rate limiting: register / login (окно и лимиты через `config.py`)    │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                       ВНЕШНИЕ СЕРВИСЫ                                  │
│                                                                        │
│  OpenAI GPT-4o (обязательно для резюме и планов)                       │
│  Qdrant Cloud (опционально — RAG, подсказки, ранжирование explore)     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Поток данных

### 3.1. Построение плана (основной сценарий)

```
Пользователь
    │
    ├── Выбирает профессию, сценарий, грейд  (GoalSetup)
    ├── Добавляет навыки                      (Skills)
    │   ├── Из PDF: resume_parser → GPT-4o → нормализация → [{name, level}]
    │   ├── Вручную: ввод + debounce → suggest_skills (синонимы + RAG)
    │   └── Из подсказок: fetchSkillsForRole → чипы быстрого добавления
    │
    ├── Подтверждает данные                    (Confirmation)
    │
    └── POST /api/plan
         │
         ├── 1. Нормализация навыков
         │   └── _skills_table_to_user_skills: float→int уровни + resolve_to_canonical
         │
         ├── 2. Маршрутизация сценария (scenario_handler)
         │   ├── «Следующий грейд»:    get_role_requirements(role, next_grade)
         │   ├── «Смена профессии»:    build_switch_comparison(skills, target, grade)
         │   └── «Исследование»:       explore_opportunities → rank_opportunities
         │
         ├── 3. Gap-анализ (gap_analyzer)
         │   └── Дельта по навыкам и атлас-параметрам, приоритеты, % соответствия
         │
         ├── 4. Форматирование (output_formatter)
         │   ├── Markdown-диагностика (шаг 1)
         │   └── Вызов plan_generator с RAG-контекстом (шаг 2)
         │
         └── 5. Ответ: { markdown, role_titles?, analysis? }
              analysis — структура для UI (radar, skill_gaps, explore-роли и т.д.)
```

### 3.2. Нормализация навыков (цепочка ответственности)

```
Пользовательский ввод
    │
    ├─ 1. Точное совпадение (lowercase) в словаре синонимов
    │     → найдено? → каноническое имя
    │
    ├─ 2. Нормализация текста:
    │     - lowercase, trim, collapse spaces
    │     - замена опечаток (питон → python, дата саенс → data science)
    │     - лемматизация слов:
    │       - русский → pymorphy3 (разработка→разработка, разработчик→разработка)
    │       - английский → Snowball stemmer (developing→develop)
    │     → нормализованная форма в словаре синонимов? → каноническое имя
    │
    ├─ 3. Перебор ключей словаря: normalize(key) == normalize(input)?
    │     → найдено? → каноническое имя
    │
    └─ 4. Не найдено → None (навык используется as-is)
```

### 3.3. RAG pipeline

```
build_rag_index.py (офлайн):
    clean_skills.json + atlas_params_clean.json
        │
        ├── Формирование текстовых описаний для каждого навыка/параметра
        ├── Sentence-Transformers → эмбеддинги (размерность зависит от модели:
        │     legacy MiniLM ~384d, v2 E5-large-instruct — см. `EMBED_MODEL_NAME*`)
        └── Загрузка в Qdrant с metadata (тип, название, профессия)

Runtime (при запросах):
    Вход: текстовый запрос (навык / описание)
        │
        ├── Sentence-Transformers → embedding запроса
        ├── Qdrant: cosine similarity search (top_k, score_threshold)
        └── Результат: релевантные навыки / контекст для плана
```

---

## 4. Frontend-архитектура

### 4.1. Состояние и навигация

```
                     ┌─────────────────────┐
                     │     App.tsx          │
                     │                     │
                     │ state: AppState     │◄── sessionStorage (persist)
                     │ screen: Screen      │◄── History API (browser back)
                     │ plan: PlanResponse  │◄── sessionStorage (persist)
                     │                     │
                     │ update(patch)       │
                     │ reset()             │
                     │ setScreen(s)        │──▶ pushState / replaceState
                     └──────────┬──────────┘
                                │ props
          ┌─────────┬───────────┼───────────┬──────────┐
          ▼         ▼           ▼           ▼          ▼
     Welcome   GoalSetup    Skills    Confirmation  Result
```

**Persistence:** весь `AppState` сериализуется в `sessionStorage` при каждом изменении. При загрузке страницы восстанавливается из хранилища. F5 / случайный refresh не теряет прогресс.

**Навигация:** каждый переход записывает хэш (`#goal`, `#skills`, ...) через `history.pushState`. Событие `popstate` обрабатывает кнопку «Назад» браузера.

### 4.2. Компонентная иерархия

```
ErrorBoundary                    ← перехват непредвиденных ошибок
  └── ThemeProvider              ← dark/light тема (localStorage)
       └── App                   ← состояние + навигация
            ├── PublicLanding / Auth / Onboarding / Dashboard
            ├── GoalSetup
            │    ├── Layout (header + stepper + footer)
            │    ├── SearchableSelect (комбобокс профессий)
            │    ├── ScenarioCard × 3
            │    └── SkeletonForm (загрузка)
            ├── Skills
            │    ├── Layout
            │    ├── Dropzone (react-dropzone)
            │    ├── Combobox (input + suggestions dropdown)
            │    ├── SkillCard × N (с уровнем + удалением)
            │    └── SkillQualityBar (прогресс 0→7+)
            ├── Confirmation
            │    ├── Layout
            │    ├── Summary (dl/dt/dd)
            │    └── Expandable skills chips
            └── Result (+ GrowthPage / SwitchPage по сценарию)
                 ├── Layout (wide)
                 ├── ReactMarkdown + remarkGfm · Recharts (radar)
                 ├── Desktop TOC (sticky sidebar)
                 ├── Mobile TOC (bottom sheet)
                 └── FeedbackRating / фокусный план (POST /api/focused-plan)
       └── ToastContainer          ← глобальные toast-уведомления
```

### 4.3. API-клиент

Все запросы проходят через централизованный `api/client.ts`:

- Generic `request<T>(url, init, signal)` с типизированными ответами
- `ApiError` класс с HTTP-статусом для дифференцированной обработки
- Каждая функция принимает опциональный `AbortSignal`
- Компоненты создают `AbortController` в `useEffect` и отменяют при unmount

### 4.4. Дизайн-система

**Темы:** CSS-переменные переключаются классом `.dark` на `<html>`. 12 токенов (surface, border, text, accent). Тема сохраняется в `localStorage`, при первой загрузке определяется из `prefers-color-scheme`.

**Компонентные классы (Tailwind `@layer components`):**
- `.btn-primary`, `.btn-secondary` — кнопки
- `.card` — карточки с тенью
- `.input-field` — поля ввода
- `.label`, `.helper` — подписи к полям

**Анимации:**
- `.fade-in` — плавное появление (opacity)
- `.slide-up` — появление снизу (translateY + opacity)
- `.skill-card-enter` — появление слева (translateX + scale)

---

## 5. Ключевые архитектурные решения

| Решение | Обоснование |
|---------|-------------|
| **Монолитный деплой** | Один сервис = один контейнер. Подходит для MVP; CORS в коде широкий — при публичном API с несколькими origin сузить |
| **SQLite + JWT** | Пользователи, сохранённые анализы, прогресс по навыкам, refresh-токены без отдельной СУБД на старте |
| **Rate limit на auth** | Защита от перебора паролей на `/api/auth/register` и `/api/auth/login` |
| **RAG вместо fine-tuning** | При обновлении данных достаточно переиндексировать Qdrant. Без затрат на переобучение модели |
| **pymorphy3 вместо NLTK Snowball** | Лемматизация точнее стемминга для русского языка. «разработка» и «разработчик» → одна лемма |
| **Ленивая загрузка ML** | Sentence-Transformers и PyTorch грузятся только при первом RAG-запросе. Ускоряет старт |
| **Qdrant через REST** | Без gRPC/protobuf — меньше зависимостей, меньший Docker-образ |
| **sessionStorage** | Состояние wizard-а переживает F5, но не переживает закрытие вкладки (приватность) |
| **History API** | Browser back/forward работает интуитивно. Нет тяжёлого React Router для линейного flow |
| **AbortController** | Отмена HTTP-запросов при быстрой навигации предотвращает race conditions |
| **Toast + undo** | Мгновенное удаление с возможностью отмены лучше модального подтверждения |

---

## 6. Ограничения и компромиссы

- Резюме обрезается до `RESUME_TEXT_MAX_CHARS` (по умолчанию 14 000 символов) перед отправкой в LLM
- Контекст для генератора плана ограничен `PLAN_CONTEXT_MAX_CHARS` (по умолчанию 12 000 символов)
- Ответ плана ограничен `max_tokens`; при ошибке API — retry с backoff, затем fallback
- **SQLite:** горизонтальное масштабирование нескольких воркеров с записью в одну БД без общего диска или миграции на PostgreSQL затруднительно; при ephemeral-контейнере без тома для `DB_PATH` возможен рассинхрон JWT и данных (`USER_NOT_FOUND` — см. README)
- **Аутентификация:** есть JWT и хранение анализов; нет полноценного SSO/OAuth «из коробки»
- Rate limiting включён для **регистрации и логина**, не для всех публичных эндпоинтов
- Нет i18n — интерфейс ориентирован на русский язык
