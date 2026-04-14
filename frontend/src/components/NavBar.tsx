import { useTheme } from '../useTheme';
import { useAuth } from '../auth/AuthContext';
import { Sun, Moon, LogOut, Users } from 'lucide-react';
import Button from './ui/Button';

interface Props {
  showBrand?: boolean;
  onLogin?: () => void;
  onRegister?: () => void;
  onTeams?: () => void;
}

export default function NavBar({ showBrand = true, onLogin, onRegister, onTeams }: Props) {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  return (
    <div className="flex items-center justify-between py-4">
      {showBrand ? (
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--blue-deep)] text-sm font-bold text-white"
          >
            ✦
          </span>
          <span className="text-sm font-semibold tracking-tight text-[var(--ink)]">
            Career CoPilot
          </span>
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-2">
        {onTeams && (
          <button
            onClick={onTeams}
            className="hidden items-center gap-1.5 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--blue-deep)] sm:inline-flex"
          >
            <Users className="h-3.5 w-3.5" />
            Для команд
          </button>
        )}

        {!user && onLogin && (
          <Button variant="ghost" size="sm" onClick={onLogin}>
            Войти
          </Button>
        )}
        {!user && onRegister && (
          <Button size="sm" onClick={onRegister}>
            Начать бесплатно
          </Button>
        )}

        {user && (
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent-red)] hover:text-[var(--accent-red)]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Выйти
          </button>
        )}
        <button
          onClick={toggle}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] transition-colors hover:border-[var(--blue-deep)] hover:text-[var(--blue-deep)]"
          aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
