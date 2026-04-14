import MonoLabel from './ui/MonoLabel';

interface Props {
  title: string;
  price: string;
  description: string;
  badge?: string;
  onClick?: () => void;
}

export default function BoostCard({ title, price, description, badge, onClick }: Props) {
  const isDisabled = badge === 'скоро';

  return (
    <button
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={`flex min-w-[220px] shrink-0 flex-col rounded-2xl border p-5 text-left transition-all duration-200 ${
        isDisabled
          ? 'cursor-default border-[var(--line)] bg-[var(--paper)] opacity-60'
          : 'border-[var(--line)] bg-[var(--paper)] shadow-[var(--shadow-soft)] hover:border-[var(--blue-deep)]/40'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--ink)]">{title}</h4>
        {badge && <MonoLabel>{badge}</MonoLabel>}
      </div>
      <p className="mb-4 flex-1 text-xs leading-relaxed text-[var(--muted)]">{description}</p>
      <span className="text-sm font-semibold text-[var(--blue-deep)]">{price}</span>
    </button>
  );
}
