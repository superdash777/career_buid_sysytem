import NavBar from '../components/NavBar';
import Button from '../components/ui/Button';
import Em from '../components/ui/Em';
import Eyebrow from '../components/ui/Eyebrow';
import GridBg from '../components/layout/GridBg';
import Mark from '../components/ui/Mark';
import MonoLabel from '../components/ui/MonoLabel';

interface Props {
  onLogin: () => void;
  onRegister: () => void;
}

export default function PublicLanding({ onLogin, onRegister }: Props) {
  return (
    <GridBg className="min-h-screen bg-[var(--bg)]">
      <header className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <NavBar />
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 pb-14 pt-6 md:px-8 md:pt-10">
        <section className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
          <article className="rounded-[28px] border border-[var(--line)] bg-[color-mix(in_srgb,var(--paper)_92%,white)] p-7 shadow-[var(--shadow-soft)] md:p-10">
            <Eyebrow className="mb-5">Career Copilot // AI navigator</Eyebrow>
            <h1 className="text-4xl leading-[1.05] text-[var(--ink)] md:text-[62px]">
              Планируй рост как <Mark>системный проект</Mark>, а не как догадку.
            </h1>
            <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-[var(--muted)]">
              Мы извлекаем навыки из резюме, сопоставляем их с целевой ролью и строим понятный
              roadmap в формате недельных итераций. Каждый шаг подкреплён evidence и прозрачной
              confidence-оценкой.
            </p>
            <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[var(--muted)]">
              Подход рассчитан на специалистов уровня <Em>Middle</Em>, которым нужен структурный
              переход к следующей карьерной точке.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button onClick={onRegister}>Начать бесплатно →</Button>
              <Button variant="secondary" onClick={onLogin}>
                Уже есть аккаунт →
              </Button>
            </div>
          </article>

          <aside className="space-y-4">
            <div className="rounded-[26px] border border-[var(--line)] bg-[var(--blue-deep)] p-7 text-[#f3ecdf] shadow-[var(--shadow-soft)]">
              <MonoLabel className="border-[#5d73a8] bg-[#1f2e56] text-[#c9d4ee]">
                KPI
              </MonoLabel>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="font-[var(--font-display)] text-[36px] leading-none">70 / 20 / 10</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[#d9cdb9]">
                    framework
                  </p>
                </div>
                <div>
                  <p className="font-[var(--font-display)] text-[36px] leading-none">4 000</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[#d9cdb9]">
                    символов контекст
                  </p>
                </div>
              </div>
              <p className="mt-6 text-sm leading-relaxed text-[#d9cdb9]">
                В рекомендациях используем только книги, задачи 1–4 часа и строгую привязку к
                данным пользователя.
              </p>
            </div>

            <div className="rounded-[22px] border border-[var(--line)] bg-[var(--paper)] p-6">
              <Eyebrow className="mb-3">Что внутри</Eyebrow>
              <ul className="space-y-3 text-sm leading-relaxed text-[var(--muted)]">
                <li>01 — Извлечение навыков и уровней из резюме.</li>
                <li>02 — Gap-анализ под целевую роль и сценарий.</li>
                <li>03 — Пошаговый план развития + карьерный GPS.</li>
              </ul>
            </div>
          </aside>
        </section>
      </main>
    </GridBg>
  );
}
