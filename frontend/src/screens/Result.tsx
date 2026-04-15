import { useState, useMemo } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip as RechartsTooltip,
} from 'recharts';
import { Check, Sparkles, CheckCircle2, AlertTriangle, TrendingUp, Briefcase, Target, ArrowRight } from 'lucide-react';
import Layout from '../components/Layout';
import ProgressLoader from '../components/ProgressLoader';
import { buildFocusedPlan, ApiError } from '../api/client';
import { showToast } from '../components/toastStore';
import type {
  PlanResponse, GrowthAnalysis, SwitchAnalysis, ExploreAnalysis,
  AppState, FocusedPlan,
} from '../types';
import Button from '../components/ui/Button';
import Eyebrow from '../components/ui/Eyebrow';
import MonoLabel from '../components/ui/MonoLabel';

interface Props {
  plan: PlanResponse;
  appState: AppState;
  isAuthenticated?: boolean;
  onSoftGate?: () => void;
  onOpenOnboarding?: () => void;
  onReset: () => void;
  onBackToSkills: () => void;
  onOpenDashboard: () => void;
  onOpenShare: (analysisId: string) => void;
  onSelectRole?: (roleName: string) => void;
}

function MatchRing({ percent }: { percent: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color = percent > 70 ? 'var(--accent-green)' : percent > 40 ? '#f59e0b' : 'var(--accent-red)';
  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <svg className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} stroke="var(--line)" strokeWidth="5" fill="transparent" />
        <circle cx="32" cy="32" r={r} stroke={color} strokeWidth="5" fill="transparent"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-lg font-bold text-[var(--ink)]">{percent}%</span>
    </div>
  );
}

const SCENARIO_TAB_MAP: Record<string, { label: string; icon: typeof TrendingUp }> = {
  growth: { label: 'Грейд', icon: TrendingUp },
  switch: { label: 'Профессия', icon: Briefcase },
  explore: { label: 'Векторы', icon: Target },
};

export default function Result({
  plan, appState, isAuthenticated = true, onSoftGate, onReset,
  onBackToSkills, onOpenDashboard, onOpenShare, onSelectRole,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [selectedGaps, setSelectedGaps] = useState<Set<string>>(new Set());
  const [focusedPlan, setFocusedPlan] = useState<FocusedPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState('');
  const [sharing, setSharing] = useState(false);

  const scenario = plan.analysis?.scenario || 'growth';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(plan.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!plan.analysis_id || sharing) {
      showToast('Сначала сохраните анализ');
      return;
    }
    setSharing(true);
    try {
      const shareUrl = `${window.location.origin}${window.location.pathname}#share/${plan.analysis_id}`;
      await navigator.clipboard.writeText(shareUrl);
      showToast('Ссылка скопирована');
      onOpenShare(plan.analysis_id);
    } catch { showToast('Не удалось скопировать ссылку'); }
    finally { setSharing(false); }
  };

  const toggleGap = (name: string) => {
    setSelectedGaps(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleGeneratePlan = async () => {
    if (selectedGaps.size === 0) return;
    setPlanLoading(true);
    setPlanError('');
    try {
      const result = await buildFocusedPlan({
        profession: appState.profession,
        grade: appState.grade,
        scenario: appState.scenario,
        target_profession: appState.targetProfession || undefined,
        selected_skills: Array.from(selectedGaps),
      });
      setFocusedPlan(result);
    } catch (err) {
      setPlanError(err instanceof ApiError ? err.message : 'Не удалось сформировать план');
    } finally { setPlanLoading(false); }
  };

  const gapNames: string[] = [];
  if (plan.analysis?.scenario === 'growth') {
    for (const g of plan.analysis.skill_gaps) gapNames.push(g.name);
  } else if (plan.analysis?.scenario === 'switch') {
    for (const g of plan.analysis.gaps) gapNames.push(g.name);
  }

  return (
    <Layout step={4} wide>
      <div className="space-y-6 slide-up">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow className="mb-2">Результаты анализа</Eyebrow>
            <h1 className="text-3xl leading-tight text-(--color-text-primary) sm:text-4xl">Ваш план развития</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onReset}>Заново</Button>
            <Button variant="secondary" onClick={handleShare} disabled={!plan.analysis_id || sharing}>
              {sharing ? 'Копируем...' : 'Поделиться'}
            </Button>
            <Button variant="secondary" onClick={handleCopy}>
              {copied ? 'Скопировано' : 'Скопировать'}
            </Button>
          </div>
        </div>

        {/* Scenario tabs */}
        <div className="inline-flex rounded-xl border border-(--color-border) bg-(--color-surface-raised) p-1">
          {Object.entries(SCENARIO_TAB_MAP).map(([key, { label, icon: Icon }]) => (
            <div
              key={key}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                scenario === key
                  ? 'bg-[var(--blue-deep)] text-white'
                  : 'text-(--color-text-muted) cursor-default'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </div>
          ))}
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: analysis */}
          <div className="lg:col-span-2 space-y-6">
            {plan.analysis && (
              <div className="fade-in">
                {plan.analysis.scenario === 'growth' && <GrowthView data={plan.analysis} />}
                {plan.analysis.scenario === 'switch' && <SwitchView data={plan.analysis} />}
                {plan.analysis.scenario === 'explore' && <ExploreView data={plan.analysis} onSelectRole={onSelectRole} />}
              </div>
            )}

            {planLoading && (
              <ProgressLoader text="Формируем персональный план..." subtext="Несколько секунд" durationMs={20000} />
            )}

            {focusedPlan && <FocusedPlanView plan={focusedPlan} />}
          </div>

          {/* Right column: plan builder sidebar */}
          <div className="space-y-6">
            <div className="card sticky top-24">
              <MonoLabel>Сборка плана</MonoLabel>
              <h3 className="mt-3 font-semibold text-(--color-text-primary)">Фокусные зоны</h3>
              <p className="text-xs text-(--color-text-muted) mb-4">Выберите навыки для индивидуального роадмапа</p>

              {gapNames.length > 0 ? (
                <>
                  <div className="space-y-2 mb-4">
                    {gapNames.map(name => {
                      const isSelected = selectedGaps.has(name);
                      return (
                        <button
                          key={name}
                          onClick={() => toggleGap(name)}
                          className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition-all ${
                            isSelected
                              ? 'border-[var(--blue-deep)] bg-[var(--chip)]'
                              : 'border-(--color-border) hover:border-[var(--blue-deep)]/40'
                          }`}
                        >
                          {isSelected ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--blue-deep)]" />
                          ) : (
                            <div className="h-4 w-4 shrink-0 rounded-full border border-(--color-border)" />
                          )}
                          <span className={isSelected ? 'font-medium text-[var(--blue-deep)]' : 'text-(--color-text-secondary)'}>{name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-(--color-border) pt-4">
                    <div className="mb-3 flex items-center justify-between text-sm">
                      <span className="text-(--color-text-muted)">Выбрано:</span>
                      <span className="font-bold text-lg text-(--color-text-primary)">{selectedGaps.size}</span>
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleGeneratePlan}
                      disabled={selectedGaps.size === 0 || planLoading}
                    >
                      {planLoading ? (
                        <><Sparkles className="h-4 w-4 animate-pulse" /> Генерируем...</>
                      ) : (
                        <>Сгенерировать роадмап <ArrowRight className="h-4 w-4" /></>
                      )}
                    </Button>
                    {planError && <p className="text-xs text-red-500 mt-2">{planError}</p>}
                  </div>
                </>
              ) : (
                <p className="text-sm text-(--color-text-muted)">
                  Завершите анализ, чтобы выбрать навыки для развития.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        {!isAuthenticated && onSoftGate && (
          <div className="card border-(--color-border) bg-[var(--chip)]">
            <h3 className="text-lg font-semibold text-(--color-text-primary)">
              Сохранить результат и получить полный план
            </h3>
            <p className="mt-2 text-sm text-(--color-text-secondary)">
              Создайте аккаунт, чтобы сохранить историю и открыть трекинг прогресса.
            </p>
            <div className="mt-4">
              <Button onClick={onSoftGate}>Создать аккаунт и сохранить</Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="secondary" onClick={onBackToSkills}>← Уточнить навыки</Button>
          {isAuthenticated && (
            <Button variant="secondary" onClick={onOpenDashboard}>Личный кабинет</Button>
          )}
        </div>
      </div>
    </Layout>
  );
}


// ======================== FOCUSED PLAN ========================

function FocusedPlanView({ plan }: { plan: FocusedPlan }) {
  return (
    <div className="space-y-4 fade-in">
      <div className="card">
        <MonoLabel>70%</MonoLabel>
        <h3 className="mt-3 font-semibold text-(--color-text-primary)">Задачи на развитие</h3>
        <div className="space-y-4">
          {plan.tasks.map((t, i) => (
            <div key={i}>
              <p className="text-sm font-semibold text-(--color-accent) mb-2">{t.skill}</p>
              <ul className="space-y-1.5">
                {t.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-(--color-text-secondary)">
                    <span className="mt-0.5 shrink-0 text-(--color-text-muted)">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <MonoLabel>20%</MonoLabel>
        <h3 className="mt-3 mb-4 font-semibold text-(--color-text-primary)">Развитие через общение</h3>
        <ul className="space-y-2">
          {plan.communication.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-(--color-text-secondary)">
              <span className="mt-0.5 shrink-0 text-(--color-text-muted)">—</span><span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <MonoLabel>10%</MonoLabel>
        <h3 className="mt-3 mb-4 font-semibold text-(--color-text-primary)">Книги</h3>
        <ul className="space-y-2">
          {plan.learning.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-(--color-text-secondary)">
              <span className="mt-0.5 shrink-0 text-(--color-text-muted)">—</span><span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


// ======================== GROWTH ========================

function GrowthView({ data }: { data: GrowthAnalysis }) {
  const [editedRadar, setEditedRadar] = useState<Record<string, number>>({});
  const [editingParam, setEditingParam] = useState<string | null>(null);

  const radarChartData = data.radar_data.map((d) => ({
    subject: d.param,
    current: editedRadar[d.param] ?? d.current,
    required: d.target,
    fullMark: Math.max(d.target, 5),
  }));

  const matchPercent = useMemo(() => {
    if (Object.keys(editedRadar).length === 0) return data.match_percent;
    let matched = 0;
    let total = data.radar_data.length;
    for (const d of data.radar_data) {
      const cur = editedRadar[d.param] ?? d.current;
      if (cur >= d.target) matched++;
    }
    return total > 0 ? Math.round((matched / total) * 100) : 0;
  }, [editedRadar, data]);

  const strengths = data.skill_strong.slice(0, 5).map((s) => s.name);
  const growthAreas = data.skill_gaps.slice(0, 3).map((g) => g.name);

  const handleResetRadar = () => { setEditedRadar({}); setEditingParam(null); };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <MonoLabel>План роста</MonoLabel>
            <h2 className="mt-2 text-xl font-bold text-(--color-text-primary)">
              {data.current_grade} <span className="text-(--color-text-muted) mx-1">→</span> {data.target_grade}
            </h2>
          </div>
          <div className="flex flex-col items-end">
            <MatchRing percent={matchPercent} />
            <span className="text-xs text-(--color-text-muted) mt-1">Совпадение с ролью</span>
          </div>
        </div>
      </div>

      {radarChartData.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <MonoLabel>Параметры роли</MonoLabel>
            {Object.keys(editedRadar).length > 0 && (
              <button onClick={handleResetRadar} className="text-xs text-[var(--blue-deep)] hover:underline">
                Сбросить к исходным
              </button>
            )}
          </div>
          <div className="mt-3 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarChartData}>
                <PolarGrid stroke="var(--line)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--muted)', fontSize: 12, fontWeight: 500 }} />
                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--paper)', boxShadow: 'none' }} />
                <Radar name="Ваш уровень" dataKey="current" stroke="var(--blue-deep)" fill="var(--blue-deep)" fillOpacity={0.35} />
                <Radar name="Цель" dataKey="required" stroke="var(--accent-green)" fill="var(--accent-green)" fillOpacity={0.1} strokeDasharray="4 4" />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-[var(--blue-deep)] opacity-60" /> Ваш уровень</div>
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full border-2 border-dashed border-[var(--accent-green)]" /> Цель</div>
          </div>

          {/* Interactive parameter editing */}
          <div className="mt-4 space-y-2">
            <p className="text-xs text-(--color-text-muted)">Нажмите на параметр, чтобы переоценить себя:</p>
            {data.radar_data.map((d) => {
              const current = editedRadar[d.param] ?? d.current;
              const isEditing = editingParam === d.param;
              return (
                <div key={d.param} className="rounded-xl border border-(--color-border) p-3">
                  <button
                    className="w-full flex items-center justify-between text-sm"
                    onClick={() => setEditingParam(isEditing ? null : d.param)}
                  >
                    <span className="font-medium text-(--color-text-primary)">{d.param}</span>
                    <span className="text-(--color-text-muted)">{current} / {d.target}</span>
                  </button>
                  {isEditing && (
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={d.target + 2}
                        value={current}
                        onChange={(e) => setEditedRadar(prev => ({ ...prev, [d.param]: Number(e.target.value) }))}
                        className="flex-1 accent-[var(--blue-deep)]"
                      />
                      <span className="text-sm font-bold text-[var(--blue-deep)] w-8 text-right">{current}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Summary */}
      {(strengths.length > 0 || growthAreas.length > 0) && (
        <div className="card border-[var(--blue-deep)]/20 bg-[var(--chip)]">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--blue-deep)]" />
            <h3 className="font-semibold text-[var(--blue-deep)]">AI-анализ профиля</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {strengths.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--accent-green)]">
                  <CheckCircle2 className="h-4 w-4" /> Сильные стороны
                </h4>
                <ul className="space-y-1.5">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-(--color-text-secondary)">
                      <span className="mt-0.5 text-[var(--accent-green)]">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {growthAreas.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-600">
                  <AlertTriangle className="h-4 w-4" /> Зоны роста
                </h4>
                <ul className="space-y-1.5">
                  {growthAreas.map((g, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-(--color-text-secondary)">
                      <span className="mt-0.5 text-amber-500">•</span> {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {data.skill_gaps.length > 0 && <SkillGapsSection gaps={data.skill_gaps} />}

      {data.skill_strong.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-(--color-text-primary) mb-3 flex items-center gap-2">
            <Check className="h-4 w-4 text-[var(--accent-green)]" /> Сильные стороны
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.skill_strong.map(s => (
              <span key={s.name} className="rounded-full border border-(--color-border) bg-[var(--chip)] px-3 py-1.5 text-sm font-medium text-(--color-text-primary)">
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ======================== SWITCH ========================

function SwitchView({ data }: { data: SwitchAnalysis }) {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 text-center sm:text-left">
            <span className="text-xs font-medium text-(--color-text-muted)">Из профессии</span>
            <div className="font-semibold text-(--color-text-primary)">{data.from_role}</div>
          </div>
          <span className="hidden text-(--color-text-muted) sm:block">→</span>
          <div className="flex-1 text-center sm:text-left">
            <span className="text-xs font-medium text-(--color-text-muted)">В профессию</span>
            <div className="font-semibold text-[var(--blue-deep)]">{data.to_role}</div>
          </div>
          <MatchRing percent={data.match_percent} />
        </div>
      </div>

      {/* Horizontal bars for transferable skills */}
      <div className="card">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-(--color-text-primary)">
          <Check className="h-4 w-4 text-[var(--accent-green)]" /> Переносимые навыки
        </h3>
        <div className="space-y-3">
          {data.transferable.map(s => (
            <div key={s.name}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-(--color-text-primary)">{s.name}</span>
                <span className="text-(--color-text-muted)">Совпадает</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-(--color-border)">
                <div className="h-full rounded-full bg-[var(--blue-deep)]" style={{ width: '100%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gaps as bars */}
      <div className="card">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-(--color-text-primary)">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Зона роста
        </h3>
        <div className="space-y-3">
          {data.gaps.map(g => {
            const pct = g.importance === 'must-have' ? 20 : g.importance === 'nice-to-have' ? 40 : 10;
            return (
              <div key={g.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-(--color-text-primary)">{g.name}</span>
                  <span className="text-xs text-amber-600">{g.importance === 'must-have' ? 'Критично' : 'Желательно'}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-(--color-border)">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {data.gaps.length > 0 && <SkillGapsSection gaps={data.gaps} />}
    </div>
  );
}


// ======================== EXPLORE ========================

function ExploreView({ data, onSelectRole }: { data: ExploreAnalysis; onSelectRole?: (role: string) => void }) {
  const categoryColor: Record<string, string> = {
    closest: 'bg-[var(--chip)] text-[var(--blue-deep)] border-(--color-border)',
    adjacent: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    far: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  };
  const categoryLabel: Record<string, string> = {
    closest: 'Ближайшие', adjacent: 'Смежные', far: 'Дальние',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.roles.map((role, idx) => (
        <ExploreRoleCard key={idx} role={role} categoryColor={categoryColor} categoryLabel={categoryLabel} onSelectRole={onSelectRole} />
      ))}
    </div>
  );
}

function ExploreRoleCard({ role, categoryColor, categoryLabel, onSelectRole }: {
  role: ExploreAnalysis['roles'][0];
  categoryColor: Record<string, string>;
  categoryLabel: Record<string, string>;
  onSelectRole?: (role: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card transition-all">
      <div className="cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-(--color-text-primary) text-lg">{role.title}</h3>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${categoryColor[role.category] || ''}`}>
            {role.match}%
          </span>
        </div>
        <span className="text-xs font-medium text-(--color-text-muted)">{categoryLabel[role.category]}</span>
        {role.missing.length > 0 && (
          <div className="mt-3">
            <span className="text-xs font-semibold text-(--color-text-muted)">Не хватает:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {role.missing.map(m => (
                <span key={m} className="text-xs px-2 py-1 bg-(--color-surface-alt) text-(--color-text-secondary) rounded border border-(--color-border)">{m}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {open && role.reasons.length > 0 && (
        <div className="mt-4 pt-3 border-t border-(--color-border) fade-in">
          <ul className="space-y-1 mb-3">
            {role.reasons.map((r, i) => (
              <li key={i} className="text-sm text-(--color-text-secondary) flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-(--color-text-muted)">—</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {onSelectRole && (
        <button
          onClick={(e) => { e.stopPropagation(); onSelectRole(role.title); }}
          className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--blue-deep)] transition-colors hover:underline"
        >
          Построить план для этой роли <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}


// ======================== SHARED ========================

function SkillGapsSection({ gaps }: { gaps: Array<{ name: string; description?: string; tasks?: string; level_key?: string }> }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const withDetails = gaps.filter(g => g.description || g.tasks);
  if (withDetails.length === 0) return null;

  return (
    <div className="card">
      <h3 className="font-semibold text-(--color-text-primary) mb-4 flex items-center gap-2">
        Навыки: описание и задачи
      </h3>
      <div className="space-y-2">
        {withDetails.map((g, i) => (
          <div key={g.name} className="rounded-xl border border-(--color-border) overflow-hidden">
            <button
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-(--color-surface-alt) transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-(--color-text-primary)">{g.name}</span>
                {g.level_key && (
                  <span className="text-xs px-2 py-0.5 rounded bg-(--color-accent-light) text-(--color-accent) font-medium">
                    {g.level_key}
                  </span>
                )}
              </div>
              <span className={`text-(--color-text-muted) transition-transform ${expandedIdx === i ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {expandedIdx === i && (
              <div className="px-4 pb-4 fade-in space-y-3">
                {g.description && (
                  <div className="p-3 rounded-lg bg-(--color-accent-light)/50 border-l-3 border-(--color-accent)">
                    <p className="text-xs font-bold text-(--color-text-muted) mb-1">Описание уровня</p>
                    <p className="text-sm text-(--color-text-secondary) leading-relaxed">{g.description}</p>
                  </div>
                )}
                {g.tasks && (
                  <div className="p-3 rounded-lg bg-emerald-500/5 border-l-3 border-emerald-500">
                    <p className="text-xs font-bold text-(--color-text-muted) mb-1">Задачи на развитие</p>
                    <p className="text-sm text-(--color-text-secondary) leading-relaxed whitespace-pre-line">{g.tasks}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
