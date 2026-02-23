import { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft, ChevronDown } from 'lucide-react';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import ScenarioCard from '../components/ScenarioCard';
import MiniProgress from '../components/MiniProgress';
import SoftOnboardingHint from '../components/SoftOnboardingHint';
import { fetchProfessions } from '../api/client';
import type { AppState, Scenario, Grade } from '../types';
import { GRADES, SCENARIOS } from '../types';

interface Props {
  state: AppState;
  onChange: (patch: Partial<AppState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function GoalSetup({ state, onChange, onNext, onBack }: Props) {
  const [professions, setProfessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchProfessions()
      .then((p) => { if (!cancelled) setProfessions(p); })
      .catch(() => { if (!cancelled) setApiError('Не получилось загрузить данные. Проверьте соединение и попробуйте ещё раз.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

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
      <Layout step={1}>
        <Spinner text="Загружаем данные..." />
      </Layout>
    );
  }

  return (
    <Layout step={1}>
      <div className="space-y-8 slide-up">
        <div>
          <MiniProgress current={1} total={3} label="Цель" />
          <h1 className="text-2xl sm:text-3xl font-bold text-(--color-text-primary) mt-2 mb-2">
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
          {/* Profession */}
          <div>
            <label className="label">Ваша текущая профессия</label>
            <div className="relative">
              <select
                value={state.profession}
                onChange={(e) => onChange({ profession: e.target.value })}
                className="input-field appearance-none pr-10"
              >
                <option value="">Выберите профессию</option>
                {professions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-(--color-text-muted)" />
            </div>
            <p className="helper">Мы подтянем релевантные навыки и требования для этой роли.</p>
          </div>

          {/* Scenario cards */}
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

          {/* Target profession (conditional) */}
          {state.scenario === 'Смена профессии' && (
            <div className="fade-in">
              <label className="label">Целевая профессия</label>
              <div className="relative">
                <select
                  value={state.targetProfession}
                  onChange={(e) => onChange({ targetProfession: e.target.value })}
                  className="input-field appearance-none pr-10"
                >
                  <option value="">Выберите роль</option>
                  {professions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-(--color-text-muted)" />
              </div>
              <p className="helper">Выберите роль, в которую хотите перейти.</p>
            </div>
          )}

          {/* Grade */}
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
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-(--color-text-muted)" />
            </div>
            <p className="helper">Уровень нужен, чтобы корректно оценить «шаг вверх».</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button onClick={onBack} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Назад
          </button>
          <button onClick={handleNext} className="btn-primary">
            Продолжить <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
