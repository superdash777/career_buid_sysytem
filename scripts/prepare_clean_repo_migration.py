#!/usr/bin/env python3
"""
Создаёт пакеты файлов для пошаговой загрузки в чистовой репозиторий
(superdash7/career_copilot_), учитывая его текущее состояние.

Анализ чистового репо (на 21 мая 2026):
- career_buid_sysytem-main/ — старый снимок проекта (фев 2026), в подпапке
- 23 .tsx/.ts файла в корне — фронтенд-компоненты БЕЗ структуры каталогов
- 13 Python/config файлов в корне — часть корректно, часть устарели
- frontend/src/api/client.ts, frontend/src/types/index.ts — корректные пути
- README.md в корне

Скрипт создаёт 4 пакета для последовательной загрузки.
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

DRAFT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = DRAFT_ROOT / "_migration"

SKIP_PATTERNS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    ".env", "_migration", "package-lock.json", "frontend/dist",
    "scripts/prepare_migration.py", "scripts/prepare_clean_repo_migration.py",
    "docs/MIGRATION_GUIDE.md", "main_scrpt_fixed (1).ipynb",
}

MISPLACED_ROOT_TSX = [
    "App.tsx", "Auth.tsx", "AuthContext.tsx", "Button.tsx", "Dashboard.tsx",
    "Eyebrow.tsx", "FocusedPlanSection.tsx", "GridBg.tsx", "GrowthPage.tsx",
    "HRLanding.tsx", "KanbanBoard.tsx", "LoadingCarousel.tsx", "main.tsx",
    "Mark.tsx", "MonoLabel.tsx", "OnboardingQuiz.tsx", "ProtectedRoute.tsx",
    "PublicLanding.tsx", "ShareCard.tsx", "SkillAlternativeSelect.tsx",
    "SkillConfidenceBadge.tsx", "SwitchPage.tsx", "wizardResume.ts",
]

MISPLACED_ROOT_PY = [
    "faithfulness.py", "reindex_qdrant.py", "threshold_analysis.py",
]


def should_skip(filepath: str) -> bool:
    parts = Path(filepath).parts
    for skip in SKIP_PATTERNS:
        if skip in parts or filepath == skip or filepath.startswith(skip + "/"):
            return True
    return False


def copy_from_draft(src_rel: str, dest_dir: Path):
    src = DRAFT_ROOT / src_rel
    dst = dest_dir / src_rel
    if src.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)


def write_readme(phase_dir: Path, title: str, description: str,
                 commit_msg: str, files_add: list, files_update: list,
                 files_delete: list, notes: str = ""):
    lines = [
        f"# {title}\n",
        f"\n{description}\n",
        f"\n## Коммит-сообщение\n```\n{commit_msg}\n```\n",
        f"\n## Статистика\n",
        f"- Новых файлов: {len(files_add)}",
        f"- Обновлённых файлов: {len(files_update)}",
        f"- Удалить файлов: {len(files_delete)}\n",
    ]

    if files_add:
        lines.append("\n## Новые файлы (загрузить)\n")
        for f in sorted(files_add):
            lines.append(f"- `{f}`")

    if files_update:
        lines.append("\n## Обновлённые файлы (заменить содержимое)\n")
        for f in sorted(files_update):
            lines.append(f"- `{f}`")

    if files_delete:
        lines.append("\n## Файлы для удаления\n")
        for f in sorted(files_delete):
            lines.append(f"- `{f}`")

    lines.append("\n## Как загрузить\n")
    lines.append(
        "1. Откройте https://github.com/superdash7/career_copilot_\n"
        "2. **Add file → Upload files**\n"
        "3. Перетащите ВСЕ файлы и папки из `files/` этого пакета\n"
        "4. GitHub сохранит структуру каталогов\n"
        "5. Введите коммит-сообщение из раздела выше\n"
        "6. Нажмите **Commit changes**\n"
    )

    if files_delete:
        lines.append(
            "\n### Удаление файлов\n"
            "Для каждого файла из списка «Файлы для удаления»:\n"
            "1. Найдите файл в репозитории на GitHub\n"
            "2. Нажмите на файл → кнопка «⋯» (три точки) → **Delete file**\n"
            "3. Нажмите **Commit changes**\n"
        )

    if notes:
        lines.append(f"\n## Примечания\n{notes}\n")

    (phase_dir / "README_UPLOAD.md").write_text("\n".join(lines), encoding="utf-8")


def phase_1_backend():
    """Бэкенд: все Python-модули, данные, конфигурация."""
    phase_dir = OUTPUT_DIR / "01_backend"
    files_dir = phase_dir / "files"
    if phase_dir.exists():
        shutil.rmtree(phase_dir)
    files_dir.mkdir(parents=True)

    backend_files = [
        "api.py", "main.py", "config.py", "db.py",
        "data_loader.py", "skill_normalizer.py", "resume_parser.py",
        "rag_service.py", "scenario_handler.py", "next_grade_service.py",
        "switch_profession_service.py", "explore_recommendations.py",
        "gap_analyzer.py", "output_formatter.py", "plan_generator.py",
        "build_rag_index.py", "confidence_utils.py", "llm_observability.py",
        "rate_limiter.py", "eval.py",
    ]
    data_files = [
        "data/atlas_params_clean.json",
        "data/clean_skills.json",
        "data/skill_synonyms.json",
    ]
    config_files = [
        "requirements.txt", "requirements-docker.txt",
        "runtime.txt", "Procfile", "run.sh",
        ".gitignore",
    ]
    script_files = [
        "scripts/reindex_qdrant.py",
        "scripts/threshold_analysis.py",
    ]

    all_files = backend_files + data_files + config_files + script_files
    new_files = []
    update_files = []

    already_in_clean_root = {
        "api.py", "config.py", "db.py", "confidence_utils.py",
        "eval.py", "llm_observability.py", "rate_limiter.py",
        "requirements.txt", "docker-compose.yml",
    }

    for f in all_files:
        copy_from_draft(f, files_dir)
        if f in already_in_clean_root:
            update_files.append(f)
        else:
            new_files.append(f)

    write_readme(
        phase_dir,
        title="Фаза 1: Обновление бэкенда и конфигурации",
        description=(
            "Загружаем все Python-модули бэкенда, данные (JSON), "
            "конфигурационные файлы и скрипты. Файлы, которые уже есть "
            "в репозитории, будут обновлены до актуальной версии."
        ),
        commit_msg="feat: обновление бэкенда — NLP-пайплайн, RAG, авторизация, оценка навыков",
        files_add=new_files,
        files_update=update_files,
        files_delete=[],
        notes=(
            "Файлы `faithfulness.py`, `reindex_qdrant.py`, `threshold_analysis.py` "
            "сейчас лежат в корне чистового репо — в этом пакете они загружаются "
            "по правильным путям (`eval_metrics/`, `scripts/`). "
            "Старые копии в корне удалим на фазе 4."
        ),
    )
    print(f"  Фаза 1: {len(new_files)} новых + {len(update_files)} обновлённых файлов")
    return new_files, update_files


def phase_2_frontend():
    """Фронтенд: все файлы с правильной структурой каталогов."""
    phase_dir = OUTPUT_DIR / "02_frontend"
    files_dir = phase_dir / "files"
    if phase_dir.exists():
        shutil.rmtree(phase_dir)
    files_dir.mkdir(parents=True)

    frontend_root = DRAFT_ROOT / "frontend"
    new_files = []
    update_files = []

    already_in_clean = {
        "frontend/src/api/client.ts",
        "frontend/src/types/index.ts",
    }

    for root, dirs, files in os.walk(frontend_root):
        dirs[:] = [d for d in dirs if d not in ("node_modules", "dist", ".git")]
        for fname in files:
            if fname == "package-lock.json":
                continue
            full_path = Path(root) / fname
            rel_path = str(full_path.relative_to(DRAFT_ROOT))

            copy_from_draft(rel_path, files_dir)
            if rel_path in already_in_clean:
                update_files.append(rel_path)
            else:
                new_files.append(rel_path)

    write_readme(
        phase_dir,
        title="Фаза 2: Полное обновление фронтенда",
        description=(
            "Загружаем все файлы фронтенда (React + TypeScript + Tailwind CSS) "
            "с **правильной структурой каталогов**. Это создаст полную "
            "фронтенд-архитектуру: компоненты, экраны, стили, навигация, авторизация."
        ),
        commit_msg=(
            "feat: обновление фронтенда — модульная архитектура, "
            "Tailwind CSS, авторизация, дашборд, kanban"
        ),
        files_add=new_files,
        files_update=update_files,
        files_delete=[],
        notes=(
            "После загрузки этой фазы в репозитории появится полная структура `frontend/src/`.\n\n"
            "Файлы `.tsx` в корне репозитория (App.tsx, Dashboard.tsx и т.д.) — это "
            "старые копии без правильных путей. Их удалим на фазе 4."
        ),
    )
    print(f"  Фаза 2: {len(new_files)} новых + {len(update_files)} обновлённых файлов")
    return new_files, update_files


def phase_3_docs_devops():
    """Документация, тесты, Docker, CI/CD."""
    phase_dir = OUTPUT_DIR / "03_docs_devops"
    files_dir = phase_dir / "files"
    if phase_dir.exists():
        shutil.rmtree(phase_dir)
    files_dir.mkdir(parents=True)

    files_list = [
        "README.md",
        "Dockerfile",
        "docker-compose.yml",
        ".dockerignore",
        "railway.toml",
        ".github/workflows/docker-ghcr.yml",
        "docs/ARCHITECTURE.md",
        "docs/DEPLOY_RAILWAY.md",
        "docs/TECHNICAL_DESCRIPTION.md",
        "docs/SYSTEM_DESCRIPTION_ISO24765.md",
        "docs/DIPLOMA_NLP_LLM_RAG_REPORT.md",
        "eval_dataset.json",
        "eval_metrics/faithfulness.py",
        "eval_results/.gitkeep",
        "demo_pipeline.ipynb",
    ]

    test_dir = DRAFT_ROOT / "tests"
    if test_dir.exists():
        for f in sorted(test_dir.iterdir()):
            if f.is_file():
                files_list.append(f"tests/{f.name}")

    already_in_clean = {"README.md", "docker-compose.yml"}

    new_files = []
    update_files = []

    for f in files_list:
        copy_from_draft(f, files_dir)
        if f in already_in_clean:
            update_files.append(f)
        else:
            new_files.append(f)

    write_readme(
        phase_dir,
        title="Фаза 3: Документация, тесты и DevOps",
        description=(
            "Загружаем документацию (дипломный отчёт, архитектура, ISO-описание), "
            "тесты, Docker-конфигурацию и CI/CD workflow."
        ),
        commit_msg=(
            "feat: документация (диплом, ISO 24765), тесты, "
            "Docker-деплой, CI/CD (GitHub Actions → GHCR)"
        ),
        files_add=new_files,
        files_update=update_files,
        files_delete=[],
    )
    print(f"  Фаза 3: {len(new_files)} новых + {len(update_files)} обновлённых файлов")
    return new_files, update_files


def phase_4_cleanup():
    """Удаление неправильно размещённых файлов."""
    phase_dir = OUTPUT_DIR / "04_cleanup"
    if phase_dir.exists():
        shutil.rmtree(phase_dir)
    phase_dir.mkdir(parents=True)

    files_to_delete = sorted(MISPLACED_ROOT_TSX + MISPLACED_ROOT_PY)

    career_folder_files = []
    clean_repo = Path("/tmp/clean_repo/career_buid_sysytem-main")
    if clean_repo.exists():
        for root, dirs, files in os.walk(clean_repo):
            for fname in files:
                full = Path(root) / fname
                rel = str(full.relative_to(Path("/tmp/clean_repo")))
                career_folder_files.append(rel)

    write_readme(
        phase_dir,
        title="Фаза 4: Очистка — удаление устаревших файлов",
        description=(
            "Удаляем файлы, которые были загружены в неправильные пути:\n\n"
            "- **23 файла .tsx/.ts в корне** — это фронтенд-компоненты, "
            "которые теперь лежат по правильным путям в `frontend/src/`\n"
            "- **3 файла .py в корне** — скрипты, перенесённые в `scripts/` и `eval_metrics/`\n"
            "- **Папка `career_buid_sysytem-main/`** — старый снимок проекта "
            "(опционально, см. примечания)"
        ),
        commit_msg="chore: удаление дублирующихся файлов после реструктуризации",
        files_add=[],
        files_update=[],
        files_delete=files_to_delete,
        notes=(
            "### Про папку `career_buid_sysytem-main/`\n\n"
            f"Эта папка содержит {len(career_folder_files)} файлов — старый снимок проекта "
            "из февраля 2026. Варианты:\n\n"
            "1. **Оставить как есть** — она не мешает работе проекта, "
            "можно считать её архивной версией\n"
            "2. **Удалить** — нужно удалить каждый файл по одному через GitHub UI "
            f"({len(career_folder_files)} файлов). Долго, но возможно.\n"
            "3. **Удалить через GitHub API** — можно написать скрипт. "
            "Если нужно, скажите — я его создам.\n\n"
            "**Рекомендация:** оставить папку, добавив в README примечание, "
            "что это начальная версия проекта для сравнения."
        ),
    )
    print(f"  Фаза 4: {len(files_to_delete)} файлов для удаления + "
          f"{len(career_folder_files)} в career_buid_sysytem-main/ (опционально)")
    return files_to_delete, career_folder_files


def main():
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir()

    print("=" * 60)
    print("  Подготовка пакетов для superdash7/career_copilot_")
    print("=" * 60)
    print()

    phase_1_backend()
    phase_2_frontend()
    phase_3_docs_devops()
    phase_4_cleanup()

    summary = OUTPUT_DIR / "README.md"
    summary.write_text(
        "# План загрузки в чистовой репозиторий\n\n"
        "**Целевой репо:** https://github.com/superdash7/career_copilot_\n\n"
        "Загружайте фазы **строго по порядку**.\n\n"
        "| # | Папка | Что загружаем | Действие |\n"
        "|---|-------|---------------|----------|\n"
        "| 1 | `01_backend/` | Python-модули, данные, конфиги | Upload files |\n"
        "| 2 | `02_frontend/` | React/TypeScript фронтенд | Upload files |\n"
        "| 3 | `03_docs_devops/` | Документация, тесты, Docker | Upload files |\n"
        "| 4 | `04_cleanup/` | Удаление старых файлов | Delete files |\n\n"
        "Инструкции для каждой фазы — в `README_UPLOAD.md` внутри папки.\n\n"
        "## Важно\n\n"
        "- Каждая фаза = один коммит в чистовом репо\n"
        "- Между фазами можно делать паузы (для естественности истории)\n"
        "- Не загружайте `package-lock.json` — он слишком большой для GitHub UI\n"
        "- Папку `career_buid_sysytem-main/` можно оставить как архив MVP\n",
        encoding="utf-8",
    )

    print()
    print(f"Готово! Пакеты в {OUTPUT_DIR}/")
    print("Прочитайте README.md и README_UPLOAD.md в каждой папке.")


if __name__ == "__main__":
    main()
