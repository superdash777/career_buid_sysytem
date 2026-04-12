import type { Skill } from '../types';

interface Props {
  skill: Skill;
  onSelectAlternative: (name: string) => void;
}

export default function SkillAlternativeSelect({ skill, onSelectAlternative }: Props) {
  const alternatives = (skill.alternatives || []).filter((a) => a.name && a.name !== skill.name).slice(0, 3);
  if (alternatives.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-(--color-text-muted) uppercase tracking-wide">
        Подтвердите навык
      </label>
      <select
        className="rounded-lg border border-(--color-border) bg-(--color-surface-raised) px-3 py-2 text-sm text-(--color-text-primary)"
        value=""
        onChange={(e) => {
          if (!e.target.value) return;
          onSelectAlternative(e.target.value);
        }}
      >
        <option value="">Выберите альтернативу</option>
        {alternatives.map((alt) => {
          const score = typeof alt.score === 'number' ? ` (${Math.round(alt.score * 100)}%)` : '';
          return (
            <option key={alt.name} value={alt.name}>
              {alt.name}{score}
            </option>
          );
        })}
      </select>
    </div>
  );
}
