import type { Skill } from '../types';

interface Props {
  skill: Skill;
}

function getConfidenceLabel(skill: Skill): { text: string; cls: string } | null {
  const confidence = skill.confidence;
  if (confidence === undefined || confidence === null) return null;

  if (confidence > 0.85) {
    return {
      text: `Высокая уверенность (${Math.round(confidence * 100)}%) · авто`,
      cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    };
  }
  if (confidence >= 0.6) {
    return {
      text: `Средняя уверенность (${Math.round(confidence * 100)}%) · подтвердите`,
      cls: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    };
  }
  return {
    text: `Низкая уверенность (${Math.round(confidence * 100)}%) · не распознано`,
    cls: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  };
}

export default function SkillConfidenceBadge({ skill }: Props) {
  const state = getConfidenceLabel(skill);
  if (!state) return null;

  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-medium ${state.cls}`}>
      {state.text}
    </span>
  );
}

