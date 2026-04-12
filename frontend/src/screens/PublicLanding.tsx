import { ArrowRight, ShieldCheck, Sparkles, Target, UserRound } from 'lucide-react';
import NavBar from '../components/NavBar';

interface Props {
  onLogin: () => void;
  onRegister: () => void;
}

export default function PublicLanding({ onLogin, onRegister }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-(--color-surface)">
      <header className="mx-auto w-full max-w-5xl px-4">
        <NavBar />
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 pt-10 pb-6">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">
              <p className="inline-flex items-center gap-2 rounded-full bg-(--color-accent-light) px-3 py-1 text-xs font-semibold text-(--color-accent)">
                <Sparkles className="h-3.5 w-3.5" />
                AI Career Copilot
              </p>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-(--color-text-primary)">
                Платформа карьерного развития с AI
              </h1>
              <p className="text-base sm:text-lg text-(--color-text-secondary) leading-relaxed">
                Загружаем резюме, оцениваем навыки и уровни, находим gap’ы под целевую роль и строим
                персональный план роста с понятными шагами.
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={onRegister} className="btn-primary">
                  Начать бесплатно <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={onLogin} className="btn-secondary">
                  Войти <UserRound className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="card space-y-4">
              <h2 className="text-lg font-semibold text-(--color-text-primary)">Что делает сервис</h2>
              <ul className="space-y-3 text-sm text-(--color-text-secondary)">
                <li className="flex items-start gap-2">
                  <Target className="mt-0.5 h-4 w-4 text-(--color-accent)" />
                  Определяет текущий профиль и сравнивает его с целевой ролью.
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-(--color-accent)" />
                  Даёт прозрачные confidence-индикаторы и альтернативы по навыкам.
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 text-(--color-accent)" />
                  Формирует практичный план развития с задачами и книгами.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
