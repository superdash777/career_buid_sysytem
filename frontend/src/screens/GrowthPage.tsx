import { useState, useMemo } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, ArrowRight, Pencil, Download } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/ui/Button';
import MonoLabel from '../components/ui/MonoLabel';

// --------------- Types ---------------

interface AtlasParam {
  key: string;
  label: string;
  current: number;
  target: number;
  currentLabel: string;
  targetLabel: string;
  description: string;
}

interface SkillGap {
  name: string;
  current: number;
  required: number;
  delta: number;
  levelKey: string;
  description?: string;
}

export interface GrowthPageProps {
  profession: string;
  currentGrade: string;
  targetGrade: string;
  radarData: AtlasParam[];
  skillGaps: SkillGap[];
  skillStrong: { name: string; level: number }[];
  matchPercent: number;
  onBuildPlan: () => void;
  onBack: () => void;
  onGoToDashboard: () => void;
}

// --------------- Sub-components ---------------

function SkillChip({ name, variant }: { name: string; variant: 'critical' | 'grow' | 'strong' }) {
  const styles = {
    critical: 'bg-[#FCEBEB] text-[#A32D2D]',
    grow: 'bg-[#FAEEDA] text-[#BA7517]',
    strong: 'bg-[#E1F5EE] text-[#1D9E75]',
  };
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${styles[variant]}`}>
      {name}
    </span>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta <= 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-[#E1F5EE] px-2 py-0.5 text-[10px] font-semibold text-[#1D9E75]">
        ✓
      </span>
    );
  }
  if (delta === 1) {
    return (
      <span className="inline-flex items-center rounded-full bg-[#FAEEDA] px-2 py-0.5 text-[10px] font-semibold text-[#BA7517]">
        +1
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[#FCEBEB] px-2 py-0.5 text-[10px] font-semibold text-[#A32D2D]">
      +{delta}
    </span>
  );
}

function ParamRow({
  param,
  isActive,
  onToggle,
  onSliderChange,
}: {
  param: AtlasParam;
  isActive: boolean;
  onToggle: () => void;
  onSliderChange: (value: number) => void;
}) {
  const delta = param.target - param.current;
  const barColor = delta > 0 ? 'bg-[var(--blue-deep)]' : 'bg-[#1D9E75]';

  return (
    <div
      className={`cursor-pointer rounded-xl border p-3 transition-all duration-200 ${
        isActive
          ? 'border-[#AFA9EC] bg-[#EEEDFE]'
          : 'border-transparent hover:border-[var(--line)] hover:bg-[var(--bg)]'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-medium text-[var(--ink)]">{param.label}</span>
        <DeltaBadge delta={delta} />
      </div>

      {/* Progress bar */}
      <div className="relative h-[5px] rounded-full overflow-hidden mb-1.5">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--blue-deep)] opacity-20"
          style={{ width: `${(param.target / 5) * 100}%` }}
        />
        <div
          className={`absolute inset-y-0 left-0 rounded-full opacity-70 ${barColor}`}
          style={{ width: `${(param.current / 5) * 100}%` }}
        />
      </div>

      {/* Labels under bar */}
      <div className="flex items-center justify-between text-[9px] text-[var(--muted)]">
        <span>{param.currentLabel} ({param.current})</span>
        <span className="flex items-center gap-1">
          <ArrowRight className="h-2.5 w-2.5" />
          {param.targetLabel} ({param.target})
        </span>
      </div>

      {/* Expandable detail */}
      {isActive && (
        <div className="mt-3 space-y-3 border-t border-[#AFA9EC]/30 pt-3 fade-in" onClick={(e) => e.stopPropagation()}>
          <p className="text-[11px] leading-relaxed text-[var(--muted)]">{param.description}</p>
          <div>
            <p className="text-[10px] font-medium text-[var(--muted)] mb-1.5">
              Скорректировать самооценку (1–5):
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={param.current}
                onChange={(e) => onSliderChange(Number(e.target.value))}
                className="flex-1 accent-[var(--blue-deep)]"
              />
              <span className="w-6 text-center text-sm font-bold text-[var(--blue-deep)]">
                {param.current}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --------------- Main Component ---------------

export default function GrowthPage({
  profession,
  currentGrade,
  targetGrade,
  radarData,
  skillGaps,
  skillStrong,
  onBuildPlan,
  onBack,
}: GrowthPageProps) {
  const [localParams, setLocalParams] = useState<AtlasParam[]>(radarData);
  const [activeParamKey, setActiveParamKey] = useState<string | null>(null);

  const updateParam = (key: string, newCurrent: number) => {
    setLocalParams(prev =>
      prev.map(p => p.key === key ? { ...p, current: newCurrent } : p)
    );
  };

  const toggleParam = (key: string) => {
    setActiveParamKey(prev => prev === key ? null : key);
  };

  const computedMatch = useMemo(() => {
    const totalDelta = localParams.reduce((sum, p) => sum + Math.max(0, p.target - p.current), 0);
    const maxDelta = localParams.reduce((sum, p) => sum + p.target, 0);
    return Math.round((1 - totalDelta / (maxDelta || 1)) * 100);
  }, [localParams]);

  const gapParamCount = useMemo(
    () => localParams.filter(p => p.current < p.target).length,
    [localParams]
  );

  const criticalSkillCount = skillGaps.filter(s => s.delta >= 2).length;

  const chartData = localParams.map(p => ({
    subject: p.label,
    current: p.current,
    target: p.target,
    fullMark: 5,
  }));

  const prioritySkills = skillGaps.filter(s => s.delta >= 2);
  const growSkills = skillGaps.filter(s => s.delta === 1);

  return (
    <Layout step={4} wide>
      <div className="space-y-0 slide-up">
        {/* ---- Topbar row ---- */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--blue-deep)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </button>
          <MonoLabel>Результат · Growth</MonoLabel>
        </div>

        {/* ---- Hero ---- */}
        <section className="pb-6 border-b border-[var(--line)]">
          {/* Scenario tag */}
          <span className="inline-block rounded-full bg-[#EEEDFE] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#534AB7] mb-3">
            ↑ Growth — следующий грейд
          </span>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-[var(--ink)] sm:text-[26px] leading-tight mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Ваш путь к{' '}
            <em className="not-italic text-[#534AB7]" style={{ fontStyle: 'italic' }}>
              {targetGrade} {profession}
            </em>
          </h1>

          {/* Grade row */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className="inline-flex items-center rounded-full bg-[#534AB7] px-3.5 py-1 text-xs font-semibold text-white">
              {currentGrade}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-[var(--muted)]" />
            <span className="inline-flex items-center rounded-full border border-[#AFA9EC] bg-[#EEEDFE] px-3.5 py-1 text-xs font-semibold text-[#534AB7]">
              {targetGrade}
            </span>
            <span className="text-sm text-[var(--muted)]">{profession}</span>
          </div>

          {/* Stat chips */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 text-center shadow-[var(--shadow-soft)]">
              <p className="text-xl font-bold text-[#534AB7]">{computedMatch}%</p>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">Готовность</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 text-center shadow-[var(--shadow-soft)]">
              <p className="text-xl font-bold text-[var(--ink)]">{gapParamCount}</p>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">Параметров развить</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 text-center shadow-[var(--shadow-soft)]">
              <p className="text-xl font-bold text-[var(--ink)]">{criticalSkillCount}</p>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">Критических навыков</p>
            </div>
          </div>
        </section>

        {/* ---- Callout ---- */}
        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-2.5 my-4">
          <Pencil className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--muted)]" />
          <p className="text-[11px] leading-relaxed text-[var(--muted)]">
            <strong className="text-[var(--ink)]">Уточните самооценку:</strong>{' '}
            кликните на параметр справа и отрегулируйте текущий уровень — это сделает план точнее.
          </p>
        </div>

        {/* ---- Main two-column grid ---- */}
        <section className="border-t border-[var(--line)] pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
            {/* Left — Radar chart */}
            <div className="pr-0 sm:pr-5 sm:border-r sm:border-[var(--line)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] mb-3">
                Карьерный атлас
              </p>

              <div className="w-full" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                    <PolarGrid gridType="polygon" stroke="var(--line)" strokeWidth={0.75} />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 9, fill: 'var(--muted)', fontFamily: 'Manrope, var(--font-sans)' }}
                    />
                    <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                    <Radar
                      name="Целевой"
                      dataKey="target"
                      fill="#534AB7"
                      fillOpacity={0.08}
                      stroke="#534AB7"
                      strokeOpacity={0.4}
                      strokeWidth={1.5}
                      isAnimationActive={true}
                    />
                    <Radar
                      name="Текущий"
                      dataKey="current"
                      fill="#AFA9EC"
                      fillOpacity={0.45}
                      stroke="#534AB7"
                      strokeWidth={1.5}
                      isAnimationActive={true}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Custom legend */}
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#AFA9EC]" />
                  <span className="text-[10px] text-[var(--muted)]">Текущий</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#534AB7]" />
                  <span className="text-[10px] text-[var(--muted)]">Целевой ({targetGrade})</span>
                </div>
              </div>
            </div>

            {/* Right — Params list */}
            <div className="pl-0 sm:pl-5 mt-5 sm:mt-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] mb-3">
                Параметры роли
              </p>

              <div className="space-y-1.5 overflow-y-auto sm:max-h-[380px]">
                {localParams.map(p => (
                  <ParamRow
                    key={p.key}
                    param={p}
                    isActive={activeParamKey === p.key}
                    onToggle={() => toggleParam(p.key)}
                    onSliderChange={(val) => updateParam(p.key, val)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---- Skills section ---- */}
        <section className="border-t border-[var(--line)] pt-5 mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] mb-4">
            Рекомендуем эти навыки
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Priority skills (delta >= 2) */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block h-2 w-2 rounded-full bg-[#E24B4A]" />
                <span className="text-[11px] font-medium text-[var(--muted)]">Приоритетные (δ ≥ 2)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {prioritySkills.map(s => (
                  <SkillChip key={s.name} name={s.name} variant="critical" />
                ))}
                {prioritySkills.length === 0 && (
                  <span className="text-[11px] text-[var(--muted)]">—</span>
                )}
              </div>
            </div>

            {/* Grow skills (delta = 1) */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block h-2 w-2 rounded-full bg-[#EF9F27]" />
                <span className="text-[11px] font-medium text-[var(--muted)]">Развить (δ = 1)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {growSkills.map(s => (
                  <SkillChip key={s.name} name={s.name} variant="grow" />
                ))}
                {growSkills.length === 0 && (
                  <span className="text-[11px] text-[var(--muted)]">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Strong skills */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[#1D9E75]" />
              <span className="text-[11px] font-medium text-[var(--muted)]">Освоено</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skillStrong.map(s => (
                <SkillChip key={s.name} name={s.name} variant="strong" />
              ))}
              {skillStrong.length === 0 && (
                <span className="text-[11px] text-[var(--muted)]">—</span>
              )}
            </div>
          </div>
        </section>

        {/* ---- CTA bar ---- */}
        <section className="border-t border-[var(--line)] pt-5 mt-5 flex flex-col sm:flex-row gap-2">
          <Button
            className="flex-1"
            onClick={onBuildPlan}
          >
            Составить план развития
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary">
            <Download className="h-4 w-4" />
            Скачать PDF
          </Button>
        </section>
      </div>
    </Layout>
  );
}
