import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import { useAuth } from '../auth/AuthContext';

interface Props {
  onSuccess?: () => void;
  onGoLogin: () => void;
}

export default function Register({ onSuccess, onGoLogin }: Props) {
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
    <Layout step={0} showStepper={false}>
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-(--color-text-primary)">Регистрация</h1>
          <p className="mt-2 text-sm text-(--color-text-muted)">
            Создайте аккаунт, чтобы сохранять прогресс и историю.
          </p>
        </div>

        {error && (
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="label">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Минимум 8 символов"
              minLength={8}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'} <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="text-center text-sm text-(--color-text-muted)">
          Уже есть аккаунт?{' '}
          <button
            type="button"
            onClick={onGoLogin}
            className="text-(--color-accent) hover:text-(--color-accent-hover) font-medium"
          >
            Войти
          </button>
        </p>
      </div>
    </Layout>
  );
}
