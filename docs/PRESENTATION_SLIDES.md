# Career Copilot — Слайды для защиты

---

## Слайд 1. Технологический стек (детальный)

| Технология | Версия | Назначение |
|---|---|---|
| Python | 3.12 | Основной язык бэкенда |
| FastAPI | ≥ 0.100 | REST API с автогенерацией OpenAPI-документации |
| Uvicorn | ≥ 0.22 | ASGI-сервер |
| Pydantic | v2 | Валидация запросов/ответов |
| pymorphy3 | ≥ 2.0 | Лемматизация русского языка (замена NLTK-стемминга) |
| Sentence-Transformers | ≥ 2.2 | Мультиязычные эмбеддинги для RAG |
| PyTorch | CPU | Runtime для Sentence-Transformers |
| pypdf | ≥ 3.0 | Извлечение текста из PDF |
| scikit-learn | ≥ 1.0 | Кластеризация навыков (KMeans) |
| OpenAI SDK | ≥ 1.0 | Взаимодействие с GPT-4o / GPT-4o-mini |
| RapidFuzz | — | Нечёткое сопоставление строк (гибридный поиск) |
| tiktoken | ≥ 0.5 | Подсчёт токенов, оценка стоимости LLM-вызовов |
| bcrypt, PyJWT | — | Хеширование паролей, access/refresh JWT |
| SQLite (stdlib + db.py) | — | Пользователи, анализы, прогресс, сессии refresh |
| React | 19 | SPA-фронтенд |
| TypeScript | 5.9 | Строгая типизация фронтенда |
| Vite | 7 | Сборка и HMR |
| Tailwind CSS | 4 | Утилитарный CSS-фреймворк |
| Recharts | 3 | Визуализация (radar-чарты gap-анализа) |

---

## Слайд 2. Технологический стек (по блокам)

| Блок | Технологии |
|---|---|
| Фронтенд | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, Recharts, Lucide React — реализовано через Cursor AI |
| Бэкенд | Python 3.12, FastAPI, Uvicorn, Pydantic v2 |
| NLP | pymorphy3 (лемматизация RU), NLTK Snowball (стемминг EN), Sentence-Transformers, RapidFuzz (нечёткое сопоставление) |
| Эмбеддинги | multilingual-e5-large-instruct (1024-d), paraphrase-multilingual-MiniLM-L12-v2 (384-d, fallback) |
| Векторная БД | Qdrant Cloud (REST API, cosine similarity) |
| БД | SQLite (stdlib) — пользователи, анализы, прогресс, refresh-сессии |
| Генеративный ИИ | OpenAI GPT-4o (temperature 0.3, structured output) |
| Инфраструктура | Railway (Docker multi-stage: Node 20 → Python 3.12-slim) |

---

## Дополнительные детали для вопросов комиссии

### Архитектурные решения

- **Монолитный контейнер** — FastAPI раздаёт и API, и собранный SPA из одного образа
- **Гибридный поиск** — dense (E5) + lexical (RapidFuzz Jaccard/token_sort) + RRF-фьюжн
- **Двойная модель эмбеддингов** — E5-large-instruct для точного маппинга навыков, MiniLM для быстрого RAG
- **Без Qdrant SDK** — прямое взаимодействие через REST для минимизации образа
- **Graceful degradation** — приложение работает без Qdrant (теряя семантические подсказки)

### Модели OpenAI

| Модель | Temperature | Назначение |
|---|---|---|
| gpt-4o | 0.0–0.1 | Извлечение навыков из резюме (JSON mode) |
| gpt-4o-mini | 0.0 | Пакетный реранкинг, классификация навыков |
| gpt-4o | 0.2–0.3 | Генерация плана развития 70/20/10 |

### Pipeline обработки резюме

```
PDF (pypdf) → текст → GPT-4o extraction → E5 hybrid retrieval
  → GPT-4o-mini batch rerank → GPT-4o-mini level assessment → нормализованные навыки
```
