# ---- Stage 1: Vite/React (Alpine — меньше базовый образ и слой на билдере, чем node:*-slim) ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: API (явный COPY вместо «COPY . .» — меньше распаковка и служебные файлы на диске билдера) ----
FROM python:3.12-slim
WORKDIR /app

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=180 \
    PYTHONUNBUFFERED=1

COPY requirements-docker.txt ./requirements-docker.txt
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements-docker.txt \
    && apt-get purge -y build-essential \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/* /root/.cache/pip

# При добавлении нового корневого .py, импортируемого из api.py, добавьте файл в этот COPY.
COPY api.py confidence_utils.py config.py data_loader.py db.py explore_recommendations.py \
    gap_analyzer.py llm_observability.py next_grade_service.py output_formatter.py plan_generator.py \
    rag_service.py rate_limiter.py resume_parser.py scenario_handler.py skill_normalizer.py \
    switch_profession_service.py ./

COPY data ./data

COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN cp -a /app/data /app/_data_shipped && mkdir -p /app/data

EXPOSE 8000
CMD ["python", "api.py"]
