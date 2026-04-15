import { useState } from 'react';
import { CheckCircle2, LayoutDashboard, ArrowRight, Sparkles } from 'lucide-react';
import NavBar from '../components/NavBar';
import GridBg from '../components/layout/GridBg';
import Button from '../components/ui/Button';
import Eyebrow from '../components/ui/Eyebrow';
import type { OnboardingPainPoint } from '../types';

interface Props {
  onSelect: (scenario: string) => void;
  onOpenDashboard?: () => void;
  onOpenOnboarding?: () => void;
  showOnboardingNudge?: boolean;
  recommendedPainPoint?: OnboardingPainPoint | null;
}

const GOALS = [
  {
    id: 'Следующий грейд',
    emoji: '🚀',
    title: 'Карьерный рост',
    desc: 'Повышение или senior-роль в своей области. Покажем gap-анализ и план достижения следующего грейда.',
  },
  {
    id: 'Смена профессии',
    emoji: '🔄',
    title: 'Смена профессии',
    desc: 'Переход в новую сферу. Определим, какие навыки можно перенести, а какие нужно освоить.',
  },
  {
    id: 'Исследование возможностей',
    emoji: '🔭',
    title: 'Исследование',
    desc: 'Понять варианты, когда нет четкого направления. Покажем подходящие роли и направления.',
  },
];

const PAIN_TO_GOAL: Record<string, string> = {
  'рост': 'Следующий грейд',
  'стагнация': 'Следующий грейд',
  'смена': 'Смена профессии',
  'неопределённость': 'Исследование возможностей',
};

export default function GoalSelection({
  onSelect,
  onOpenDashboard,
  onOpenOnboarding,
  showOnboardingNudge = false,
  recommendedPainPoint,
}: Props) {
  const recommended = recommendedPainPoint ? PAIN_TO_GOAL[recommendedPainPoint] || null : null;
  const [selected, setSelected] = useState<string | null>(recommended);

  return (
    <GridBg className="min-h-screen bg-[var(--bg)]">
      <header className="mx-auto w-full max-w-4xl px-5 md:px-8">
        <NavBar />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12 md:px-8">
        <div className="w-full max-w-3xl slide-up">
          {/* Header */}
          <div className="mb-10 text-center">
            <Eyebrow className="mb-3">Career CoPilot</Eyebrow>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)] md:text-4xl">
              Какая у вас главная цель?
            </h1>
            <p className="mt-3 text-[var(--muted)]">
              Это определит структуру вашего плана развития
            </p>
          </div>

          {/* Onboarding nudge */}
          {showOnboardingNudge && onOpenOnboarding && (
            <div className="mx-auto mb-8 max-w-lg rounded-2xl border border-[var(--blue-deep)]/20 bg-[var(--chip)] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--blue-deep)]/10">
                  <CheckCircle2 className="h-4 w-4 text-[var(--blue-deep)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">
                    Уточните профиль для точных рекомендаций
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    3 коротких вопроса — рекомендации станут точнее.
                  </p>
                  <button
                    onClick={onOpenOnboarding}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--blue-deep)] transition-colors hover:underline"
                  >
                    Пройти настройку
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Goal cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {GOALS.map((goal) => {
              const isSelected = selected === goal.id;
              const isRecommended = recommended === goal.id;
              return (
                <button
                  key={goal.id}
                  onClick={() => setSelected(goal.id)}
                  className={`relative rounded-2xl border p-6 text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-[var(--blue-deep)] bg-[var(--chip)] shadow-[0_0_0_1px_var(--blue-deep)]'
                      : 'border-[var(--line)] bg-[var(--paper)] shadow-[var(--shadow-soft)] hover:border-[var(--blue-deep)]/40'
                  }`}
                >
                  {isSelected && (
                    <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-[var(--blue-deep)]" />
                  )}
                  {isRecommended && !isSelected && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[var(--chip)] px-2.5 py-1 text-[10px] font-medium text-[var(--blue-deep)]">
                      <Sparkles className="h-3 w-3" />
                      Рекомендуем
                    </span>
                  )}
                  <span className="mb-3 block text-2xl">{goal.emoji}</span>
                  <h3 className={`mb-2 text-base font-semibold ${
                    isSelected ? 'text-[var(--blue-deep)]' : 'text-[var(--ink)]'
                  }`}>
                    {goal.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--muted)]">
                    {goal.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <Button
              size="lg"
              disabled={!selected}
              onClick={() => selected && onSelect(selected)}
            >
              Продолжить
              <ArrowRight className="h-5 w-5" />
            </Button>

            {onOpenDashboard && (
              <Button variant="ghost" onClick={onOpenDashboard}>
                <LayoutDashboard className="h-4 w-4" />
                Личный кабинет
              </Button>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--line)] py-6 text-center text-xs text-[var(--muted)]">
        Career CoPilot
      </footer>
    </GridBg>
  );
}
