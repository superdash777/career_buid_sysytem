import { useState } from 'react';
import Alert from '../components/Alert';
import NavBar from '../components/NavBar';
import { useAuth } from '../auth/AuthContext';
import GridBg from '../components/layout/GridBg';
import Button from '../components/ui/Button';
import Eyebrow from '../components/ui/Eyebrow';
import Mark from '../components/ui/Mark';

interface Props {
  onSuccess: () => void;
  onGoRegister: () => void;
  onBackToPublic?: () => void;
}

export default function Login({ onSuccess, onGoRegister, onBackToPublic }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить вход');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GridBg className="min-h-screen bg-[var(--bg)]">
      <header className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <NavBar />
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-stretch px-5 pb-12 md:px-8">
        <section className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[28px] border border-[var(--line)] bg-[var(--blue-deep)] p-8 text-[#f3ecdf] shadow-[var(--shadow-soft)] md:p-10">
            <Eyebrow className="mb-5 text-[#cdd7f3]">Auth flow // login</Eyebrow>
            <h1 className="text-4xl leading-[1.04] md:text-[56px]">
              Сначала <Mark className="border-[#f26a57]">вход</Mark>, затем карьерный маршрут.
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#d9cdb9]">
              После авторизации ты попадёшь в персональный контур: onboarding, выбор сценария,
              навыки, подтверждение и результат с планом развития.
            </p>
          </article>

          <article className="rounded-[26px] border border-[var(--line)] bg-[color-mix(in_srgb,var(--paper)_90%,white)] p-6 shadow-[var(--shadow-soft)] md:p-8">
            <Eyebrow className="mb-4">Вход в аккаунт</Eyebrow>
            <h2 className="text-3xl leading-tight text-[var(--ink)]">Рады снова видеть</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Введи email и пароль, чтобы продолжить с сохранённым прогрессом.
            </p>

            {error && (
              <div className="mt-4">
                <Alert variant="error" onClose={() => setError('')}>
                  {error}
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="float-field">
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="Email"
                  autoComplete="email"
                />
                <label htmlFor="login-email" className="float-label">
                  Email
                </label>
              </div>
              <div className="float-field">
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="Пароль"
                  autoComplete="current-password"
                />
                <label htmlFor="login-password" className="float-label">
                  Пароль
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Входим...' : 'Войти →'}
              </Button>
            </form>

            <div className="mt-4">
              <Button variant="secondary" onClick={onGoRegister} className="w-full">
                У меня ещё нет аккаунта →
              </Button>
            </div>
            {onBackToPublic && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={onBackToPublic}
                  className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)] underline underline-offset-4"
                >
                  Назад к быстрому старту
                </button>
              </div>
            )}
          </article>
        </section>
      </main>
    </GridBg>
  );
}
