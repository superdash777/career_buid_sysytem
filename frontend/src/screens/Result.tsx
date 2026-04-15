import { useState, useMemo } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip as RechartsTooltip,
} from 'recharts';
import { Check, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
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

        {/* Main content */}
        {/* Explore: full width, no sidebar */}
        {plan.analysis?.scenario === 'explore' && (
          <ExploreView data={plan.analysis} appState={appState} onSelectRole={onSelectRole} onBackToSkills={onBackToSkills} />
        )}

        {/* Growth / Switch: 2-column layout with sidebar */}
        {plan.analysis && plan.analysis.scenario !== 'explore' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="fade-in">
              {plan.analysis.scenario === 'growth' && <GrowthView data={plan.analysis} />}
              {plan.analysis.scenario === 'switch' && <SwitchView data={plan.analysis} />}
            </div>

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
        )}

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

function estimateTime(match: number): string {
  if (match >= 80) return '3–5 мес';
  if (match >= 70) return '5–7 мес';
  if (match >= 60) return '8–12 мес';
  if (match >= 50) return '8–10 мес';
  if (match >= 40) return '12–18 мес';
  return '14–18 мес';
}

function ExploreView({ data, appState, onSelectRole, onBackToSkills }: {
  data: ExploreAnalysis;
  appState: AppState;
  onSelectRole?: (role: string) => void;
  onBackToSkills: () => void;
}) {
  const closest = data.roles.filter(r => r.category === 'closest');
  const adjacent = data.roles.filter(r => r.category === 'adjacent');
  const far = data.roles.filter(r => r.category === 'far');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Eyebrow className="mb-2">Исследование возможностей</Eyebrow>
          <h2 className="text-2xl font-bold text-[var(--ink)] sm:text-3xl">Куда вы можете перейти</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            На основе вашего профиля — {data.roles.length} ролей
          </p>
        </div>
        <Button variant="secondary" onClick={onBackToSkills}>
          <RefreshCw className="h-4 w-4" />
          Обновить профиль
        </Button>
      </div>

      {/* Skills profile */}
      {appState.skills.length > 0 && (
        <div className="card">
          <p className="mb-3 text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Ваш профиль навыков</p>
          <div className="flex flex-wrap gap-2">
            {appState.skills.map(s => (
              <span key={s.name} className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-3 py-1.5 text-sm text-[var(--ink)]">
                {s.name}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Текущая роль: {appState.profession || '—'} · {appState.grade || '—'}
          </p>
        </div>
      )}

      {/* Closest roles */}
      {closest.length > 0 && (
        <div>
          <p className="mb-4 text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
            Ближайшие роли — ≥60% совпадения
          </p>
          <div className="space-y-3">
            {closest.map((role, idx) => (
              <div key={idx} className="card space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-bold text-[var(--ink)]">{role.title}</h3>
                  <span className="shrink-0 text-lg font-bold text-[var(--accent-green)]">{role.match}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
                  <div
                    className="h-full rounded-full bg-[var(--blue-deep)] transition-all duration-700"
                    style={{ width: `${role.match}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[var(--chip)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                    {estimateTime(role.match)}
                  </span>
                  {onSelectRole && (
                    <button
                      onClick={() => onSelectRole(role.title)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-[var(--blue-deep)] transition-colors hover:underline"
                    >
                      Построить план <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adjacent roles */}
      {adjacent.length > 0 && (
        <div>
          <p className="mb-4 text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
            Смежные роли — 30–60% совпадения
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {adjacent.map((role, idx) => (
              <div key={idx} className="card">
                <h3 className="text-base font-bold text-[var(--ink)]">{role.title}</h3>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-700"
                    style={{ width: `${role.match}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-[var(--muted)]">
                    {role.match}% · {estimateTime(role.match)}
                  </span>
                  {onSelectRole && (
                    <button
                      onClick={() => onSelectRole(role.title)}
                      className="text-xs font-semibold text-[var(--blue-deep)] hover:underline"
                    >
                      Построить план →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Far roles */}
      {far.length > 0 && (
        <div>
          <p className="mb-4 text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
            Дальние роли — требуют значительной переподготовки
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {far.map((role, idx) => (
              <div key={idx} className="card opacity-80">
                <h3 className="text-base font-bold text-[var(--ink)]">{role.title}</h3>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
                  <div
                    className="h-full rounded-full bg-slate-400 transition-all duration-700"
                    style={{ width: `${role.match}%` }}
                  />
                </div>
                <span className="mt-2 block text-xs text-[var(--muted)]">
                  {role.match}% · {estimateTime(role.match)}
                </span>
              </div>
            ))}
          </div>
        </div>
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
