import { useState } from 'react';
import { UserPlus, Sparkles, History, Share2, CheckCircle2 } from 'lucide-react';
import Alert from '../components/Alert';
import GridBg from '../components/layout/GridBg';
import NavBar from '../components/NavBar';
import Button from '../components/ui/Button';
import Eyebrow from '../components/ui/Eyebrow';
import { useAuth } from '../auth/AuthContext';

interface Props {
  onSuccess?: () => void;
  onGoLogin: () => void;
  onSkipToQuickStart?: () => void;
}

const PERKS = [
  { icon: History, text: 'История анализов сохраняется в личном кабинете' },
  { icon: Sparkles, text: 'Прогресс по навыкам синхронизируется между сессиями' },
  { icon: Share2, text: 'Публичный read-only share результата' },
];

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

  const passwordStrength = password.length >= 12 ? 'strong' : password.length >= 8 ? 'ok' : 'weak';

  return (
    <GridBg className="min-h-screen bg-[var(--bg)]">
      <header className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <NavBar />
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-5 py-12 md:px-8">
        <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-2 lg:items-center">
          {/* Left: value proposition */}
          <div className="space-y-6">
            <div>
              <Eyebrow className="mb-3">Регистрация</Eyebrow>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)] md:text-4xl">
                Создайте аккаунт и перейдите к персональному маршруту
              </h1>
              <p className="mt-3 text-[var(--muted)]">
                После регистрации вы пройдёте короткий onboarding — 3 вопроса, которые помогут
                точнее настроить рекомендации.
              </p>
            </div>

            <div className="space-y-3">
              {PERKS.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--chip)]">
                    <p.icon className="h-4 w-4 text-[var(--blue-deep)]" />
                  </div>
                  <span className="text-sm text-[var(--color-text-secondary)]">{p.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: form card */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[var(--shadow-soft)] md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chip)]">
                <UserPlus className="h-5 w-5 text-[var(--blue-deep)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--ink)]">Новый аккаунт</h2>
                <p className="text-xs text-[var(--muted)]">Занимает меньше минуты</p>
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

              <div>
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
                {password.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex flex-1 gap-1">
                      <div className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= 8 ? 'bg-[var(--blue-deep)]' : 'bg-[var(--line)]'
                      }`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= 10 ? 'bg-[var(--blue-deep)]' : 'bg-[var(--line)]'
                      }`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= 12 ? 'bg-[var(--accent-green)]' : 'bg-[var(--line)]'
                      }`} />
                    </div>
                    <span className="text-xs text-[var(--muted)]">
                      {passwordStrength === 'strong' ? 'Надёжный' : passwordStrength === 'ok' ? 'Хороший' : 'Мин. 8 символов'}
                    </span>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  'Создаём аккаунт...'
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Создать аккаунт
                  </>
                )}
              </Button>
            </form>

            <div className="mt-5 border-t border-[var(--line)] pt-4 text-center text-sm text-[var(--muted)]">
              Уже есть аккаунт?{' '}
              <button
                type="button"
                onClick={onGoLogin}
                className="font-semibold text-[var(--blue-deep)] underline-offset-4 hover:underline"
              >
                Войти
              </button>
              {onSkipToQuickStart && (
                <>
                  {' '}
                  <span className="text-[var(--line)]">|</span>{' '}
                  <button
                    type="button"
                    onClick={onSkipToQuickStart}
                    className="font-medium text-[var(--muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
                  >
                    Без регистрации
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </GridBg>
  );
}
