import { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import ScenarioCard from '../components/ScenarioCard';
import MiniProgress from '../components/MiniProgress';
import SoftOnboardingHint from '../components/SoftOnboardingHint';
import SearchableSelect from '../components/SearchableSelect';
import { SkeletonForm } from '../components/Skeleton';
import { fetchProfessions } from '../api/client';
import type { AppState, Scenario, Grade, QuizPainPoint } from '../types';
import { GRADES, SCENARIOS } from '../types';
import { recommendScenarioFromPainPoint } from '../utils/onboarding';
import Button from '../components/ui/Button';
import Eyebrow from '../components/ui/Eyebrow';
import MonoLabel from '../components/ui/MonoLabel';

interface Props {
  state: AppState;
  onChange: (patch: Partial<AppState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const GRADE_DESCRIPTIONS: Record<Grade, string> = {
  'Младший (Junior)': 'Начинающий специалист, выполняет задачи под руководством',
  'Специалист (Middle)': 'Самостоятельно решает типовые задачи',
  'Старший (Senior)': 'Решает сложные задачи, менторит коллег',
  'Ведущий (Lead)': 'Руководит командой или техническим направлением',
  'Эксперт (Expert)': 'Определяет стратегию, влияет на всю организацию',
};

export default function GoalSetup({ state, onChange, onNext, onBack }: Props) {
  const [professions, setProfessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [validationError, setValidationError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    abortRef.current = new AbortController();
    fetchProfessions(abortRef.current.signal)
      .then(setProfessions)
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          setApiError('Не получилось загрузить данные. Проверьте соединение и попробуйте ещё раз.');
        }
      })
      .finally(() => setLoading(false));
    return () => { abortRef.current?.abort(); };
  }, []);

  useEffect(() => {
    const painPoint = state.onboardingPainPoint as QuizPainPoint | undefined;
    if (!painPoint || state.scenario) return;
    const recommended = recommendScenarioFromPainPoint(painPoint);
    if (recommended) onChange({ scenario: recommended });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.onboardingPainPoint, state.scenario]);

  const handleNext = () => {
    if (!state.profession) {
      setValidationError('Выберите профессию — без неё мы не сможем сопоставить требования роли.');
      return;
    }
    if (!state.scenario) {
      setValidationError('Выберите сценарий развития.');
      return;
    }
    if (state.scenario === 'Смена профессии' && !state.targetProfession) {
      setValidationError('Выберите целевую профессию для перехода.');
      return;
    }
    setValidationError('');
    onNext();
  };

  if (loading) {
    return (
      <Layout step={0}>
        <SkeletonForm />
      </Layout>
    );
  }

  const StepDots = () => (
    <div className="flex items-center justify-center gap-2 pb-4">
      {([1, 2, 3] as const).map((s) => (
        <div
          key={s}
          className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
            s === step
              ? 'scale-110 bg-[var(--blue-deep)]'
              : s < step
                ? 'bg-[var(--blue-deep)] opacity-40'
                : 'bg-[var(--line)]'
          }`}
        />
      ))}
    </div>
  );

  const scenarioLabel = SCENARIOS.find((s) => s.value === state.scenario)?.label ?? state.scenario;

  return (
    <Layout step={0}>
      <div className="space-y-8 slide-up">
        <div>
          <Eyebrow className="mb-2">Goal setup // карьерная цель</Eyebrow>
          <MiniProgress current={1} total={3} label="Цель" />
          <h1 className="mb-2 mt-2 text-3xl leading-tight text-(--color-text-primary) sm:text-4xl">
            Определим вашу цель
          </h1>
          <p className="text-(--color-text-secondary)">
            Выберите направление развития — Career Copilot соберёт оптимальный маршрут.
          </p>
        </div>

        {apiError && (
          <Alert variant="error" title="Не получилось загрузить данные" onClose={() => setApiError('')}>
            {apiError}
          </Alert>
        )}

        {validationError && (
          <Alert variant="warning" onClose={() => setValidationError('')}>
            {validationError}
          </Alert>
        )}

        <div className="card space-y-6">
          <StepDots />

          {step === 1 && (
            <div className="fade-in space-y-6">
              <MonoLabel>Шаг 1 из 3 — Выбор цели</MonoLabel>
              <div>
                <label className="label">Направление</label>
                <div className="space-y-3">
                  {SCENARIOS.map((s) => (
                    <ScenarioCard
                      key={s.value}
                      value={s.value}
                      label={s.label}
                      description={s.description}
                      selected={state.scenario === s.value}
                      onSelect={() => onChange({ scenario: s.value as Scenario })}
                    />
                  ))}
                </div>
              </div>

              {state.scenario && (
                <SoftOnboardingHint id="goal_scenario">
                  Отлично! Теперь настроим детали.
                </SoftOnboardingHint>
              )}

              {state.scenario === 'Смена профессии' && (
                <div className="fade-in relative z-10">
                  <label className="label">Целевая профессия</label>
                  <SearchableSelect
                    options={professions}
                    value={state.targetProfession}
                    onChange={(v) => onChange({ targetProfession: v })}
                    placeholder="Начните вводить или выберите роль"
                  />
                  <p className="helper">Выберите роль, в которую хотите перейти.</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="fade-in space-y-6">
              <MonoLabel>Шаг 2 из 3 — Текущая профессия и грейд</MonoLabel>
              <div>
                <label className="label">Ваша текущая профессия</label>
                <SearchableSelect
                  options={professions}
                  value={state.profession}
                  onChange={(v) => onChange({ profession: v })}
                  placeholder="Начните вводить или выберите из списка"
                />
                <p className="helper">Мы подтянем релевантные навыки и требования для этой роли.</p>
              </div>

              <div>
                <label className="label">Текущий грейд</label>
                <div className="relative">
                  <select
                    value={state.grade}
                    onChange={(e) => onChange({ grade: e.target.value as Grade })}
                    className="input-field appearance-none pr-10"
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-(--color-text-muted)"
                  >
                    ▾
                  </span>
                </div>
                <p className="helper">{GRADE_DESCRIPTIONS[state.grade]}</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="fade-in space-y-6">
              <MonoLabel>Шаг 3 из 3 — Подтверждение выбора</MonoLabel>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-5 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-(--color-text-secondary)">Сценарий</span>
                  <span className="font-medium text-(--color-text-primary)">{scenarioLabel}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-(--color-text-secondary)">Профессия</span>
                  <span className="font-medium text-(--color-text-primary)">{state.profession || '—'}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-(--color-text-secondary)">Грейд</span>
                  <span className="font-medium text-(--color-text-primary)">{state.grade}</span>
                </div>
                {state.scenario === 'Смена профессии' && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-(--color-text-secondary)">Целевая профессия</span>
                    <span className="font-medium text-(--color-text-primary)">{state.targetProfession || '—'}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="secondary"
            onClick={() => {
              if (step === 1) onBack();
              else setStep((step - 1) as 1 | 2);
            }}
          >
            ← Назад
          </Button>
          {step < 3 ? (
            <Button
              disabled={step === 1 && !state.scenario}
              onClick={() => setStep((step + 1) as 2 | 3)}
            >
              Далее →
            </Button>
          ) : (
            <Button onClick={handleNext}>Продолжить →</Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
