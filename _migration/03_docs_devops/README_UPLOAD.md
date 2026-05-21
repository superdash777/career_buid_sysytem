# Фаза 3: Документация, тесты и DevOps


Загружаем документацию (дипломный отчёт, архитектура, ISO-описание), тесты, Docker-конфигурацию и CI/CD workflow.


## Коммит-сообщение
```
feat: документация (диплом, ISO 24765), тесты, Docker-деплой, CI/CD (GitHub Actions → GHCR)
```


## Статистика

- Новых файлов: 25
- Обновлённых файлов: 2
- Удалить файлов: 0


## Новые файлы (загрузить)

- `.dockerignore`
- `.github/workflows/docker-ghcr.yml`
- `Dockerfile`
- `demo_pipeline.ipynb`
- `docs/ARCHITECTURE.md`
- `docs/DEPLOY_RAILWAY.md`
- `docs/DIPLOMA_NLP_LLM_RAG_REPORT.md`
- `docs/SYSTEM_DESCRIPTION_ISO24765.md`
- `docs/TECHNICAL_DESCRIPTION.md`
- `eval_dataset.json`
- `eval_metrics/faithfulness.py`
- `eval_results/.gitkeep`
- `railway.toml`
- `tests/test_api_auth_user_not_found.py`
- `tests/test_auth_config.py`
- `tests/test_eval_metrics.py`
- `tests/test_explore_recommendations.py`
- `tests/test_next_grade_service.py`
- `tests/test_plan_generator.py`
- `tests/test_rag_hybrid.py`
- `tests/test_rate_limiter.py`
- `tests/test_resume_pipeline_v2.py`
- `tests/test_skill_normalizer.py`
- `tests/test_switch_profession_service.py`
- `tests/test_weighted_gap_scoring.py`

## Обновлённые файлы (заменить содержимое)

- `README.md`
- `docker-compose.yml`

## Как загрузить

1. Откройте https://github.com/superdash7/career_copilot_
2. **Add file → Upload files**
3. Перетащите ВСЕ файлы и папки из `files/` этого пакета
4. GitHub сохранит структуру каталогов
5. Введите коммит-сообщение из раздела выше
6. Нажмите **Commit changes**
