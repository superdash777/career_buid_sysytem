import { useState } from 'react';
import Alert from '../components/Alert';
import GridBg from '../components/layout/GridBg';
import Button from '../components/ui/Button';
import Eyebrow from '../components/ui/Eyebrow';
import { useAuth } from '../auth/AuthContext';

interface Props {
  onSuccess?: () => void;
  onGoLogin: () => void;
  onSkipToQuickStart?: () => void;
}

export default function Register({ onSuccess, onGoLogin, onSkipToQuickStart }: Props) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email.trim(), password);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось создать аккаунт';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GridBg className="min-h-screen bg-[var(--bg)]">
      <main className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-5 py-8 md:px-8 lg:grid-cols-2 lg:items-center">
        <section className="rounded-[26px] border border-[var(--line)] bg-[var(--paper)] p-7 shadow-[var(--shadow-soft)] md:p-9">
          <Eyebrow className="mb-5">Join // Career Copilot</Eyebrow>
          <h1 className="text-4xl leading-tight text-[var(--ink)] md:text-5xl">
            Создай аккаунт и перейди к персональному маршруту роста.
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-[var(--muted)]">
            После регистрации ты сразу попадёшь в onboarding-quiz. Ответы сохраняются в профиле и
            используются для рекомендаций сценария и прогноза Career GPS.
          </p>
          <div className="mt-8 space-y-3 border-t border-[var(--line)] pt-5 text-sm text-[var(--muted)]">
            <p>01 — История анализов сохраняется в личном кабинете.</p>
            <p>02 — Прогресс по навыкам синхронизируется между сессиями.</p>
            <p>03 — Доступен публичный read-only share результата.</p>
          </div>
        </section>

        <section className="rounded-[26px] border border-[var(--line)] bg-[color-mix(in_srgb,var(--paper)_90%,white)] p-7 shadow-[var(--shadow-soft)] md:p-8">
          <Eyebrow className="mb-3">Регистрация</Eyebrow>
          <h2 className="text-3xl leading-tight text-[var(--ink)]">Новый аккаунт</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Минимальная длина пароля — 8 символов.</p>

          {error && (
            <div className="mt-5">
              <Alert variant="error" onClose={() => setError('')}>
                {error}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="float-field">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder=" "
                required
                autoComplete="email"
              />
              <label className="float-label">Email</label>
            </div>
            <div className="float-field">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder=" "
                minLength={8}
                required
                autoComplete="new-password"
              />
              <label className="float-label">Пароль</label>
            </div>
            <Button type="submit" className="mt-2 w-full" disabled={loading}>
              {loading ? 'Создаём аккаунт...' : 'Создать аккаунт →'}
            </Button>
          </form>

          <div className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-[var(--muted)]">
            Уже есть аккаунт?{' '}
            <button
              type="button"
              onClick={onGoLogin}
              className="font-semibold text-[var(--blue-deep)] underline underline-offset-4"
            >
              Войти
            </button>
            {onSkipToQuickStart && (
              <>
                {' '}•{' '}
                <button
                  type="button"
                  onClick={onSkipToQuickStart}
                  className="font-semibold text-[var(--muted)] underline underline-offset-4"
                >
                  Продолжить без регистрации
                </button>
              </>
            )}
          </div>
        </section>
      </main>
    </GridBg>
  );
}
