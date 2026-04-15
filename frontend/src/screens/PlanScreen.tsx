import { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/ui/Button';
import Eyebrow from '../components/ui/Eyebrow';
import MonoLabel from '../components/ui/MonoLabel';
import type { PlanStep, Analysis } from '../types';

interface Props {
  steps: PlanStep[];
  markdown?: string;
  analysis?: Analysis;
  scenario: string;
  profession: string;
  targetProfession?: string;
  analysisId?: string;
  onStepStatusChange: (id: string, status: 'todo' | 'in_progress' | 'done') => void;
  onRestart: () => void;
  onOpenDashboard?: () => void;
  onShare?: () => void;
}

const INITIAL_VISIBLE = 5;

const PRIORITY_STYLES: Record<PlanStep['priority'], { label: string; cls: string }> = {
  critical: { label: 'Критичный', cls: 'bg-[var(--accent-red)]/15 text-[var(--accent-red)]' },
  moderate: { label: 'Средний', cls: 'bg-amber-100 text-amber-700' },
  ok: { label: 'Низкий', cls: 'bg-(--chip) text-(--color-text-muted)' },
};

const STATUS_CYCLE: PlanStep['status'][] = ['todo', 'in_progress', 'done'];

function nextStatus(current: PlanStep['status']): PlanStep['status'] {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

function StepCard({
  step,
  index,
  onToggle,
}: {
  step: PlanStep;
  index: number;
  onToggle: (id: string, status: PlanStep['status']) => void;
}) {
  const priority = PRIORITY_STYLES[step.priority];

  const handleClick = () => {
    onToggle(step.id, nextStatus(step.status));
  };

  return (
    <div
      className={[
        'flex gap-4 rounded-xl border p-4 transition-colors',
        step.status === 'done'
          ? 'border-[var(--accent-green)] bg-[color-mix(in_srgb,var(--accent-green)_5%,var(--paper))]'
          : step.status === 'in_progress'
            ? 'border-[var(--blue-deep)] bg-[color-mix(in_srgb,var(--blue-deep)_5%,var(--paper))]'
            : 'border-(--color-border) bg-(--paper)',
      ].join(' ')}
    >
      {/* Status circle */}
      <button
        onClick={handleClick}
        className={[
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all',
          step.status === 'done'
            ? 'border-[var(--accent-green)] bg-[var(--accent-green)] text-white'
            : step.status === 'in_progress'
              ? 'border-[var(--blue-deep)] bg-[var(--blue-deep)] text-white'
              : 'border-(--line) bg-(--paper) text-(--color-text-muted) hover:border-[var(--blue-deep)]',
        ].join(' ')}
        title="Нажмите, чтобы сменить статус"
      >
        {step.status === 'done' ? <Check size={16} /> : index + 1}
      </button>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={[
              'text-sm font-semibold',
              step.status === 'done'
                ? 'text-(--color-text-muted) line-through'
                : 'text-(--color-text-primary)',
            ].join(' ')}
          >
            {step.title}
          </h3>
          <span className="rounded-full bg-(--chip) px-2 py-0.5 text-xs font-medium text-(--color-text-secondary)">
            {step.week_range}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priority.cls}`}>
            {priority.label}
          </span>
        </div>
        {step.description && (
          <p className="text-sm text-(--color-text-secondary) leading-relaxed">{step.description}</p>
        )}
      </div>
    </div>
  );
}

function MarkdownSection({ markdown }: { markdown: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card space-y-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <MonoLabel>Подробные рекомендации</MonoLabel>
        <span className="text-sm text-[var(--blue-deep)]">{open ? '▲ Свернуть' : '▼ Развернуть'}</span>
      </button>
      {open && (
        <div className="prose prose-sm max-w-none text-(--color-text-secondary) whitespace-pre-wrap">
          {markdown}
        </div>
      )}
    </div>
  );
}

function buildHeader(scenario: string, profession: string, targetProfession?: string): string {
  if (scenario === 'Смена профессии' && targetProfession) {
    return `${profession} → ${targetProfession}`;
  }
  return profession;
}

export default function PlanScreen({
  steps,
  markdown,
  scenario,
  profession,
  targetProfession,
  onStepStatusChange,
  onRestart,
  onOpenDashboard,
  onShare,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const doneCount = useMemo(() => steps.filter((s) => s.status === 'done').length, [steps]);
  const inProgressCount = useMemo(() => steps.filter((s) => s.status === 'in_progress').length, [steps]);

  const visibleSteps = showAll ? steps : steps.slice(0, INITIAL_VISIBLE);
  const hasSteps = steps.length > 0;
  const header = buildHeader(scenario, profession, targetProfession);

  if (!hasSteps && markdown) {
    return (
      <Layout step={4} wide={true}>
        <div className="space-y-8 slide-up">
          <div>
            <Eyebrow>{scenario}</Eyebrow>
            <h1 className="mt-1 text-2xl font-bold text-(--color-text-primary) sm:text-3xl">{header}</h1>
          </div>
          <div className="prose prose-sm max-w-none text-(--color-text-secondary) whitespace-pre-wrap">
            {markdown}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button variant="secondary" onClick={onRestart}>
              Начать заново
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout step={4} wide={true}>
      <div className="space-y-8 slide-up">
        {/* Header */}
        <div>
          <Eyebrow>{scenario}</Eyebrow>
          <h1 className="mt-1 text-2xl font-bold text-(--color-text-primary) sm:text-3xl">{header}</h1>
        </div>

        {/* Progress metrics */}
        {hasSteps && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card text-center">
              <MonoLabel>Выполнено</MonoLabel>
              <p className="mt-1 text-2xl font-bold text-[var(--accent-green)]">
                {doneCount} <span className="text-sm font-normal text-(--color-text-muted)">из {steps.length}</span>
              </p>
            </div>
            <div className="card text-center">
              <MonoLabel>В процессе</MonoLabel>
              <p className="mt-1 text-2xl font-bold text-[var(--blue-deep)]">{inProgressCount}</p>
            </div>
          </div>
        )}

        {/* Step list */}
        {hasSteps && (
          <div className="space-y-3">
            {visibleSteps.map((step, idx) => (
              <StepCard key={step.id} step={step} index={idx} onToggle={onStepStatusChange} />
            ))}
            {steps.length > INITIAL_VISIBLE && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-sm font-medium text-[var(--blue-deep)] hover:underline"
              >
                {showAll ? 'Свернуть ▲' : `Показать все ${steps.length} шагов ▼`}
              </button>
            )}
          </div>
        )}

        {/* Collapsible markdown */}
        {markdown && hasSteps && <MarkdownSection markdown={markdown} />}

        {/* Footer actions */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button variant="secondary" onClick={onRestart}>
            Начать заново
          </Button>
          {onOpenDashboard && (
            <Button variant="secondary" onClick={onOpenDashboard}>
              Личный кабинет
            </Button>
          )}
          {onShare && (
            <Button variant="ghost" onClick={onShare}>
              Поделиться
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
