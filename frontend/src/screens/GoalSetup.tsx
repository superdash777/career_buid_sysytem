import { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft, ChevronDown } from 'lucide-react';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
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
    setLoading(true);
    fetchProfessions()
      .then((p) => setProfessions(p))
      .catch(() => setApiError('Не получилось загрузить данные. Проверьте соединение и попробуйте ещё раз.'))
      .finally(() => setLoading(false));
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
        <Spinner text="Загружаем профессии..." />
      </Layout>
    );
  }

  return (
    <Layout step={1}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            Куда вы хотите прийти?
          </h1>
          <p className="text-slate-500">Настройте цель — план будет собран под вас.</p>
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

        {/* Profession */}
        <div className="card space-y-5">
          <div>
            <label className="label">Ваша текущая профессия</label>
            <div className="relative">
              <select
                value={state.profession}
                onChange={(e) => onChange({ profession: e.target.value })}
                className="input-field appearance-none pr-10"
              >
                <option value="">Например: Product Manager</option>
                {professions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            </div>
            <p className="helper">Выберите роль — мы подтянем релевантные навыки.</p>
          </div>

          {/* Scenario */}
          <div>
            <label className="label">Сценарий</label>
            <div className="space-y-2">
              {SCENARIOS.map((s) => (
                <label
                  key={s.value}
                  className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                    state.scenario === s.value
                      ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="scenario"
                    value={s.value}
                    checked={state.scenario === s.value}
                    onChange={() => onChange({ scenario: s.value as Scenario })}
                    className="mt-1 h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800">{s.label}</span>
                    <p className="text-sm text-slate-500 mt-0.5">{s.description}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="helper">Выберите сценарий — план будет собран по разной логике.</p>
          </div>

          {/* Target profession (conditional) */}
          {state.scenario === 'Смена профессии' && (
            <div>
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
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
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
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            </div>
            <p className="helper">Уровень нужен, чтобы корректно оценить «шаг вверх».</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button onClick={onBack} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Назад
          </button>
          <button onClick={handleNext} className="btn-primary">
            Дальше: навыки <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
