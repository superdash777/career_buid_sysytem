import { useTheme } from '../useTheme';
import { useAuth } from '../auth/AuthContext';

interface Props {
  showBrand?: boolean;
}

export default function NavBar({ showBrand = true }: Props) {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  return (
    <div className="flex items-center justify-between py-3.5">
      {showBrand ? (
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper)] text-[11px] text-[var(--blue-deep)]"
          >
            ◎
          </span>
          <span className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--ink)]">
            Career Copilot
          </span>
        </div>
      ) : (
        <div />
      )}
      <div className="flex items-center gap-2.5">
        {user && (
          <button
            onClick={logout}
            className="inline-flex items-center rounded-full border border-[var(--line)] px-3.5 py-1.5 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] transition-colors hover:bg-[var(--chip)]"
          >
            Выйти
          </button>
        )}
        <button
          onClick={toggle}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] transition-colors hover:bg-[var(--chip)] hover:text-[var(--ink)]"
          aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        >
          <span className="text-xs" aria-hidden>
            {theme === 'dark' ? '☼' : '◐'}
          </span>
        </button>
      </div>
    </div>
  );
}
