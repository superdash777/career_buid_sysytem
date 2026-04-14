import { useState } from 'react';
import { ArrowRight, Map, Brain, TrendingUp, Sparkles } from 'lucide-react';
import NavBar from '../components/NavBar';
import Button from '../components/ui/Button';
import Eyebrow from '../components/ui/Eyebrow';
import GridBg from '../components/layout/GridBg';
import Mark from '../components/ui/Mark';
import MonoLabel from '../components/ui/MonoLabel';

interface Props {
  onTryInstant: () => void;
  onWatchDemo: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onTeams?: () => void;
}

const EXAMPLES = [
  'Вырасти до Senior',
  'Перейти в UX',
  'Исследовать варианты',
];

const FEATURES = [
  {
    icon: Map,
    title: 'Персональный роадмап',
    desc: 'Пошаговый план с недельными итерациями, привязанный к вашему темпу и доступному времени.',
  },
  {
    icon: Brain,
    title: 'Анализ навыков',
    desc: 'AI извлекает навыки из резюме и сопоставляет с требованиями целевой роли с прозрачной оценкой.',
  },
  {
    icon: TrendingUp,
    title: 'Прогресс и мотивация',
    desc: 'Отслеживайте рост, получайте рекомендации и видьте, как приближаетесь к цели.',
  },
];

export default function PublicLanding({ onTryInstant, onLogin, onRegister, onTeams }: Props) {
  const [prompt, setPrompt] = useState('');

  return (
    <GridBg className="min-h-screen bg-[var(--bg)]">
      <header className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <NavBar onLogin={onLogin} onRegister={onRegister} onTeams={onTeams} />
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-20 md:px-8">
        {/* Hero */}
        <section className="pb-14 pt-8 md:pb-20 md:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--chip)] px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              AI-проводник карьерного роста
            </Eyebrow>

            <h1 className="text-4xl leading-[1.1] tracking-tight text-[var(--ink)] md:text-6xl">
              Твой карьерный рост —{' '}
              <Mark>не хаос, а система</Mark>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
              Career CoPilot извлекает навыки из резюме, сопоставляет с целевой ролью
              и строит понятный roadmap в формате недельных итераций. Каждый шаг подкреплён
              данными и прозрачной оценкой.
            </p>

            {/* Prompt bar */}
            <div className="mx-auto mt-10 max-w-xl">
              <div className="flex gap-2 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-2 shadow-[var(--shadow-soft)]">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Опишите, где вы сейчас и куда хотите прийти..."
                  className="flex-1 bg-transparent px-4 py-3 text-[15px] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onTryInstant();
                  }}
                />
                <Button size="lg" onClick={onTryInstant}>
                  Построить план
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Example chips */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => { setPrompt(ex); onTryInstant(); }}
                    className="cursor-pointer"
                  >
                    <MonoLabel>{ex}</MonoLabel>
                  </button>
                ))}
              </div>

              <p className="mt-4 text-sm text-[var(--muted)]">
                Без регистрации — первый план бесплатно
              </p>
            </div>
          </div>
        </section>

        {/* Feature cards */}
        <section className="mb-16 md:mb-24">
          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:border-[var(--blue-deep)]/30 hover:shadow-[0_8px_32px_rgba(79,70,229,0.1)]"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chip)] transition-colors group-hover:bg-[var(--blue-deep)] group-hover:text-white">
                  <f.icon className="h-5 w-5 text-[var(--blue-deep)] group-hover:text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[var(--ink)]">{f.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--muted)]">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)] py-6 text-center text-xs text-[var(--muted)]">
        Career CoPilot
      </footer>
    </GridBg>
  );
}
