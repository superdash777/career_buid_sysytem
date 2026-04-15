import { useState, useMemo } from 'react';
import Layout from '../components/Layout';
import Button from '../components/ui/Button';
import Eyebrow from '../components/ui/Eyebrow';
import MonoLabel from '../components/ui/MonoLabel';
import type { GrowthAnalysis, SwitchAnalysis, SkillGap, Verdict } from '../types';

interface Props {
  analysis: GrowthAnalysis | SwitchAnalysis;
  scenario: string;
  profession: string;
  targetProfession?: string;
  onBuildPlan: () => void;
  onBack: () => void;
}

const INITIAL_VISIBLE = 5;

function deriveVerdict(match: number, gaps: { name: string }[], strengths: { name: string }[]): Verdict {
  if (match >= 70) {
    const top = strengths.slice(0, 2).map((s) => s.name).join(', ');
    return {
      color: 'green',
      title: 'Переход реален',
      body: top
        ? `Сильные стороны: ${top}. Вы уже обладаете большей частью необходимых навыков.`
        : 'Вы уже обладаете большей частью необходимых навыков.',
    };
  }
  if (match >= 40) {
    const top = gaps.slice(0, 2).map((g) => g.name).join(', ');
    return {
      color: 'amber',
      title: 'Переход реален, но есть нюанс',
      body: top
        ? `Ключевые пробелы: ${top}. Потребуется целенаправленная подготовка.`
        : 'Потребуется целенаправленная подготовка.',
    };
  }
  const top = gaps.slice(0, 3).map((g) => g.name).join(', ');
  return {
    color: 'red',
    title: 'Путь тяжёлый — честный разбор',
    body: top
      ? `Самые большие пробелы: ${top}. Рекомендуем сосредоточиться на фундаменте.`
      : 'Рекомендуем сосредоточиться на фундаменте.',
  };
}

const VERDICT_STYLES: Record<Verdict['color'], { border: string; bg: string; icon: string }> = {
  green: {
    border: 'border-[var(--accent-green)]',
    bg: 'bg-[color-mix(in_srgb,var(--accent-green)_8%,var(--paper))]',
    icon: '✓',
  },
  amber: {
    border: 'border-amber-400',
    bg: 'bg-amber-50',
    icon: '⚠',
  },
  red: {
    border: 'border-[var(--accent-red)]',
    bg: 'bg-[color-mix(in_srgb,var(--accent-red)_8%,var(--paper))]',
    icon: '✗',
  },
};

function SkillGapBar({ gap }: { gap: SkillGap }) {
  const pct = Math.min(100, Math.round((gap.current / Math.max(gap.required, 0.01)) * 100));
  const deltaColor = gap.delta >= 2 ? 'text-[var(--accent-red)]' : 'text-[var(--color-text-secondary)]';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-(--color-text-primary)">{gap.name}</span>
        <span className={`font-mono text-xs ${deltaColor}`}>
          {gap.current} → {gap.required} (Δ{gap.delta})
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-(--line)">
        <div
          className="h-2 rounded-full bg-[var(--blue-deep)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {gap.description && (
        <p className="text-xs text-(--color-text-muted)">{gap.description}</p>
      )}
    </div>
  );
}

function SwitchGapBar({ gap }: { gap: { name: string; importance: string; description: string } }) {
  const importanceColor =
    gap.importance === 'critical'
      ? 'bg-[var(--accent-red)] text-white'
      : gap.importance === 'important'
        ? 'bg-amber-400 text-white'
        : 'bg-(--chip) text-(--color-text-secondary)';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-(--color-text-primary)">{gap.name}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${importanceColor}`}>
          {gap.importance}
        </span>
      </div>
      {gap.description && (
        <p className="text-xs text-(--color-text-muted)">{gap.description}</p>
      )}
    </div>
  );
}

function VerdictCardInline({ verdict }: { verdict: Verdict }) {
  const s = VERDICT_STYLES[verdict.color];
  return (
    <div className={`rounded-xl border-2 ${s.border} ${s.bg} p-5 space-y-2`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{s.icon}</span>
        <h3 className="text-lg font-bold text-(--color-text-primary)">{verdict.title}</h3>
      </div>
      <p className="text-sm text-(--color-text-secondary) leading-relaxed">{verdict.body}</p>
    </div>
  );
}

function GrowthView({ analysis, profession }: { analysis: GrowthAnalysis; profession: string }) {
  const [showAll, setShowAll] = useState(false);

  const sortedGaps = useMemo(
    () => [...analysis.skill_gaps].sort((a, b) => b.delta - a.delta),
    [analysis.skill_gaps],
  );

  const criticalCount = sortedGaps.filter((g) => g.delta >= 2).length;
  const strongCount = analysis.skill_strong.length;
  const visibleGaps = showAll ? sortedGaps : sortedGaps.slice(0, INITIAL_VISIBLE);

  const verdict = useMemo(
    () =>
      deriveVerdict(
        analysis.match_percent,
        sortedGaps,
        analysis.skill_strong,
      ),
    [analysis.match_percent, sortedGaps, analysis.skill_strong],
  );

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Анализ грейда</Eyebrow>
        <h1 className="mt-1 text-2xl font-bold text-(--color-text-primary) sm:text-3xl">
          {profession}: {analysis.current_grade} → {analysis.target_grade}
        </h1>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card text-center">
          <MonoLabel>Готовность</MonoLabel>
          <p className="mt-1 text-3xl font-bold text-[var(--blue-deep)]">{analysis.match_percent}%</p>
        </div>
        <div className="card text-center">
          <MonoLabel>Критичных пробелов</MonoLabel>
          <p className="mt-1 text-3xl font-bold text-[var(--accent-red)]">{criticalCount}</p>
        </div>
        <div className="card text-center">
          <MonoLabel>Уже освоено</MonoLabel>
          <p className="mt-1 text-3xl font-bold text-[var(--accent-green)]">{strongCount}</p>
        </div>
      </div>

      <VerdictCardInline verdict={verdict} />

      {/* Skill gaps */}
      {sortedGaps.length > 0 && (
        <div className="card space-y-4">
          <MonoLabel>Пробелы в навыках</MonoLabel>
          <div className="space-y-4">
            {visibleGaps.map((gap) => (
              <SkillGapBar key={gap.name} gap={gap} />
            ))}
          </div>
          {sortedGaps.length > INITIAL_VISIBLE && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm font-medium text-[var(--blue-deep)] hover:underline"
            >
              {showAll ? 'Свернуть ▲' : `Показать все ${sortedGaps.length} ▼`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SwitchView({ analysis }: { analysis: SwitchAnalysis }) {
  const [showAll, setShowAll] = useState(false);

  const visibleGaps = showAll ? analysis.gaps : analysis.gaps.slice(0, INITIAL_VISIBLE);

  const verdict = useMemo(
    () =>
      deriveVerdict(
        analysis.match_percent,
        analysis.gaps,
        analysis.transferable,
      ),
    [analysis.match_percent, analysis.gaps, analysis.transferable],
  );

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Смена профессии</Eyebrow>
        <h1 className="mt-1 text-2xl font-bold text-(--color-text-primary) sm:text-3xl">
          {analysis.from_role} → {analysis.to_role}
        </h1>
      </div>

      {/* Transferable skills */}
      {analysis.transferable.length > 0 && (
        <div className="rounded-xl border-2 border-[var(--accent-green)] bg-[color-mix(in_srgb,var(--accent-green)_8%,var(--paper))] p-5 space-y-3">
          <p className="text-sm font-semibold text-(--color-text-primary)">
            Вы не начинаете с нуля. {analysis.transferable.length} навыков уже совпадают.
          </p>
          <div className="flex flex-wrap gap-2">
            {analysis.transferable.map((t) => (
              <span
                key={t.name}
                className="inline-flex items-center rounded-full bg-[var(--accent-green)]/15 px-3 py-1 text-sm font-medium text-[var(--accent-green)]"
                title={t.snippet}
              >
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <VerdictCardInline verdict={verdict} />

      {/* Gap bars */}
      {analysis.gaps.length > 0 && (
        <div className="card space-y-4">
          <MonoLabel>Нужно освоить</MonoLabel>
          <div className="space-y-4">
            {visibleGaps.map((gap) => (
              <SwitchGapBar key={gap.name} gap={gap} />
            ))}
          </div>
          {analysis.gaps.length > INITIAL_VISIBLE && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm font-medium text-[var(--blue-deep)] hover:underline"
            >
              {showAll ? 'Свернуть ▲' : `Показать все ${analysis.gaps.length} ▼`}
            </button>
          )}
        </div>
      )}

      {/* Suggested tracks */}
      {analysis.suggested_tracks.length > 0 && (
        <div className="card space-y-3">
          <MonoLabel>Рекомендуемые направления</MonoLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            {analysis.suggested_tracks.map((track) => (
              <div
                key={track}
                className="rounded-lg border border-(--color-border) bg-(--chip) p-3 text-sm font-medium text-(--color-text-primary)"
              >
                {track}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GapScreen({
  analysis,
  profession,
  onBuildPlan,
  onBack,
}: Props) {
  return (
    <Layout step={3} showStepper={true}>
      <div className="space-y-8 slide-up">
        {analysis.scenario === 'growth' ? (
          <GrowthView analysis={analysis} profession={profession} />
        ) : (
          <SwitchView analysis={analysis} />
        )}

        <div className="flex items-center justify-between pt-2">
          <Button variant="secondary" onClick={onBack}>
            ← Назад
          </Button>
          <Button onClick={onBuildPlan}>Построить план →</Button>
        </div>
      </div>
    </Layout>
  );
}
