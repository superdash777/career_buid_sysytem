#!/usr/bin/env python3
"""
Скрипт для подготовки пакетов файлов для миграции в "чистовой" репозиторий.

Анализирует git-историю текущего репозитория, группирует изменения
по логическим фазам разработки и создаёт папки с файлами для
последовательной загрузки через веб-интерфейс GitHub.

Использование:
    python scripts/prepare_migration.py [--base-commit HASH] [--output-dir DIR]

Аргументы:
    --base-commit   Хеш коммита, соответствующего тому, что уже есть
                    в чистовом репозитории (по умолчанию: начало проекта)
    --output-dir    Каталог для создания пакетов (по умолчанию: _migration)
    --list-phases   Только показать фазы, не создавать файлы
    --phase         Создать пакет только для указанной фазы (номер)
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


PHASES = [
    {
        "id": 1,
        "name": "MVP: бэкенд + первый фронтенд",
        "description": "Базовый FastAPI-бэкенд, React-фронтенд с 5 экранами, "
                       "парсинг резюме, анализ навыков, генерация планов",
        "date_range": ("2026-02-22", "2026-02-23"),
        "commit_range_hint": ("0656f01", "09d4d91"),
        "commit_message": "feat: базовая архитектура — FastAPI бэкенд, React фронтенд, "
                          "NLP-пайплайн анализа навыков и генерации планов",
    },
    {
        "id": 2,
        "name": "Улучшение бэкенда и UI",
        "description": "Pymorphy3 лемматизация, структурированный markdown-вывод, "
                       "UI overhaul (тёмная тема), документация, progress loader",
        "date_range": ("2026-02-23", "2026-02-25"),
        "commit_range_hint": ("e0c23f9", "4fc71e6"),
        "commit_message": "improve: улучшение NLP (pymorphy3), UI (тёмная тема, прогресс), "
                          "структурированный вывод планов",
    },
    {
        "id": 3,
        "name": "Рефакторинг и полировка",
        "description": "Аудит кода, удаление дублирования, общие компоненты, "
                       "оценочная система, тесты",
        "date_range": ("2026-02-25", "2026-02-26"),
        "commit_range_hint": ("ec07fed", "3a14e2a"),
        "commit_message": "refactor: аудит кода, единообразие, общие компоненты, тесты",
    },
    {
        "id": 4,
        "name": "ML Pipeline v2 + Авторизация",
        "description": "E5 skill index, weighted gap scoring, JWT авторизация, "
                       "SQLite, персональный дашборд, онбординг, публичные ссылки",
        "date_range": ("2026-04-11", "2026-04-12"),
        "commit_range_hint": ("3535c04", "1fca2a6"),
        "commit_message": "feat: ML pipeline v2 (E5, weighted scoring), JWT-авторизация, "
                          "дашборд, онбординг, история анализов",
    },
    {
        "id": 5,
        "name": "Дизайн и NLP-улучшения",
        "description": "Редизайн (indigo/violet палитра), NLP улучшения "
                       "(batch calls, E5-large), ISO-документация, UX экранов",
        "date_range": ("2026-04-13", "2026-04-17"),
        "commit_range_hint": ("8cdcd93", "37a1f0b"),
        "commit_message": "improve: редизайн интерфейса, улучшения NLP/ML пайплайна, "
                          "техническая документация ISO 24765",
    },
    {
        "id": 6,
        "name": "Фронтенд-переделка и UX",
        "description": "Полная переработка фронтенда: Tailwind, модульные компоненты, "
                       "тёмная/светлая тема, лендинг, навигация",
        "date_range": ("2026-04-15", "2026-04-19"),
        "commit_range_hint": None,
        "commit_message": "feat: полная переработка фронтенда — Tailwind CSS, "
                          "модульная архитектура, адаптивный дизайн",
    },
    {
        "id": 7,
        "name": "Kanban, B2C, уведомления",
        "description": "Kanban-доска для плана, B2C-воронка, уведомления, "
                       "explore-рекомендации, auth-улучшения",
        "date_range": ("2026-04-25", "2026-04-26"),
        "commit_range_hint": ("e0bd3f6", "1b4285a"),
        "commit_message": "feat: kanban-доска, B2C-воронка, desktop-уведомления, "
                          "explore рекомендации, UX-оптимизация",
    },
    {
        "id": 8,
        "name": "Docker, деплой, GDPR",
        "description": "Railway Docker-деплой, GHCR workflow, согласие на обработку "
                       "данных, дашборд-навигация, radar chart",
        "date_range": ("2026-05-20", "2026-05-21"),
        "commit_range_hint": ("a8f35fa", "ef69cb1"),
        "commit_message": "feat: Docker-деплой, CI/CD (GHCR), GDPR-согласие, "
                          "radar-chart самооценки, навигация дашборда",
    },
]

SKIP_PATTERNS = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    ".env",
    "_migration",
    "package-lock.json",
    "frontend/dist",
}


def run_git(args: list[str], cwd: Optional[str] = None) -> str:
    result = subprocess.run(
        ["git"] + args,
        capture_output=True,
        text=True,
        cwd=cwd or ".",
    )
    return result.stdout.strip()


def get_files_at_commit(commit_hash: str) -> set[str]:
    output = run_git(["ls-tree", "-r", "--name-only", commit_hash])
    return set(output.splitlines()) if output else set()


def get_changed_files_between(base: str, target: str) -> dict[str, str]:
    """Returns {filepath: status} where status is A/M/D."""
    output = run_git(["diff", "--name-status", base, target])
    result = {}
    for line in output.splitlines():
        parts = line.split("\t", 1)
        if len(parts) == 2:
            status, filepath = parts
            result[filepath] = status[0]
    return result


def get_commit_for_date(date: str, direction: str = "before") -> Optional[str]:
    if direction == "before":
        output = run_git(["log", "--format=%H", f"--before={date}T23:59:59", "-1"])
    else:
        output = run_git(["log", "--format=%H", "--reverse", f"--after={date}T00:00:00", "-1"])
    return output.splitlines()[0] if output.splitlines() else None


def get_latest_commit_in_range(date_start: str, date_end: str) -> Optional[str]:
    output = run_git([
        "log", "--format=%H",
        f"--after={date_start}T00:00:00",
        f"--before={date_end}T23:59:59",
        "-1",
    ])
    return output.splitlines()[0] if output.splitlines() else None


def should_skip(filepath: str) -> bool:
    parts = Path(filepath).parts
    return any(skip in parts or filepath.startswith(skip) for skip in SKIP_PATTERNS)


def copy_file_from_tree(commit: str, filepath: str, dest: Path):
    """Extract a file from a git commit and write it to dest."""
    content = subprocess.run(
        ["git", "show", f"{commit}:{filepath}"],
        capture_output=True,
    )
    if content.returncode == 0:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(content.stdout)


def create_phase_package(
    phase: dict,
    base_commit: Optional[str],
    output_dir: Path,
    repo_root: str = ".",
):
    """Create a folder with all files changed/added in a given phase."""
    phase_id = phase["id"]
    phase_dir = output_dir / f"phase_{phase_id:02d}_{phase['name'].replace(' ', '_').replace('/', '_')}"

    date_start, date_end = phase["date_range"]
    target_commit = get_latest_commit_in_range(date_start, date_end)

    if not target_commit:
        print(f"  [!] Фаза {phase_id}: не найдены коммиты в диапазоне {date_start}..{date_end}")
        return None

    if base_commit:
        changed = get_changed_files_between(base_commit, target_commit)
    else:
        files_at_target = get_files_at_commit(target_commit)
        changed = {f: "A" for f in files_at_target}

    if phase_dir.exists():
        shutil.rmtree(phase_dir)
    phase_dir.mkdir(parents=True)

    files_dir = phase_dir / "files"
    files_dir.mkdir()

    added = []
    modified = []
    deleted = []

    for filepath, status in sorted(changed.items()):
        if should_skip(filepath):
            continue
        if status == "D":
            deleted.append(filepath)
        else:
            copy_file_from_tree(target_commit, filepath, files_dir / filepath)
            if status == "A":
                added.append(filepath)
            else:
                modified.append(filepath)

    readme_lines = [
        f"# Фаза {phase_id}: {phase['name']}\n",
        f"\n**Дата:** {date_start} — {date_end}\n",
        f"\n**Описание:** {phase['description']}\n",
        f"\n**Коммит-сообщение для загрузки:**\n```\n{phase['commit_message']}\n```\n",
        f"\n## Статистика\n",
        f"- Новых файлов: {len(added)}",
        f"- Изменённых файлов: {len(modified)}",
        f"- Удалённых файлов: {len(deleted)}",
        f"\n## Новые файлы (создать/загрузить)\n",
    ]

    for f in added:
        readme_lines.append(f"- `{f}`")

    if modified:
        readme_lines.append(f"\n## Изменённые файлы (обновить содержимое)\n")
        for f in modified:
            readme_lines.append(f"- `{f}`")

    if deleted:
        readme_lines.append(f"\n## Удалённые файлы (удалить из репозитория)\n")
        for f in deleted:
            readme_lines.append(f"- `{f}`")

    readme_lines.append(f"\n## Инструкция по загрузке\n")
    readme_lines.append(
        "1. Откройте чистовой репозиторий на GitHub\n"
        "2. Для каждого файла из папки `files/`:\n"
        "   - Если файл **новый** — нажмите «Add file» → «Upload files» или создайте через «Add file» → «Create new file»\n"
        "   - Если файл **изменённый** — найдите его в репозитории, нажмите карандаш (Edit), замените содержимое\n"
        "3. Для удалённых файлов — откройте файл, нажмите '...' → Delete\n"
        "4. Используйте коммит-сообщение из раздела выше\n"
        "\n**Совет:** Можно перетащить все файлы разом через «Upload files», "
        "но тогда нужно следить за структурой папок.\n"
    )

    (phase_dir / "README_UPLOAD.md").write_text("\n".join(readme_lines), encoding="utf-8")

    return {
        "phase_id": phase_id,
        "name": phase["name"],
        "added": len(added),
        "modified": len(modified),
        "deleted": len(deleted),
        "target_commit": target_commit[:8],
        "dir": str(phase_dir),
    }


def create_full_snapshot(output_dir: Path, commit: str = "HEAD"):
    """Create a single folder with ALL current files (for fresh upload)."""
    snap_dir = output_dir / "full_snapshot"
    if snap_dir.exists():
        shutil.rmtree(snap_dir)

    files_dir = snap_dir / "files"
    files_dir.mkdir(parents=True)

    all_files = get_files_at_commit(commit)
    count = 0
    for filepath in sorted(all_files):
        if should_skip(filepath):
            continue
        copy_file_from_tree(commit, filepath, files_dir / filepath)
        count += 1

    readme = (
        "# Полный снимок проекта\n\n"
        f"Коммит: `{commit[:8]}`\n\n"
        f"Всего файлов: {count}\n\n"
        "Эта папка содержит все файлы проекта в их текущем состоянии.\n"
        "Используйте, если нужно загрузить всё целиком в новый репозиторий.\n"
    )
    (snap_dir / "README.md").write_text(readme, encoding="utf-8")
    return count


def list_phases():
    print("\n╔══════════════════════════════════════════════════════════════╗")
    print("║           ФАЗЫ РАЗРАБОТКИ CAREER COPILOT                    ║")
    print("╚══════════════════════════════════════════════════════════════╝\n")

    for phase in PHASES:
        date_start, date_end = phase["date_range"]
        print(f"  Фаза {phase['id']}: {phase['name']}")
        print(f"  Даты: {date_start} — {date_end}")
        print(f"  {phase['description']}")
        print(f"  Коммит: {phase['commit_message'][:70]}...")
        print()


def main():
    parser = argparse.ArgumentParser(
        description="Подготовка пакетов для миграции в чистовой репозиторий"
    )
    parser.add_argument(
        "--base-commit",
        help="Хеш коммита, соответствующего текущему состоянию чистового репо "
             "(если пусто — пакеты создаются с нуля)",
    )
    parser.add_argument(
        "--base-phase",
        type=int,
        help="Номер фазы, которая уже есть в чистовом репо "
             "(пакеты будут созданы начиная со следующей фазы)",
    )
    parser.add_argument(
        "--output-dir",
        default="_migration",
        help="Каталог для пакетов (по умолчанию: _migration)",
    )
    parser.add_argument(
        "--list-phases",
        action="store_true",
        help="Показать список фаз и выйти",
    )
    parser.add_argument(
        "--phase",
        type=int,
        help="Создать пакет только для одной фазы",
    )
    parser.add_argument(
        "--snapshot",
        action="store_true",
        help="Создать полный снимок текущего состояния",
    )
    parser.add_argument(
        "--diff-only",
        action="store_true",
        help="Создать один пакет: diff между base-commit и HEAD",
    )

    args = parser.parse_args()

    if args.list_phases:
        list_phases()
        return

    output_dir = Path(args.output_dir)
    output_dir.mkdir(exist_ok=True)

    if args.snapshot:
        print("Создаю полный снимок...")
        count = create_full_snapshot(output_dir)
        print(f"Готово: {count} файлов в {output_dir}/full_snapshot/files/")
        return

    if args.diff_only and args.base_commit:
        print(f"Создаю diff-пакет: {args.base_commit}..HEAD")
        diff_phase = {
            "id": 0,
            "name": "Все_изменения",
            "description": f"Все изменения от {args.base_commit[:8]} до HEAD",
            "date_range": ("2026-01-01", "2026-12-31"),
            "commit_message": "feat: обновление проекта — новые функции и исправления",
        }
        result = create_phase_package(diff_phase, args.base_commit, output_dir)
        if result:
            print(f"Готово: +{result['added']} новых, ~{result['modified']} изменённых, "
                  f"-{result['deleted']} удалённых")
        return

    base_commit = args.base_commit

    phases_to_process = PHASES
    if args.base_phase:
        phases_to_process = [p for p in PHASES if p["id"] > args.base_phase]
        last_phase = next((p for p in PHASES if p["id"] == args.base_phase), None)
        if last_phase:
            date_end = last_phase["date_range"][1]
            base_commit = get_latest_commit_in_range(
                last_phase["date_range"][0], date_end
            )
            print(f"Базовый коммит (конец фазы {args.base_phase}): {base_commit[:8] if base_commit else 'не найден'}")

    if args.phase:
        phases_to_process = [p for p in phases_to_process if p["id"] == args.phase]

    print(f"\nСоздаю пакеты в {output_dir}/\n")
    print(f"{'Фаза':<6} {'Название':<35} {'Новые':>6} {'Изм.':>6} {'Удал.':>6}")
    print("─" * 65)

    prev_commit = base_commit
    results = []

    for phase in phases_to_process:
        result = create_phase_package(phase, prev_commit, output_dir)
        if result:
            results.append(result)
            print(
                f"  {result['phase_id']:<4} {result['name']:<35} "
                f"{result['added']:>6} {result['modified']:>6} {result['deleted']:>6}"
            )
            target = get_latest_commit_in_range(*phase["date_range"])
            if target:
                prev_commit = target

    print("─" * 65)
    total_a = sum(r["added"] for r in results)
    total_m = sum(r["modified"] for r in results)
    total_d = sum(r["deleted"] for r in results)
    print(f"  {'Итого':<40} {total_a:>6} {total_m:>6} {total_d:>6}")

    summary_path = output_dir / "MIGRATION_PLAN.md"
    summary_lines = [
        "# План миграции в чистовой репозиторий\n",
        "\nЗагружайте файлы **строго по порядку фаз** — каждая фаза зависит от предыдущей.\n",
        "\n## Порядок загрузки\n",
    ]

    for r in results:
        phase = next(p for p in PHASES if p["id"] == r["phase_id"])
        summary_lines.extend([
            f"\n### Фаза {r['phase_id']}: {r['name']}\n",
            f"- Папка: `{os.path.basename(r['dir'])}/files/`",
            f"- Новых: {r['added']}, изменённых: {r['modified']}, удалённых: {r['deleted']}",
            f"- Коммит-сообщение: `{phase['commit_message']}`",
            f"- Подробная инструкция: `{os.path.basename(r['dir'])}/README_UPLOAD.md`",
        ])

    summary_lines.extend([
        "\n\n## Советы\n",
        "- **GitHub Upload**: перетащите все файлы фазы разом через «Add file» → «Upload files»",
        "- **Структура папок**: GitHub сохраняет структуру папок при drag & drop",
        "- **Большие файлы**: если файл > 25MB, используйте Git LFS или загрузите через API",
        "- **Порядок важен**: загружайте фазы строго по номерам",
        "- **Удаление файлов**: удаляйте файлы через веб-интерфейс GitHub (⋯ → Delete)",
    ])

    summary_path.write_text("\n".join(summary_lines), encoding="utf-8")
    print(f"\nПлан миграции: {summary_path}")
    print("Инструкции для каждой фазы: <phase_dir>/README_UPLOAD.md")


if __name__ == "__main__":
    main()
