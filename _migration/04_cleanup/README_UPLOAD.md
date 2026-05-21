# Фаза 4: Очистка — удаление устаревших файлов


Удаляем файлы, которые были загружены в неправильные пути:

- **23 файла .tsx/.ts в корне** — это фронтенд-компоненты, которые теперь лежат по правильным путям в `frontend/src/`
- **3 файла .py в корне** — скрипты, перенесённые в `scripts/` и `eval_metrics/`
- **Папка `career_buid_sysytem-main/`** — старый снимок проекта (опционально, см. примечания)


## Коммит-сообщение
```
chore: удаление дублирующихся файлов после реструктуризации
```


## Статистика

- Новых файлов: 0
- Обновлённых файлов: 0
- Удалить файлов: 26


## Файлы для удаления

- `App.tsx`
- `Auth.tsx`
- `AuthContext.tsx`
- `Button.tsx`
- `Dashboard.tsx`
- `Eyebrow.tsx`
- `FocusedPlanSection.tsx`
- `GridBg.tsx`
- `GrowthPage.tsx`
- `HRLanding.tsx`
- `KanbanBoard.tsx`
- `LoadingCarousel.tsx`
- `Mark.tsx`
- `MonoLabel.tsx`
- `OnboardingQuiz.tsx`
- `ProtectedRoute.tsx`
- `PublicLanding.tsx`
- `ShareCard.tsx`
- `SkillAlternativeSelect.tsx`
- `SkillConfidenceBadge.tsx`
- `SwitchPage.tsx`
- `faithfulness.py`
- `main.tsx`
- `reindex_qdrant.py`
- `threshold_analysis.py`
- `wizardResume.ts`

## Как загрузить

1. Откройте https://github.com/superdash7/career_copilot_
2. **Add file → Upload files**
3. Перетащите ВСЕ файлы и папки из `files/` этого пакета
4. GitHub сохранит структуру каталогов
5. Введите коммит-сообщение из раздела выше
6. Нажмите **Commit changes**


### Удаление файлов
Для каждого файла из списка «Файлы для удаления»:
1. Найдите файл в репозитории на GitHub
2. Нажмите на файл → кнопка «⋯» (три точки) → **Delete file**
3. Нажмите **Commit changes**


## Примечания
### Про папку `career_buid_sysytem-main/`

Эта папка содержит 68 файлов — старый снимок проекта из февраля 2026. Варианты:

1. **Оставить как есть** — она не мешает работе проекта, можно считать её архивной версией
2. **Удалить** — нужно удалить каждый файл по одному через GitHub UI (68 файлов). Долго, но возможно.
3. **Удалить через GitHub API** — можно написать скрипт. Если нужно, скажите — я его создам.

**Рекомендация:** оставить папку, добавив в README примечание, что это начальная версия проекта для сравнения.
