# Фаза 1: Обновление бэкенда и конфигурации


Загружаем все Python-модули бэкенда, данные (JSON), конфигурационные файлы и скрипты. Файлы, которые уже есть в репозитории, будут обновлены до актуальной версии.


## Коммит-сообщение
```
feat: обновление бэкенда — NLP-пайплайн, RAG, авторизация, оценка навыков
```


## Статистика

- Новых файлов: 23
- Обновлённых файлов: 8
- Удалить файлов: 0


## Новые файлы (загрузить)

- `.gitignore`
- `Procfile`
- `build_rag_index.py`
- `data/atlas_params_clean.json`
- `data/clean_skills.json`
- `data/skill_synonyms.json`
- `data_loader.py`
- `explore_recommendations.py`
- `gap_analyzer.py`
- `main.py`
- `next_grade_service.py`
- `output_formatter.py`
- `plan_generator.py`
- `rag_service.py`
- `requirements-docker.txt`
- `resume_parser.py`
- `run.sh`
- `runtime.txt`
- `scenario_handler.py`
- `scripts/reindex_qdrant.py`
- `scripts/threshold_analysis.py`
- `skill_normalizer.py`
- `switch_profession_service.py`

## Обновлённые файлы (заменить содержимое)

- `api.py`
- `confidence_utils.py`
- `config.py`
- `db.py`
- `eval.py`
- `llm_observability.py`
- `rate_limiter.py`
- `requirements.txt`

## Как загрузить

1. Откройте https://github.com/superdash7/career_copilot_
2. **Add file → Upload files**
3. Перетащите ВСЕ файлы и папки из `files/` этого пакета
4. GitHub сохранит структуру каталогов
5. Введите коммит-сообщение из раздела выше
6. Нажмите **Commit changes**


## Примечания
Файлы `faithfulness.py`, `reindex_qdrant.py`, `threshold_analysis.py` сейчас лежат в корне чистового репо — в этом пакете они загружаются по правильным путям (`eval_metrics/`, `scripts/`). Старые копии в корне удалим на фазе 4.
