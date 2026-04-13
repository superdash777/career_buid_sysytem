import { ArrowRight, Compass, LayoutDashboard, Sparkles, Target, Route, BarChart3 } from 'lucide-react';
import NavBar from '../components/NavBar';
import GridBg from '../components/layout/GridBg';
import Button from '../components/ui/Button';
import Eyebrow from '../components/ui/Eyebrow';

interface Props {
  onStart: () => void;
  onOpenDashboard?: () => void;
  onOpenOnboarding?: () => void;
  showOnboardingNudge?: boolean;
}

const STEPS = [
  { icon: Target, n: '1', title: 'Определим цель', desc: 'Выберите сценарий и целевую роль' },
  { icon: Route, n: '2', title: 'Опишем навыки', desc: 'Загрузите резюме или заполните вручную' },
  { icon: BarChart3, n: '3', title: 'Получите план', desc: 'Gap-анализ и пошаговый роадмап' },
];

export default function Welcome({ onStart, onOpenDashboard, onOpenOnboarding, showOnboardingNudge = false }: Props) {
  return (
    <GridBg className="min-h-screen bg-[var(--bg)]">
      <header className="mx-auto w-full max-w-4xl px-5 md:px-8">
        <NavBar />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-16 md:px-8">
        <div className="w-full max-w-2xl slide-up">
          {/* Hero section */}
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--chip)]">
              <Compass className="h-8 w-8 text-[var(--blue-deep)]" />
            </div>

            <Eyebrow className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--chip)] px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Career Copilot
            </Eyebrow>

            <h1 className="text-4xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
              Ваш навигатор карьерного роста
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-[var(--muted)]">
              Давайте построим маршрут к вашему следующему карьерному шагу
            </p>
          </div>

          {/* Onboarding nudge */}
          {showOnboardingNudge && onOpenOnboarding && (
            <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-[var(--blue-deep)]/20 bg-[var(--chip)] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--blue-deep)]/10">
                  <Sparkles className="h-4 w-4 text-[var(--blue-deep)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">
                    Уточните профиль для точных рекомендаций
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    3 коротких вопроса, после которых Career GPS и приоритеты gap-навыков станут точнее.
                  </p>
                  <button
                    onClick={onOpenOnboarding}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--blue-deep)] transition-colors hover:underline"
                  >
                    Пройти onboarding
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main CTA */}
          <div className="mt-10 flex flex-col items-center gap-3">
            <Button size="lg" onClick={onStart}>
              Начать путь
              <ArrowRight className="h-5 w-5" />
            </Button>

            {onOpenDashboard && (
              <Button variant="secondary" onClick={onOpenDashboard}>
                <LayoutDashboard className="h-4 w-4" />
                Личный кабинет
              </Button>
            )}
          </div>

          {/* Steps preview */}
          <div className="mt-14 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-[var(--shadow-soft)] transition-all duration-300 hover:border-[var(--blue-deep)]/30"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--chip)]">
                    <s.icon className="h-4 w-4 text-[var(--blue-deep)]" />
                  </div>
                  <span className="font-mono text-xs font-medium text-[var(--muted)]">0{s.n}</span>
                </div>
                <p className="text-sm font-semibold text-[var(--ink)]">{s.title}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--line)] py-6 text-center text-xs text-[var(--muted)]">
        Career Copilot
      </footer>
    </GridBg>
  );
}
