import { useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import { buildPlan, ApiError } from '../api/client';
import type { AppState, PlanResponse, Scenario } from '../types';

interface Props {
  state: AppState;
  onBack: () => void;
  onResult: (plan: PlanResponse) => void;
}

const SCENARIO_LABELS: Record<Scenario, string> = {
  'Следующий грейд': 'Следующий грейд',
  'Смена профессии': 'Смена профессии',
  'Исследование возможностей': 'Исследование возможностей',
};

export default function Confirmation({ state, onBack, onResult }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const topSkills = [...state.skills]
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 5);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const plan = await buildPlan({
        profession: state.profession,
        grade: state.grade,
        skills: state.skills,
        scenario: state.scenario as Scenario,
        target_profession:
          state.scenario === 'Смена профессии' ? state.targetProfession : undefined,
      });
      onResult(plan);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Не получилось загрузить данные. Проверьте соединение и попробуйте ещё раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout step={3}>
        <div className="py-20">
          <Spinner
            text="Собираем план…"
            subtext="Сопоставляем навыки с требованиями роли и формируем шаги."
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout step={3}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            Проверим ввод — и соберём план
          </h1>
          <p className="text-slate-500">Убедитесь, что всё верно, и нажмите кнопку.</p>
        </div>

        {error && (
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Goal summary */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Цель</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="font-medium text-slate-500">Профессия</dt>
            <dd className="text-slate-800">{state.profession}</dd>

            <dt className="font-medium text-slate-500">Сценарий</dt>
            <dd className="text-slate-800">
              {state.scenario ? SCENARIO_LABELS[state.scenario as Scenario] : '—'}
            </dd>

            <dt className="font-medium text-slate-500">Грейд</dt>
            <dd className="text-slate-800">{state.grade}</dd>

            {state.scenario === 'Смена профессии' && (
              <>
                <dt className="font-medium text-slate-500">Целевая профессия</dt>
                <dd className="text-slate-800">{state.targetProfession}</dd>
              </>
            )}
          </dl>
        </div>

        {/* Skills summary */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">
            Навыки
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({state.skills.length} добавлено)
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {topSkills.map((s) => (
              <span
                key={s.name}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700"
              >
                {s.name}
                <span className="text-xs text-indigo-400">
                  {s.level === 1 ? 'базовый' : s.level === 1.5 ? 'уверенный' : 'продвинутый'}
                </span>
              </span>
            ))}
            {state.skills.length > 5 && (
              <span className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-500">
                +{state.skills.length - 5} ещё
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button onClick={onBack} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Вернуться и поправить
          </button>
          <button onClick={handleGenerate} className="btn-primary text-lg px-8 py-4">
            <Sparkles className="h-5 w-5" /> Собрать мой план
          </button>
        </div>
      </div>
    </Layout>
  );
}
