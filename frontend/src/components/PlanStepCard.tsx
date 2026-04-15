import { Check } from 'lucide-react';
import type { PlanStep } from '../types';

interface Props {
  step: PlanStep;
  index: number;
  onStatusChange: (id: string, status: 'todo' | 'in_progress' | 'done') => void;
}

export default function PlanStepCard({ step, index, onStatusChange }: Props) {
  const isDone = step.status === 'done';
  const isInProgress = step.status === 'in_progress';

  const priorityBadge = step.priority === 'critical'
    ? 'bg-[#FCEBEB] text-[#791F1F]'
    : step.priority === 'moderate'
      ? 'bg-[#FAEEDA] text-[#633806]'
      : 'bg-[#EAF3DE] text-[#27500A]';
  const priorityLabel = step.priority === 'critical' ? 'Критичный' : step.priority === 'moderate' ? 'Умеренный' : 'Выполнено';

  const cycleStatus = () => {
    if (step.status === 'todo') onStatusChange(step.id, 'in_progress');
    else if (step.status === 'in_progress') onStatusChange(step.id, 'done');
    else onStatusChange(step.id, 'todo');
  };

  return (
    <div className={`rounded-xl border border-[var(--line)] p-4 flex items-start gap-4 transition-all ${isDone ? 'opacity-70' : ''}`}>
      <button
        onClick={cycleStatus}
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${
          isDone
            ? 'bg-[var(--accent-green)] text-white'
            : isInProgress
              ? 'bg-[var(--blue-deep)] text-white'
              : 'bg-[var(--line)] text-[var(--muted)]'
        }`}
      >
        {isDone ? <Check className="h-4 w-4" /> : index + 1}
      </button>
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-semibold text-[var(--ink)] ${isDone ? 'line-through' : ''}`}>
          {step.title}
        </h4>
        <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">{step.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {step.week_range && (
            <span className="rounded-full bg-[var(--chip)] px-2.5 py-0.5 text-xs font-medium text-[var(--blue-deep)]">
              {step.week_range}
            </span>
          )}
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityBadge}`}>
            {isDone ? 'Выполнено' : priorityLabel}
          </span>
        </div>
        {step.rag_source && (
          <p className="mt-1.5 text-[10px] text-[var(--muted)]">Источник: {step.rag_source}</p>
        )}
      </div>
    </div>
  );
}
