import type { Scenario } from '../types';

const SYMBOLS: Record<Scenario, string> = {
  'Следующий грейд': '↗',
  'Смена профессии': '⇄',
  'Исследование возможностей': '⌕',
};

interface Props {
  value: Scenario;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

export default function ScenarioCard({ value, label, description, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        w-full text-left rounded-[18px] border p-5 transition-all duration-200 cursor-pointer
        ${selected
          ? 'border-[var(--blue-deep)] bg-[color-mix(in_srgb,var(--paper)_90%,white)] shadow-[var(--shadow-soft)]'
          : 'border-[var(--line)] bg-[var(--paper)] hover:border-[var(--blue-deep)]/40'
        }
      `}
    >
      <div className="flex items-start gap-4">
        <div
          className={`shrink-0 mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border text-sm transition-colors duration-200 ${
            selected
              ? 'border-[var(--blue-deep)] bg-[var(--blue-deep)] text-[#f8f4ec]'
              : 'border-[var(--line)] bg-[var(--paper)] text-[var(--blue-deep)]'
          }`}
        >
          {SYMBOLS[value]}
        </div>
        <div>
          <p className={`mb-1 font-semibold ${selected ? 'text-[var(--blue-deep)]' : 'text-[var(--ink)]'}`}>
            {label}
          </p>
          <p className="text-sm leading-relaxed text-[var(--muted)]">{description}</p>
        </div>
      </div>
    </button>
  );
}
