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
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className="flex-1 font-medium text-slate-800 truncate" title={skill.name}>
          {skill.name}
        </span>
        <button
          onClick={onRemove}
          className="shrink-0 text-slate-400 hover:text-red-500 transition-colors p-1"
          aria-label="Удалить навык"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
        {SKILL_LEVELS.map((l) => (
          <button
            key={l.value}
            onClick={() => onChange({ ...skill, level: l.value })}
            title={l.label}
            className={`flex-1 rounded-md px-1.5 py-1.5 text-xs font-medium transition-all duration-200 text-center ${
              skill.level === l.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
