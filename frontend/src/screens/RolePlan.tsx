import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/ui/Button';
import LoadingCarousel from '../components/LoadingCarousel';
import { buildFocusedPlan } from '../api/client';
import type { ExploreRole, FocusedPlan, AppState } from '../types';

interface Props {
  role: ExploreRole;
  appState: AppState;
  isAuthenticated?: boolean;
  onBack: () => void;
  onGoToDashboard: () => void;
}

const SKILL_CHIP_COLORS = {
  closest: 'bg-[var(--chip)] text-[var(--blue-deep)]',
  near: 'bg-[#E1F5EE] text-[#1D9E75]',
};

const PRIORITY_COLORS = ['#E24B4A', '#EF9F27', '#9FE1CB'];
const COMM_CIRCLE_COLORS = [
  'bg-[var(--blue-deep)]',
  'bg-[var(--accent-green)]',
  'bg-amber-500',
];

const TAB_LABELS = ['Практика', 'Взаимодействие', 'Обучение'] as const;

export default function RolePlan({
  role,
  appState,
  onBack,
  onGoToDashboard,
}: Props) {
  const [focusedPlan, setFocusedPlan] = useState<FocusedPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const result = await buildFocusedPlan(
          {
            profession: appState.profession,
            grade: appState.grade,
            scenario: 'Исследование возможностей',
            target_profession: role.title,
            selected_skills: role.missing.slice(0, 10),
          },
          controller.signal,
        );
        setFocusedPlan(result);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error ? err.message : 'Не удалось загрузить план',
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [appState.profession, appState.grade, role.title, role.missing]);

  const keySkillsSet = new Set(role.key_skills);

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalTasks = focusedPlan
    ? focusedPlan.tasks.reduce((sum, t) => sum + t.items.length, 0)
    : 0;

  const tabCounts = focusedPlan
    ? [totalTasks, focusedPlan.communication.length, focusedPlan.learning.length]
    : [0, 0, 0];

  return (
    <Layout step={3} wide>
      {/* Hero */}
      <section className="mb-8 slide-up">
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-[var(--ink)] sm:text-4xl">
            {role.title}
          </h1>
        </div>

        <p className="text-sm text-[var(--muted)] mb-6">
          Персональный план развития · Career Copilot AI
        </p>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 text-center shadow-[var(--shadow-soft)]">
            <p className="text-2xl font-bold text-[var(--blue-deep)]">
              {role.match}%
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">Совместимость</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 text-center shadow-[var(--shadow-soft)]">
            <p className="text-2xl font-bold text-[var(--ink)]">
              {role.missing.length}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">Развить</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 text-center shadow-[var(--shadow-soft)]">
            <p className="text-2xl font-bold text-[var(--ink)]">
              {totalTasks}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">В плане</p>
          </div>
        </div>
      </section>

      {/* Loading / Error / Content */}
      {loading && <LoadingCarousel text="AI строит персональный план..." subtext="Анализируем навыки и подбираем задачи — обычно 30–60 секунд" />}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={onBack}>
            ← Назад к ролям
          </Button>
        </div>
      )}

      {focusedPlan && (
        <>
          {/* Tabs */}
          <nav className="mb-6 flex gap-6 border-b border-[var(--line)]">
            {TAB_LABELS.map((label, idx) => (
              <button
                key={label}
                onClick={() => setActiveTab(idx)}
                className={`relative pb-3 text-sm font-semibold transition-colors ${
                  activeTab === idx
                    ? 'text-[var(--blue-deep)]'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                {label}
                <span
                  className={`ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                    activeTab === idx
                      ? 'bg-[var(--blue-deep)] text-white'
                      : 'bg-[var(--chip)] text-[var(--muted)]'
                  }`}
                >
                  {tabCounts[idx]}
                </span>
                {activeTab === idx && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--blue-deep)]" />
                )}
              </button>
            ))}
          </nav>

          {/* Tab 0 — Практика */}
          {activeTab === 0 && (
            <div className="space-y-4 fade-in">
              {focusedPlan.tasks.map((task) => {
                const isKey = keySkillsSet.has(task.skill);
                const chipColor = isKey
                  ? SKILL_CHIP_COLORS.closest
                  : SKILL_CHIP_COLORS.near;

                return (
                  <div
                    key={task.skill}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-[var(--shadow-soft)]"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${chipColor}`}
                      >
                        {task.skill}
                      </span>
                    </div>

                    <ul className="space-y-2.5">
                      {task.items.map((item, j) => {
                        const itemId = `${task.skill}::${j}`;
                        const done = checkedItems.has(itemId);
                        const priorityColor =
                          PRIORITY_COLORS[
                            Math.min(j, PRIORITY_COLORS.length - 1)
                          ];

                        return (
                          <li key={itemId} className="flex items-start gap-3">
                            <button
                              onClick={() => toggleCheck(itemId)}
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                                done
                                  ? 'border-[var(--blue-deep)] bg-[var(--blue-deep)]'
                                  : 'border-[var(--line)] hover:border-[var(--blue-deep)]'
                              }`}
                            >
                              {done && (
                                <Check className="h-3.5 w-3.5 text-white" />
                              )}
                            </button>

                            <div className="flex-1">
                              <p
                                className={`text-sm leading-relaxed ${
                                  done
                                    ? 'text-[var(--muted)] line-through'
                                    : 'text-[var(--ink)]'
                                }`}
                              >
                                {item}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: priorityColor }}
                              />
                              <span className="text-xs text-[var(--muted)]">
                                ~4 ч
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 1 — Взаимодействие */}
          {activeTab === 1 && (
            <div className="space-y-3 fade-in">
              {focusedPlan.communication.map((item, i) => {
                const circleColor =
                  COMM_CIRCLE_COLORS[i % COMM_CIRCLE_COLORS.length];

                return (
                  <div
                    key={i}
                    className="flex gap-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-[var(--shadow-soft)]"
                  >
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${circleColor}`}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed text-[var(--ink)]">
                        {item}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2 — Обучение */}
          {activeTab === 2 && (
            <div className="space-y-3 fade-in">
              {focusedPlan.learning.map((item, i) => (
                <div
                  key={i}
                  className="flex gap-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-[var(--shadow-soft)]"
                >
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--chip)] text-sm font-bold text-[var(--blue-deep)]">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed text-[var(--ink)]">
                      {item}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Bottom CTA bar */}
      <div className="mt-10 space-y-3 border-t border-[var(--line)] pt-6">
        <Button className="w-full" size="lg" onClick={onGoToDashboard}>
          Отслеживать прогресс →
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          size="lg"
          onClick={onBack}
        >
          ← Назад к ролям
        </Button>
      </div>
    </Layout>
  );
}
