import { useState } from 'react';
import { LogIn, Shield, TrendingUp, BarChart3 } from 'lucide-react';
import Alert from '../components/Alert';
import NavBar from '../components/NavBar';
import { useAuth } from '../auth/AuthContext';
import GridBg from '../components/layout/GridBg';
import Button from '../components/ui/Button';
import Eyebrow from '../components/ui/Eyebrow';

interface Props {
  onSuccess: () => void;
  onGoRegister: () => void;
  onBackToPublic?: () => void;
}

const BENEFITS = [
  { icon: Shield, text: 'Прогресс сохраняется между сессиями' },
  { icon: TrendingUp, text: 'Персональные рекомендации Career GPS' },
  { icon: BarChart3, text: 'История анализов в личном кабинете' },
];

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

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-5 py-12 md:px-8">
        <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-2 lg:items-center">
          {/* Left: info panel */}
          <div className="space-y-6">
            <div>
              <Eyebrow className="mb-3">Вход в аккаунт</Eyebrow>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)] md:text-4xl">
                С возвращением
              </h1>
              <p className="mt-3 text-[var(--muted)]">
                Войдите, чтобы продолжить работу с персональным планом развития и отслеживать прогресс.
              </p>
            </div>

            <div className="space-y-3">
              {BENEFITS.map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--chip)]">
                    <b.icon className="h-4 w-4 text-[var(--blue-deep)]" />
                  </div>
                  <span className="text-sm text-[var(--color-text-secondary)]">{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: form card */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[var(--shadow-soft)] md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chip)]">
                <LogIn className="h-5 w-5 text-[var(--blue-deep)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--ink)]">Вход</h2>
                <p className="text-xs text-[var(--muted)]">Email и пароль</p>
              </div>
            </div>

            {error && (
              <div className="mb-4">
                <Alert variant="error" onClose={() => setError('')}>
                  {error}
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                {loading ? 'Входим...' : 'Войти'}
              </Button>
            </form>

            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <Button variant="secondary" onClick={onGoRegister} className="w-full">
                Создать новый аккаунт
              </Button>
            </div>

            {onBackToPublic && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={onBackToPublic}
                  className="text-sm font-medium text-[var(--muted)] underline-offset-4 transition-colors hover:text-[var(--ink)] hover:underline"
                >
                  ← На главную
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </GridBg>
  );
}
