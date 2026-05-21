# Деплой AI Career Pathfinder на Railway

## Что будет работать после деплоя

Один сервис на Railway, один URL. FastAPI (`api.py`) отдаёт:

- `/api/*`, `/health` — REST API (бэкенд)
- всё остальное — React SPA (фронтенд из `frontend/dist`)

---

## Пошаговая инструкция

### 1. Убедитесь, что репозиторий содержит нужные файлы

В корне проекта должны быть:

```
Dockerfile               ← мульти-стейдж: Node собирает фронт, Python запускает API
railway.toml             ← config-as-code: билдер Dockerfile
requirements-docker.txt  ← зависимости только для API в Docker (без Gradio/eval — меньше диска на билдере)
requirements.txt         ← полный набор для локальной разработки (Gradio, eval, …)
api.py                   ← FastAPI с SPA-фолбэком
frontend/                ← React-приложение (исходники)
data/                    ← JSON-файлы (навыки, атлас)
```

Файл `Dockerfile` уже есть в репозитории. Он делает:

1. Стейдж 1 (**Node 20 Alpine**): `npm ci` + `npm run build` → `frontend/dist` (меньше базовый образ, чем `debian-slim`; `NODE_OPTIONS` с увеличенным heap для `tsc`/`vite`)
2. Стейдж 2 (**Python 3.12 slim**): `pip install -r requirements-docker.txt`, затем **явный `COPY` только нужных `.py` и каталога `data/`** (без `COPY . .` — меньше распаковка на диске билдера) + копирование `frontend/dist` из стейджа 1
3. Запуск: `python api.py` (внутри — `uvicorn` на `PORT` из окружения Railway)

В корне репозитория есть **`railway.toml`**, который фиксирует билдер **Dockerfile** (на случай, если в Dashboard выбран другой режим сборки).

### Сообщение «Build failed / failed to leave the wheelhouse»

Это обобщённая ошибка Railway: нужны **полные логи сборки** (Deployments → конкретный деплой → Build logs). Частые причины:

- **Стейдж Python**: не успел скачаться/установиться `torch` или другой крупный пакет (таймаут сети, лимит диска). Повторите деплой или увеличьте лимиты плана. Если в логах **«no space left on device»** на этапе BuildKit — либо образ слишком тяжёлый для диска билдера (в Docker используется **`requirements-docker.txt`** без Gradio/eval), либо **переполнен диск shared Metal-билдера** у Railway (ошибка может появиться даже на шаге записи `Dockerfile` при маленьком репозитории). Во втором случае: повторите деплой позже, напишите в поддержку Railway или используйте **образ из GHCR** (см. ниже).
- **Стейдж Node**: падение `npm ci` (рассинхрон `package-lock.json` с `package.json`), нехватка памяти на `tsc`/`vite build` или редкая несовместимость нативных модулей с **Alpine** — тогда временно замените в корневом `Dockerfile` базу стейджа 1 на `node:20-slim` и пересоберите.

### Обход Railway: образ из GitHub Container Registry (GHCR)

В репозитории включён workflow **`.github/workflows/docker-ghcr.yml`**: при пуше в `main` образ собирается на **GitHub Actions** (обычно без проблемы «no space» на чтении Dockerfile) и публикуется в **`ghcr.io/<owner>/<repo>:latest`**.

1. Убедитесь, что workflow прошёл зелёным (**Actions** → **Build and push Docker image to GHCR**).
2. В GitHub → **Packages** откройте созданный пакет; при необходимости сделайте пакет **public** или выдайте Railway доступ по **PAT** с `read:packages`.
3. В Railway создайте сервис **Deploy Docker image** (или переключите существующий источник на образ) и укажите тот же тег, например `ghcr.io/superdash777/career_buid_sysytem:latest`.
4. Перенесите **Variables** (OpenAI, JWT, DB_PATH и т.д.) и при необходимости том **`/app/data`**.

### Если поддержка Railway подтвердила сбой билдера

Сообщение вроде **«persistent infrastructure issue on the build machine»**, **«builder ran out of disk space before it could even read the Dockerfile»** означает: диск **конкретного** shared-билдера исчерпан **до** начала вашей сборки — это **не ошибка Dockerfile и не размер репозитория**. Повторные деплои могут снова попадать на тот же узел и падать, пока Railway не очистит диск или не перенесёт вас на другой билдер.

**Что делать:** продолжить переписку с **Railway Support** (пусть сбросят/переведут билд) и **параллельно** выкатывать сервис с **готового образа из GHCR** по workflow выше — сборка идёт на GitHub Actions, не на проблемной машине Railway.

### 2. Откройте Railway Dashboard

Идём в [railway.app](https://railway.app) → ваш проект.

### 3. Если сервис уже существует (подключён к репозиторию)

#### 3a. Переключите билдер на Dockerfile

1. Откройте сервис → **Settings**
2. В секции **Build** → **Builder** выберите **Dockerfile**
3. Поле **Dockerfile Path** оставьте пустым (или укажите `Dockerfile`)
4. Нажмите **Save** / подтвердите

#### 3b. Измените Start Command (если нужно)

Обычно Railway подхватывает `CMD` из Dockerfile автоматически.
Если нужно явно — в **Settings → Deploy → Start Command**:

```
uvicorn api:app --host 0.0.0.0 --port $PORT
```

#### 3c. Установите переменные окружения

Перейдите в **Variables** и добавьте:

| Переменная | Обязательность | Описание |
|---|---|---|
| `OPENAI_API_KEY` | Рекомендуется | Ключ OpenAI. Без него парсинг резюме вернёт 503, а генерация планов через LLM не будет работать |
| `QDRANT_URL` | Опционально | URL Qdrant-кластера для RAG-подсказок |
| `QDRANT_API_KEY` | Опционально | API-ключ Qdrant |
| `DB_PATH` | **Рекомендуется для продакшена** | Путь к SQLite на постоянном томе. Том на **`/app/data`** поддержан: образ содержит копию JSON в **`_data_shipped`**, приложение подхватывает её, если том пустой. Либо том на **`/data`** и `DB_PATH=/data/app.db`. Без тома база эфемерна → возможен 401 `USER_NOT_FOUND` после деплоя |
| `JWT_SECRET` | Рекомендуется | Стабильный секрет; без него при смене инстанса подпись может не совпасть с ожиданиями клиента |

> `PORT` добавлять **не нужно** — Railway устанавливает его автоматически.

#### 3d. Задеплойте

Railway деплоит автоматически при пуше в подключённую ветку.

Если нужно задеплоить вручную:
- Кнопка **Deploy** в Dashboard
- Или: поменяйте ветку в **Settings → Source → Branch** на `cursor/mvp-de67`

### 4. Если создаёте новый сервис с нуля

1. **New Project** (или **+ New Service** в существующем проекте)
2. Выберите **Deploy from GitHub Repo**
3. Найдите репозиторий `career_buid_sysytem`
4. Railway определит `Dockerfile` и начнёт билд
5. Если не определил — зайдите в **Settings → Build → Builder → Dockerfile**
6. Добавьте переменные (см. п. 3c)
7. Дождитесь деплоя, откройте сгенерированный URL

### 5. Откройте приложение

После успешного деплоя:

1. Перейдите на вкладку **Settings → Networking → Public Networking**
2. Нажмите **Generate Domain** (если домена ещё нет)
3. Откройте сгенерированный URL — увидите Welcome-экран фронтенда

---

## Проверка работоспособности

```bash
# Замените <YOUR_DOMAIN> на ваш Railway-домен
curl https://<YOUR_DOMAIN>/health
# Ожидание: {"status":"ok"}

curl https://<YOUR_DOMAIN>/api/professions
# Ожидание: {"professions":["Product Manager","..."]}

# Откройте в браузере:
open https://<YOUR_DOMAIN>
# Ожидание: Welcome-экран "AI Career Pathfinder"
```

---

## Типичные проблемы

### Билд падает на `npm run build`

Проверьте, что в репозитории есть `frontend/package-lock.json`. Без него `npm ci` не работает.

### Билд падает на `pip install` (torch)

В `requirements.txt` первой строкой стоит `--extra-index-url https://download.pytorch.org/whl/cpu` — это нормально, CPU-версия torch ставится быстрее и весит меньше. Если всё равно не хватает памяти — увеличьте план Railway или временно уберите `torch` + `sentence-transformers` (RAG-фичи отключатся, остальное будет работать).

### Фронтенд не открывается (404 или JSON вместо HTML)

Убедитесь, что:
- `api.py` содержит блок `# Serve React frontend` в конце файла
- Dockerfile копирует `frontend/dist` командой `COPY --from=frontend-build`
- Ветка, из которой деплоите, содержит все изменения (push прошёл)

### Резюме-парсинг возвращает 503

Это ожидаемое поведение, если `OPENAI_API_KEY` не задан. Фронтенд покажет сообщение «Авторазбор резюме временно недоступен» и предложит добавить навыки вручную.

### Railway не видит Dockerfile

Зайдите в **Settings → Build → Builder** и вручную выберите **Dockerfile**.

---

## Локальная проверка перед деплоем

```bash
# Собрать и запустить через Docker локально:
docker build -t career-pathfinder .
docker run -p 8000:8000 -e OPENAI_API_KEY=sk-... career-pathfinder

# Открыть http://localhost:8000
```

---

## Структура деплоя (итого)

```
Railway Service
├── Dockerfile (мульти-стейдж)
│   ├── Stage 1: node:20 → npm ci + npm run build
│   └── Stage 2: python:3.12 → pip install + uvicorn
├── Переменные: OPENAI_API_KEY, (QDRANT_URL, QDRANT_API_KEY)
└── Порт: $PORT (автоматически от Railway)
```

Один контейнер, один сервис, один URL — бэкенд + фронтенд вместе.
