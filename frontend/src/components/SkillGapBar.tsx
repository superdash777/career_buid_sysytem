import type { SkillGap } from '../types';

interface Props {
  gap: SkillGap;
  showDescription?: boolean;
  onEdit?: () => void;
}

export default function SkillGapBar({ gap, showDescription = false, onEdit }: Props) {
  const pct = gap.required > 0 ? Math.min(100, (gap.current / gap.required) * 100) : 0;
  const priority = gap.priority ?? (gap.delta >= 2 ? 1 : gap.delta >= 1 ? 2 : 3);

  const barColor = priority === 1 ? 'bg-[#E24B4A]' : priority === 2 ? 'bg-[#EF9F27]' : 'bg-[#639922]';
  const badgeBg = priority === 1 ? 'bg-[#FCEBEB] text-[#791F1F]' : priority === 2 ? 'bg-[#FAEEDA] text-[#633806]' : 'bg-[#EAF3DE] text-[#27500A]';
  const badgeText = priority === 1 ? `Δ${gap.delta} критично` : priority === 2 ? `Δ${gap.delta} умеренно` : 'освоен';

  return (
    <div className="rounded-xl border border-[var(--line)] p-3 space-y-2">
      <div className="flex items-center gap-3">
        <span className="w-[140px] shrink-0 truncate text-sm font-medium text-[var(--ink)]">{gap.name}</span>
        <div className="flex-1 h-2 rounded-full bg-[var(--line)] overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeBg}`}>{badgeText}</span>
        {onEdit && (
          <button onClick={onEdit} className="shrink-0 text-xs font-medium text-[var(--blue-deep)] hover:underline">
            Изменить
          </button>
        )}
      </div>
      {showDescription && gap.description && (
        <p className="text-xs text-[var(--muted)] leading-relaxed pl-[140px]">{gap.description}</p>
      )}
    </div>
  );
}
