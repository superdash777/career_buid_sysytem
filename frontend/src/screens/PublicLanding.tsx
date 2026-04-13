import { ArrowRight, Target, Brain, TrendingUp, Zap, BarChart3, Route } from 'lucide-react';
import NavBar from '../components/NavBar';
import Button from '../components/ui/Button';
import Eyebrow from '../components/ui/Eyebrow';
import GridBg from '../components/layout/GridBg';
import Mark from '../components/ui/Mark';

interface Props {
  onTryInstant: () => void;
  onWatchDemo: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

const FEATURES = [
  {
    icon: Brain,
    title: 'Извлечение навыков',
    desc: 'AI анализирует резюме и определяет текущий уровень каждого навыка с прозрачной confidence-оценкой.',
  },
  {
    icon: Target,
    title: 'Gap-анализ',
    desc: 'Сравниваем ваш профиль с целевой ролью и показываем, каких навыков не хватает и на сколько.',
  },
  {
    icon: Route,
    title: 'Персональный роадмап',
    desc: 'Пошаговый план с недельными итерациями, привязанный к вашему темпу и доступному времени.',
  },
];

const METRICS = [
  { value: '60 сек', label: 'на первый результат' },
  { value: '70/20/10', label: 'framework рекомендаций' },
  { value: '4 000+', label: 'символов контекста' },
];

export default function PublicLanding({ onTryInstant, onWatchDemo, onLogin, onRegister }: Props) {
  return (
    <GridBg className="min-h-screen bg-[var(--bg)]">
      <header className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <NavBar />
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-20 md:px-8">
        {/* Hero */}
        <section className="pb-16 pt-8 md:pb-24 md:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--chip)] px-4 py-1.5">
              <Zap className="h-3.5 w-3.5" />
              AI-навигатор карьерного роста
            </Eyebrow>

            <h1 className="text-4xl leading-[1.1] tracking-tight text-[var(--ink)] md:text-6xl">
              Планируй карьеру как{' '}
              <Mark>системный проект</Mark>,{' '}
              а не как догадку
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
              Загрузите резюме — получите персональный план развития с gap-анализом,
              недельными итерациями и прозрачной оценкой каждого шага.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={onTryInstant}>
                Попробовать за 60 секунд
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button variant="secondary" size="lg" onClick={onWatchDemo}>
                Смотреть демо
              </Button>
            </div>

            <div className="mt-6 flex items-center justify-center gap-4 text-sm text-[var(--muted)]">
              <button
                onClick={onLogin}
                className="font-medium text-[var(--blue-deep)] underline-offset-4 transition-colors hover:underline"
              >
                Войти
              </button>
              <span className="text-[var(--line)]">|</span>
              <button
                onClick={onRegister}
                className="font-medium text-[var(--muted)] underline-offset-4 transition-colors hover:text-[var(--ink)] hover:underline"
              >
                Зарегистрироваться
              </button>
            </div>
          </div>
        </section>

        {/* Metrics strip */}
        <section className="mb-16 md:mb-24">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[var(--shadow-soft)] md:p-8">
            <div className="grid gap-6 md:grid-cols-3">
              {METRICS.map((m, i) => (
                <div key={i} className="flex items-center gap-4 md:justify-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--chip)]">
                    <BarChart3 className="h-5 w-5 text-[var(--blue-deep)]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tracking-tight text-[var(--ink)]">{m.value}</p>
                    <p className="text-sm text-[var(--muted)]">{m.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mb-16 md:mb-24">
          <div className="mb-10 text-center">
            <Eyebrow className="mb-3">Как это работает</Eyebrow>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--ink)] md:text-4xl">
              Три шага к ясному плану
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:border-[var(--blue-deep)]/30 hover:shadow-[0_8px_32px_rgba(79,70,229,0.1)]"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chip)] transition-colors group-hover:bg-[var(--blue-deep)] group-hover:text-white">
                    <f.icon className="h-5 w-5 text-[var(--blue-deep)] group-hover:text-white" />
                  </div>
                  <span className="font-mono text-xs font-medium text-[var(--muted)]">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[var(--ink)]">{f.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--muted)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="text-center">
          <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--line)] bg-gradient-to-br from-[var(--chip)] to-[var(--paper)] p-8 shadow-[var(--shadow-soft)] md:p-12">
            <TrendingUp className="mx-auto mb-4 h-8 w-8 text-[var(--blue-deep)]" />
            <h2 className="text-2xl font-bold tracking-tight text-[var(--ink)] md:text-3xl">
              Начните прямо сейчас
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[var(--muted)]">
              Подход рассчитан на специалистов уровня Middle+, которым нужен структурный переход
              к следующей карьерной точке.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={onTryInstant}>
                Попробовать бесплатно
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)] py-6 text-center text-xs text-[var(--muted)]">
        Career Copilot
      </footer>
    </GridBg>
  );
}
