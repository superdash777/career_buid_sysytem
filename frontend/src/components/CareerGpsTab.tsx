import type { Analysis, AppState } from '../types';
import { deriveWeeklyHours } from '../utils/onboarding';

interface Props {
  analysis?: Analysis;
  appState: AppState;
}

interface Milestone {
  label: string;
  percent: number;
  dateLabel: string;
  skills: string[];
  active?: boolean;
}

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function paceByHours(hours?: number): number {
  if (!hours || hours <= 0) return 8;
  if (hours >= 10) return 16;
  if (hours >= 6) return 12;
  if (hours >= 3) return 8;
  return 5;
}

function deriveCurrentMatch(analysis?: Analysis): number {
  if (!analysis) return 0;
  if (analysis.scenario === 'growth' || analysis.scenario === 'switch') {
    return analysis.match_percent ?? 0;
  }
  const top = [...analysis.roles].sort((a, b) => b.match - a.match)[0];
  return top?.match ?? 0;
}

function deriveTargetSkills(analysis?: Analysis): string[] {
  if (!analysis) return [];
  if (analysis.scenario === 'growth') return analysis.skill_gaps.slice(0, 6).map((g) => g.name);
  if (analysis.scenario === 'switch') return analysis.gaps.slice(0, 6).map((g) => g.name);
  return analysis.roles[0]?.missing?.slice(0, 6) || [];
}

function buildMilestones(analysis: Analysis | undefined, appState: AppState): Milestone[] {
  const now = new Date();
  const current = deriveCurrentMatch(analysis);
  const goal = analysis?.scenario === 'explore' ? 80 : 90;
  const weeklyHours = deriveWeeklyHours(appState.developmentHoursPerWeek);
  const pace = paceByHours(weeklyHours);
  const skills = deriveTargetSkills(analysis);

  const m3 = Math.min(goal, current + pace);
  const m6 = Math.min(goal, m3 + pace);
  const remain = Math.max(0, goal - m6);
  const extraMonths = remain > 0 ? Math.ceil((remain / Math.max(pace, 1)) * 3) : 0;
  const targetDate = addMonths(now, 6 + extraMonths);

  return [
    {
      label: 'Сейчас',
      percent: current,
      dateLabel: formatDate(now),
      skills: skills.slice(0, 2),
      active: true,
    },
    {
      label: 'Через 3 месяца',
      percent: m3,
      dateLabel: formatDate(addMonths(now, 3)),
      skills: skills.slice(0, 3),
    },
    {
      label: 'Через 6 месяцев',
      percent: m6,
      dateLabel: formatDate(addMonths(now, 6)),
      skills: skills.slice(0, 4),
    },
    {
      label: 'Цель',
      percent: goal,
      dateLabel: formatDate(targetDate),
      skills: skills.slice(0, 6),
    },
  ];
}

export default function CareerGpsTab({ analysis, appState }: Props) {
  if (!analysis) {
    return (
      <div className="card">
        <p className="text-sm text-(--color-text-muted)">Сначала выполните анализ, чтобы построить карьерный GPS.</p>
      </div>
    );
  }

  const milestones = buildMilestones(analysis, appState);
  const weeklyHours = deriveWeeklyHours(appState.developmentHoursPerWeek);
  const hasHours = typeof weeklyHours === 'number' && weeklyHours > 0;

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-(--color-text-primary)">Карьерный GPS</h3>
          <span className="text-xs text-(--color-text-muted)">
            {hasHours
              ? `Темп: ${weeklyHours} ч/нед`
              : 'Темп: Требуется уточнение'}
          </span>
        </div>
        <p className="mt-2 text-sm text-(--color-text-secondary)">
          Вехи показывают ориентировочный рост совпадения профиля и ожидаемую дату достижения цели.
        </p>
      </div>

      <div className="card overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="relative px-4 pb-3 pt-8">
            <div className="absolute left-8 right-8 top-12 h-1 rounded-full bg-(--color-border)" />
            <div className="relative grid grid-cols-4 gap-4">
              {milestones.map((m) => (
                <div key={m.label} className="text-center">
                  <div
                    className={`mx-auto h-8 w-8 rounded-full border-4 ${
                      m.active
                        ? 'border-(--color-accent) bg-(--color-accent)'
                        : 'border-(--color-accent)/50 bg-(--color-surface-raised)'
                    }`}
                  />
                  <p className="mt-3 text-sm font-semibold text-(--color-text-primary)">{m.label}</p>
                  <p className="text-xs text-(--color-text-muted)">{m.dateLabel}</p>
                  <p className="mt-1 text-base font-bold text-(--color-accent)">{m.percent}%</p>
                  {m.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap justify-center gap-1">
                      {m.skills.map((s) => (
                        <span
                          key={`${m.label}-${s}`}
                          className="rounded-md bg-(--color-accent-light) px-2 py-1 text-[11px] text-(--color-accent)"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
