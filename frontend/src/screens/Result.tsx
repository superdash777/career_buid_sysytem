import { useState } from 'react';
import Layout from '../components/Layout';
import ProgressLoader from '../components/ProgressLoader';
import CareerGpsTab from '../components/CareerGpsTab';
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
}

export default function Result({
  plan,
  appState,
  isAuthenticated = true,
  onSoftGate,
  onOpenOnboarding,
  onReset,
  onBackToSkills,
  onOpenDashboard,
  onOpenShare,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'gps'>('analysis');
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
      showToast('Сначала сохраните анализ, затем попробуйте снова');
      return;
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}#share/${plan.analysis_id}`;
    setSharing(true);
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Ссылка скопирована');
      onOpenShare(plan.analysis_id);
    } catch {
      showToast('Не удалось скопировать ссылку');
    } finally {
      setSharing(false);
    }
  };

  const toggleGap = (name: string) => {
    setSelectedGaps(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
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
    } finally {
      setPlanLoading(false);
    }
  };

  // Collect gap names from analysis
  const gapNames: string[] = [];
  if (plan.analysis?.scenario === 'growth') {
    for (const g of plan.analysis.skill_gaps) gapNames.push(g.name);
  } else if (plan.analysis?.scenario === 'switch') {
    for (const g of plan.analysis.gaps) gapNames.push(g.name);
  }

  return (
    <Layout step={4} wide>
      <div className="space-y-6 slide-up">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow className="mb-2">Result // аналитика и план</Eyebrow>
            <h1 className="text-3xl leading-tight text-(--color-text-primary) sm:text-4xl">Результаты анализа</h1>
            <p className="mt-1 text-(--color-text-muted)">Выберите навыки для развития и сформируйте план.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onReset}>Заново ↺</Button>
            <Button variant="secondary" onClick={handleShare} disabled={!plan.analysis_id || sharing}>
              {sharing ? 'Копируем...' : 'Поделиться результатом →'}
            </Button>
            <Button variant="secondary" onClick={handleCopy}>
              {copied ? 'Скопировано' : 'Скопировать'}
            </Button>
          </div>
        </div>

        <div className="inline-flex rounded-full border border-(--color-border) bg-(--color-surface-raised) p-1">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'analysis'
                ? 'bg-[var(--blue-deep)] text-white'
                : 'text-(--color-text-secondary) hover:bg-[var(--chip)]'
            }`}
          >
            Анализ
          </button>
          <button
            onClick={() => setActiveTab('gps')}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'gps'
                ? 'bg-[var(--blue-deep)] text-white'
                : 'text-(--color-text-secondary) hover:bg-[var(--chip)]'
            }`}
          >
            Карьерный GPS
          </button>
        </div>

        {/* Visual analysis */}
        {activeTab === 'analysis' && plan.analysis && (
          <div className="fade-in">
            {plan.analysis.scenario === 'growth' && <GrowthView data={plan.analysis} />}
            {plan.analysis.scenario === 'switch' && <SwitchView data={plan.analysis} />}
            {plan.analysis.scenario === 'explore' && <ExploreView data={plan.analysis} />}
          </div>
        )}

        {activeTab === 'gps' && (
          <div className="fade-in">
            <CareerGpsTab analysis={plan.analysis} appState={appState} />
          </div>
        )}

        {/* Gap selection for plan generation */}
        {activeTab === 'analysis' && gapNames.length > 0 && !focusedPlan && !planLoading && (
          <div className="card fade-in">
            <MonoLabel>Фокус плана</MonoLabel>
            <h3 className="mt-3 font-semibold text-(--color-text-primary)">Что хотите развить?</h3>
            <p className="text-xs text-(--color-text-muted)">Выберите навыки — мы сформируем фокусный план</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {gapNames.map(name => (
                <button
                  key={name}
                  onClick={() => toggleGap(name)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    selectedGaps.has(name)
                      ? 'bg-[var(--blue-deep)] text-white border-[var(--blue-deep)]'
                      : 'bg-(--color-surface-alt) text-(--color-text-secondary) border-(--color-border) hover:border-[var(--blue-deep)]/40'
                  }`}
                >
                  {selectedGaps.has(name) && '✓ '}
                  {name}
                </button>
              ))}
            </div>
            {selectedGaps.size > 0 && (
              <Button onClick={handleGeneratePlan}>Сформировать план ({selectedGaps.size}) →</Button>
            )}
            {planError && <p className="text-sm text-red-500 mt-3">{planError}</p>}
          </div>
        )}

        {/* Plan loading */}
        {activeTab === 'analysis' && planLoading && (
          <ProgressLoader text="Формируем персональный план…" subtext="Это займёт несколько секунд" durationMs={20000} />
        )}

        {/* Focused plan */}
        {activeTab === 'analysis' && focusedPlan && <FocusedPlanView plan={focusedPlan} />}

        {/* Footer */}
        {!isAuthenticated && (
          <div className="card border-(--color-border) bg-[color-mix(in_srgb,var(--paper)_92%,white)]">
            <MonoLabel>Soft gate</MonoLabel>
            <h3 className="mt-3 text-lg font-semibold text-(--color-text-primary)">
              Сохранить результат и получить полный план
            </h3>
            <p className="mt-2 text-sm text-(--color-text-secondary)">
              Сейчас вы видите бесплатный снэпшот: match, gap-анализ и базовые рекомендации.
              Создайте аккаунт, чтобы сохранить историю, открыть полный план и трекинг прогресса.
            </p>
            {onSoftGate && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={onSoftGate}>Создать аккаунт и сохранить →</Button>
              </div>
            )}
          </div>
        )}

        {isAuthenticated && !appState.developmentHoursPerWeek && (
          <div className="card border-(--color-border) bg-[color-mix(in_srgb,var(--paper)_92%,white)]">
            <MonoLabel>Onboarding booster</MonoLabel>
            <h3 className="mt-3 text-lg font-semibold text-(--color-text-primary)">
              Уточните темп развития
            </h3>
            <p className="mt-2 text-sm text-(--color-text-secondary)">
              Добавьте 3 коротких ответа о вашем опыте и доступном времени — это улучшит рекомендации
              и точность карьерного GPS.
            </p>
            {onOpenOnboarding && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={onOpenOnboarding}>
                  Заполнить onboarding →
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="secondary" onClick={onBackToSkills}>← Уточнить навыки</Button>
          {isAuthenticated && (
            <Button variant="secondary" onClick={onOpenDashboard}>Личный кабинет →</Button>
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
      {/* Tasks */}
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

      {/* Communication */}
      <div className="card">
        <MonoLabel>20%</MonoLabel>
        <h3 className="mt-3 mb-4 font-semibold text-(--color-text-primary)">Развитие через общение</h3>
        <ul className="space-y-2">
          {plan.communication.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-(--color-text-secondary)">
              <span className="mt-0.5 shrink-0 text-(--color-text-muted)">—</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Learning */}
      <div className="card">
        <MonoLabel>10%</MonoLabel>
        <h3 className="mt-3 mb-4 font-semibold text-(--color-text-primary)">Книги для обучения</h3>
        <ul className="space-y-2">
          {plan.learning.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-(--color-text-secondary)">
              <span className="mt-0.5 shrink-0 text-(--color-text-muted)">—</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


// ======================== GROWTH ========================

function GrowthView({ data }: { data: GrowthAnalysis }) {
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
          <div className="text-right px-5 py-3 rounded-xl bg-[var(--chip)]">
            <div className="text-xs text-(--color-text-muted) font-medium">Совпадение</div>
            <div className="text-2xl font-bold text-[var(--blue-deep)]">{data.match_percent}%</div>
          </div>
        </div>
      </div>

      {data.radar_data.length > 0 && (
        <div className="card">
          <MonoLabel>Параметры атласа</MonoLabel>
          <div className="mt-3 space-y-2">
            {data.radar_data.map((d, i) => {
              const progress = d.target > 0 ? Math.min(100, (d.current / d.target) * 100) : 0;
              return (
                <div key={i} className="rounded-xl border border-(--color-border) p-3">
                  <div className="mb-1 flex justify-between text-sm font-medium">
                    <span className="text-(--color-text-primary)">{d.param}</span>
                    <span className="text-(--color-text-muted)">{d.current_label} → {d.target_label}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-(--color-border)">
                    <div className="h-full rounded-full bg-[var(--blue-deep)]" style={{ width: `${progress}%` }} />
                  </div>
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
            ✓ Сильные стороны
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
            <span className="text-xs font-bold text-(--color-text-muted) uppercase">Из профессии</span>
            <div className="font-semibold text-(--color-text-primary)">{data.from_role}</div>
          </div>
          <span className="hidden text-(--color-text-muted) sm:block">→</span>
          <div className="flex-1 text-center sm:text-left">
            <span className="text-xs font-bold text-(--color-text-muted) uppercase">В профессию</span>
            <div className="font-semibold text-[var(--blue-deep)]">{data.to_role}</div>
          </div>
          <div className="px-5 py-3 rounded-xl bg-[var(--chip)] text-center">
            <div className="text-xs text-(--color-text-muted) font-bold uppercase">Совместимость</div>
            <div className="text-2xl font-bold text-[var(--blue-deep)]">{data.match_percent}%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-(--color-text-primary)">
            ✓ Переносимые навыки
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.transferable.map(s => (
              <span key={s.name} className="rounded-full border border-(--color-border) bg-[var(--chip)] px-3 py-1.5 text-sm font-medium text-(--color-text-primary)">
                {s.name}
              </span>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-(--color-text-primary)">
            ○ Зона роста
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.gaps.map(g => (
              <span key={g.name} className="rounded-full border border-(--color-border) bg-(--color-surface-alt) px-3 py-1.5 text-sm font-medium text-(--color-text-primary)">
                {g.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


// ======================== EXPLORE ========================

function ExploreView({ data }: { data: ExploreAnalysis }) {
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
        <ExploreRoleCard key={idx} role={role} categoryColor={categoryColor} categoryLabel={categoryLabel} />
      ))}
    </div>
  );
}

function ExploreRoleCard({ role, categoryColor, categoryLabel }: {
  role: ExploreAnalysis['roles'][0];
  categoryColor: Record<string, string>;
  categoryLabel: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card hover:shadow-md transition-all cursor-pointer" onClick={() => setOpen(!open)}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-(--color-text-primary) text-lg">{role.title}</h3>
        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${categoryColor[role.category] || ''}`}>
          {role.match}%
        </span>
      </div>
      <span className="text-xs font-medium text-(--color-text-muted)">{categoryLabel[role.category]}</span>
      {role.missing.length > 0 && (
        <div className="mt-3">
          <span className="text-xs font-semibold text-(--color-text-muted) uppercase">Не хватает:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {role.missing.map(m => (
              <span key={m} className="text-xs px-2 py-1 bg-(--color-surface-alt) text-(--color-text-secondary) rounded border border-(--color-border)">{m}</span>
            ))}
          </div>
        </div>
      )}
      {open && role.reasons.length > 0 && (
        <div className="mt-4 pt-3 border-t border-(--color-border) fade-in">
          <ul className="space-y-1">
            {role.reasons.map((r, i) => (
              <li key={i} className="text-sm text-(--color-text-secondary) flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-(--color-text-muted)">—</span> {r}
              </li>
            ))}
          </ul>
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
              <span className={`text-(--color-text-muted) transition-transform ${expandedIdx === i ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </button>
            {expandedIdx === i && (
              <div className="px-4 pb-4 fade-in space-y-3">
                {g.description && (
                  <div className="p-3 rounded-lg bg-(--color-accent-light)/50 border-l-3 border-(--color-accent)">
                    <p className="text-xs font-bold text-(--color-text-muted) uppercase mb-1">Описание уровня</p>
                    <p className="text-sm text-(--color-text-secondary) leading-relaxed">{g.description}</p>
                  </div>
                )}
                {g.tasks && (
                  <div className="p-3 rounded-lg bg-emerald-500/5 border-l-3 border-emerald-500">
                    <p className="text-xs font-bold text-(--color-text-muted) uppercase mb-1">Задачи на развитие</p>
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
