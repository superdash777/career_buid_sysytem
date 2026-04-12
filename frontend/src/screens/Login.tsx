import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import NavBar from '../components/NavBar';
import Alert from '../components/Alert';
import { useAuth } from '../auth/AuthContext';

interface Props {
  onSuccess: () => void;
  onGoRegister: () => void;
}

export default function Login({ onSuccess, onGoRegister }: Props) {
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
    <div className="min-h-screen flex flex-col bg-(--color-surface)">
      <header className="mx-auto w-full max-w-md px-4">
        <NavBar />
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="card w-full max-w-md space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-(--color-text-primary)">Вход</h1>
            <p className="text-sm text-(--color-text-muted)">
              Войдите в Career Copilot, чтобы продолжить.
            </p>
          </div>

          {error && (
            <Alert variant="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="label">Пароль</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Введите пароль"
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Входим...' : 'Войти'} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <button onClick={onGoRegister} className="btn-secondary w-full">
            У меня ещё нет аккаунта
          </button>
        </div>
      </main>
    </div>
  );
}
