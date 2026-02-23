import { Trash2 } from 'lucide-react';
import type { Skill } from '../types';
import { SKILL_LEVELS } from '../types';

interface Props {
  skill: Skill;
  onChange: (updated: Skill) => void;
  onRemove: () => void;
}

export default function SkillCard({ skill, onChange, onRemove }: Props) {
  return (
    <div className="slide-up flex flex-col gap-3 rounded-xl border border-(--color-border) bg-(--color-surface-raised) p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className="flex-1 font-medium text-(--color-text-primary) truncate" title={skill.name}>
          {skill.name}
        </span>
        <button
          onClick={onRemove}
          className="shrink-0 text-(--color-text-muted) hover:text-red-500 transition-colors p-1"
          aria-label="Удалить навык"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-1 rounded-lg bg-(--color-surface-alt) border border-(--color-border-muted) p-1">
        {SKILL_LEVELS.map((l) => (
          <button
            key={l.value}
            onClick={() => onChange({ ...skill, level: l.value })}
            title={l.tooltip}
            className={`flex-1 rounded-md px-1 py-1.5 text-xs font-medium transition-all duration-200 text-center ${
              skill.level === l.value
                ? 'bg-(--color-accent) text-white shadow-sm'
                : 'text-(--color-text-muted) hover:bg-(--color-accent-light) hover:text-(--color-text-secondary)'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
