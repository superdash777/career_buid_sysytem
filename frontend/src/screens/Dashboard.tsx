import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import KanbanBoard from '../components/KanbanBoard';
import type { KanbanTask } from '../components/KanbanBoard';
import { fetchAnalyses, fetchProgress, patchProgress, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { showToast } from '../components/toastStore';
import type { AnalysisRecord, ProgressRecord } from '../types';
import Button from '../components/ui/Button';
import MonoLabel from '../components/ui/MonoLabel';

interface Props {
  onBack: () => void;
  onStartNew: () => void;
  onOpenAnalysis: (analysis: AnalysisRecord) => void;
  onOpenOnboarding?: () => void;
}


function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}


function getMatchPercent(item: AnalysisRecord): number {
  const result = asRecord(item.result_json);
  if (!result) return 0;
  const analysis = asRecord(result.analysis);
  if (!analysis) return 0;

  const direct = asNumber(analysis.match_percent);
  if (direct !== null) return Math.max(0, Math.min(100, Math.round(direct)));

  const roles = Array.isArray(analysis.roles) ? analysis.roles : [];
  const firstRole = roles.length > 0 ? asRecord(roles[0]) : null;
  const roleMatch = firstRole ? asNumber(firstRole.match) : null;
  if (roleMatch !== null) return Math.max(0, Math.min(100, Math.round(roleMatch)));
  return 0;
}

interface PlanTask {
  id: string;
  title: string;
  tag: string;
}

function getTrackedTasks(item: AnalysisRecord): PlanTask[] {
  const result = asRecord(item.result_json);
  const analysis = result ? asRecord(result.analysis) : null;
  const tasks: PlanTask[] = [];
  const seenIds = new Set<string>();

  const addTask = (id: string, title: string, tag: string) => {
    if (seenIds.has(id)) return;
    seenIds.add(id);
    tasks.push({ id, title, tag });
  };

  if (analysis && item.scenario === 'Следующий грейд') {
    const gaps = Array.isArray(analysis.skill_gaps) ? analysis.skill_gaps : [];
    for (const gap of gaps) {
      const rec = asRecord(gap);
      if (!rec) continue;
      const name = asString(rec.name);
      if (!name) continue;
      const taskDesc = asString(rec.tasks);
      const desc = asString(rec.description);
      addTask(name, taskDesc || desc || name, name);
    }
  } else if (analysis && item.scenario === 'Смена профессии') {
    const gaps = Array.isArray(analysis.gaps) ? analysis.gaps : [];
    for (const gap of gaps) {
      const rec = asRecord(gap);
      if (!rec) continue;
      const name = asString(rec.name);
      if (!name) continue;
      const taskDesc = asString(rec.tasks);
      const desc = asString(rec.description);
      addTask(name, taskDesc || desc || name, name);
    }
  } else if (analysis && item.scenario === 'Исследование возможностей') {
    const roles = Array.isArray(analysis.roles) ? analysis.roles : [];
    const firstRole = roles.length > 0 ? asRecord(roles[0]) : null;
    const missing = firstRole && Array.isArray(firstRole.missing) ? firstRole.missing : [];
    for (const miss of missing) {
      const name = asString(miss);
      if (name) addTask(name, name, 'Навык');
    }
  }

  if (tasks.length > 0) return tasks;

  const skillsPayload = asRecord(item.skills_json);
  const skills = skillsPayload && Array.isArray(skillsPayload.skills) ? skillsPayload.skills : [];
  for (const skill of skills) {
    const name = asString(asRecord(skill)?.name);
    if (name) addTask(name, name, 'Навык');
  }
  return tasks;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
}

function estimateForecast(matchPercent: number, hoursPerWeek?: number | null): string {
  if (!hoursPerWeek || hoursPerWeek <= 0) return 'Требуется уточнение';
  const remainingPercent = Math.max(0, 100 - matchPercent);
  if (remainingPercent === 0) return 'Цель уже достигнута';

  // Эмпирика MVP: чем больше часов в неделю, тем быстрее растёт match.
  const weeks = Math.max(2, Math.ceil(remainingPercent / Math.max(2, hoursPerWeek * 0.9)));
  const forecastDate = new Date();
  forecastDate.setDate(forecastDate.getDate() + weeks * 7);
  return forecastDate.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Dashboard({ onBack, onStartNew, onOpenAnalysis }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [showNewPlanConfirm, setShowNewPlanConfirm] = useState(false);

  const handleNewPlan = () => {
    if (analyses.length > 0) {
      setShowNewPlanConfirm(true);
    } else {
      onStartNew();
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [analysisItems, progressItems] = await Promise.all([fetchAnalyses(), fetchProgress()]);
        if (cancelled) return;
        setAnalyses(analysisItems);
        setProgress(progressItems);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : 'Не удалось загрузить данные кабинета';
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const progressMap = useMemo(() => {
    const map = new Map<string, ProgressRecord>();
    for (const item of progress) map.set(item.skill_name, item);
    return map;
  }, [progress]);

  const latestAnalysis = analyses.length > 0 ? analyses[0] : null;
  const trackedTasks = useMemo(
    () => (latestAnalysis ? getTrackedTasks(latestAnalysis).slice(0, 8) : []),
    [latestAnalysis],
  );
  const matchPercent = latestAnalysis ? getMatchPercent(latestAnalysis) : 0;
  const doneCount = trackedTasks.filter((t) => progressMap.get(t.id)?.status === 'done').length;
  const weeklyProgress = trackedTasks.length > 0 ? Math.round((doneCount / trackedTasks.length) * 100) : 0;
  const forecastText = estimateForecast(matchPercent, user?.development_hours_per_week);

  const updateSkillStatus = async (skillName: string, status: 'todo' | 'in_progress' | 'done') => {
    try {
      const item = await patchProgress({ skill_name: skillName, status });
      setProgress((prev) => {
        const idx = prev.findIndex((x) => x.skill_name === item.skill_name);
        if (idx === -1) return [item, ...prev];
        const next = [...prev];
        next[idx] = item;
        return next;
      });
      if (status === 'done') showToast(`Задача «${skillName}» отмечена как выполненная`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Не удалось обновить статус';
      showToast(message);
    }
  };

  return (
    <Layout step={0} showStepper={false}>
      <div className="space-y-6 slide-up">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl text-(--color-text-primary)">Личный кабинет</h1>
            <p className="text-(--color-text-muted) mt-1">
              Ваш прогресс, задачи и карьерные планы в одном месте.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onBack}>← Назад</Button>
            <Button onClick={handleNewPlan}>Создать новый план →</Button>
          </div>
        </div>

        {error && (
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {showNewPlanConfirm && (
          <div className="card border-[var(--blue-deep)]/20 bg-[var(--chip)]">
            <p className="text-sm font-semibold text-(--color-text-primary)">
              У вас есть активный план. Создать новый?
            </p>
            <p className="mt-1 text-xs text-(--color-text-muted)">
              Предыдущий план останется в истории.
            </p>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => { setShowNewPlanConfirm(false); onStartNew(); }}>
                Создать новый
              </Button>
              <Button variant="secondary" onClick={() => setShowNewPlanConfirm(false)}>
                Отмена
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="card flex items-center gap-3 text-(--color-text-secondary)">
            <span className="inline-flex h-4 w-4 animate-spin items-center justify-center rounded-full border border-(--color-border) text-[10px]">◎</span>
            Загружаем данные кабинета...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <MetricCard
                title="Текущее совпадение"
                value={`${matchPercent}%`}
                subtitle="Совпадение с целевой ролью"
                marker="01"
              />
              <MetricCard
                title="Выполнено задач"
                value={`${doneCount}/${trackedTasks.length || 0}`}
                subtitle="По задачам текущего плана"
                marker="02"
              />
              <MetricCard
                title="Цель"
                value={latestAnalysis?.target_role || latestAnalysis?.current_role || '—'}
                subtitle={latestAnalysis ? latestAnalysis.scenario : 'Пока нет анализа'}
                marker="03"
              />
              <MetricCard
                title="Прогноз цели"
                value={forecastText}
                subtitle="На основе вашего темпа развития"
                marker="04"
              />
            </div>

            <div className="card">
              <MonoLabel>Прогресс к цели</MonoLabel>
              <div className="mb-2 flex items-center justify-end text-sm">
                <span className="text-(--color-text-secondary)">{matchPercent}% → 100%</span>
              </div>
              <div className="h-2 rounded-full bg-(--color-surface-alt) overflow-hidden">
                <div className="h-full rounded-full bg-(--color-accent)" style={{ width: `${matchPercent}%` }} />
              </div>
              <p className="text-xs text-(--color-text-muted) mt-2">Недельный прогресс по задачам: {weeklyProgress}%</p>
            </div>

            <div className="card space-y-4">
              <MonoLabel>Задачи на развитие</MonoLabel>
              {trackedTasks.length === 0 ? (
                <p className="text-sm text-(--color-text-muted)">
                  Сначала завершите хотя бы один план, чтобы получить персональные задачи.
                </p>
              ) : (
                <KanbanBoard
                  tasks={trackedTasks.map((task): KanbanTask => ({
                    id: task.id,
                    title: task.title,
                    tag: task.tag,
                    status: (progressMap.get(task.id)?.status as 'todo' | 'in_progress' | 'done') ?? 'todo',
                  }))}
                  onStatusChange={(taskId, newStatus) => updateSkillStatus(taskId, newStatus)}
                />
              )}
            </div>

            <div className="card space-y-4">
              <MonoLabel>Мои карьерные планы</MonoLabel>
              {analyses.length === 0 ? (
                <p className="text-sm text-(--color-text-muted)">
                  История пока пуста. Сформируйте первый план, и он появится здесь.
                </p>
              ) : (
                <div className="space-y-2">
                  {analyses.map((item) => (
                    <div key={item.id} className="rounded-lg border border-(--color-border) p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="font-medium text-(--color-text-primary)">
                          {item.scenario}
                        </p>
                        <p className="text-xs text-(--color-text-muted)">
                          {item.current_role || '—'}{item.target_role ? ` → ${item.target_role}` : ''} • {formatDate(item.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-(--color-accent)">{getMatchPercent(item)}%</span>
                        <Button variant="secondary" onClick={() => onOpenAnalysis(item)}>Открыть →</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  marker,
}: {
  title: string;
  value: string;
  subtitle: string;
  marker: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">{title}</p>
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-(--color-border) bg-[var(--chip)] font-[var(--font-mono)] text-[10px] text-(--color-text-muted)">
          {marker}
        </span>
      </div>
      <p className="text-xl font-bold text-(--color-text-primary) break-words">{value}</p>
      <p className="text-xs text-(--color-text-muted) mt-1">{subtitle}</p>
    </div>
  );
}
