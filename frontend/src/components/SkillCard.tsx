import { Trash2 } from 'lucide-react';
import type { Skill } from '../types';

const LEVELS = [
  { value: 1, label: 'Базовый' },
  { value: 1.5, label: 'Уверенный' },
  { value: 2, label: 'Продвинутый' },
] as const;

interface Props {
  skill: Skill;
  onChange: (updated: Skill) => void;
  onRemove: () => void;
}

export default function SkillCard({ skill, onChange, onRemove }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <span className="flex-1 font-medium text-slate-800 truncate" title={skill.name}>
        {skill.name}
      </span>
      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
        {LEVELS.map((l) => (
          <button
            key={l.value}
            onClick={() => onChange({ ...skill, level: l.value })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
              skill.level === l.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <button
        onClick={onRemove}
        className="self-start sm:self-center text-slate-400 hover:text-red-500 transition-colors p-1"
        aria-label="Удалить навык"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
