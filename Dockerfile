# ---- Stage 1: build React frontend ----
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
# Railway builders can be memory-tight; Vite/tsc benefit from a higher heap ceiling.
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Python runtime ----
FROM python:3.12-slim
WORKDIR /app

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=180 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
# Fresh pip + wheel tooling reduces flaky "wheel" resolution; long timeout helps big wheels (torch).
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Duplicate reference JSON so a volume mounted on /app/data (SQLite) does not hide clean_skills.json etc.
RUN cp -a /app/data /app/_data_shipped && mkdir -p /app/data

EXPOSE 8000
CMD ["python", "api.py"]
