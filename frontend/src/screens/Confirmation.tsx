import { useState } from 'react';
import { ArrowLeft, Sparkles, Cpu } from 'lucide-react';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import MiniProgress from '../components/MiniProgress';
import SoftOnboardingHint from '../components/SoftOnboardingHint';
import { buildPlan, ApiError } from '../api/client';
import type { AppState, PlanResponse, Scenario } from '../types';
import { skillLevelLabel } from '../types';

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
        setError('Не удалось получить план. Попробуйте снова.');
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
            text="Создаём ваш персональный план…"
            subtext="Это может занять немного времени."
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout step={3}>
      <div className="space-y-8 slide-up">
        <div>
          <MiniProgress current={3} total={3} label="Подтверждение" />
          <h1 className="text-2xl sm:text-3xl font-bold text-(--color-text-primary) mt-2 mb-2">
            Проверьте данные перед анализом
          </h1>
          <p className="text-(--color-text-secondary)">
            Убедитесь, что всё верно — дальше Career Copilot построит персональный план.
          </p>
        </div>

        <SoftOnboardingHint id="confirm_ready">
          Почти готово — осталось одно действие.
        </SoftOnboardingHint>

        {error && (
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Goal summary */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-(--color-text-primary)">Цель</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="font-medium text-(--color-text-muted)">Профессия</dt>
            <dd className="text-(--color-text-primary)">{state.profession}</dd>
            <dt className="font-medium text-(--color-text-muted)">Сценарий</dt>
            <dd className="text-(--color-text-primary)">
              {state.scenario ? SCENARIO_LABELS[state.scenario as Scenario] : '—'}
            </dd>
            <dt className="font-medium text-(--color-text-muted)">Грейд</dt>
            <dd className="text-(--color-text-primary)">{state.grade}</dd>
            {state.scenario === 'Смена профессии' && (
              <>
                <dt className="font-medium text-(--color-text-muted)">Целевая профессия</dt>
                <dd className="text-(--color-text-primary)">{state.targetProfession}</dd>
              </>
            )}
          </dl>
        </div>

        {/* Skills summary */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-(--color-text-primary)">
            Навыки
            <span className="ml-2 text-sm font-normal text-(--color-text-muted)">
              ({state.skills.length})
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {topSkills.map((s) => (
              <span
                key={s.name}
                className="inline-flex items-center gap-1.5 rounded-lg bg-(--color-accent-light) px-3 py-1.5 text-sm font-medium text-(--color-accent)"
              >
                {s.name}
                <span className="opacity-60 text-xs">
                  {skillLevelLabel(s.level).toLowerCase()}
                </span>
              </span>
            ))}
            {state.skills.length > 5 && (
              <span className="inline-flex items-center rounded-lg bg-(--color-surface-alt) border border-(--color-border) px-3 py-1.5 text-sm text-(--color-text-muted)">
                +{state.skills.length - 5} ещё
              </span>
            )}
          </div>
        </div>

        {/* How we build the plan */}
        <div className="card bg-(--color-accent-light)/50 border-(--color-accent)/10">
          <div className="flex items-start gap-3">
            <Cpu className="h-5 w-5 shrink-0 mt-0.5 text-(--color-accent)" />
            <div>
              <p className="font-semibold text-sm text-(--color-text-primary) mb-1">Как мы будем строить план</p>
              <p className="text-sm text-(--color-text-secondary) leading-relaxed">
                Мы сравним ваш уровень с требованиями роли, определим разрывы,
                дополним контекстом через RAG и передадим данные AI для формирования
                плана по модели 70/20/10.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button onClick={onBack} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Назад
          </button>
          <button onClick={handleGenerate} className="btn-primary text-lg px-8 py-4">
            <Sparkles className="h-5 w-5" /> Построить план
          </button>
        </div>
      </div>
    </Layout>
  );
}
