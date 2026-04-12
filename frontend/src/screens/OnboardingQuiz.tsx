import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, Compass, Goal, UserRound } from 'lucide-react';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import { useAuth } from '../auth/AuthContext';
import { saveOnboarding, ApiError } from '../api/client';
import { showToast } from '../components/toastStore';
import type { OnboardingPainPoint, Scenario } from '../types';
import { deriveScenarioRecommendation } from '../utils/onboarding';

interface Props {
  initialExperience?: string;
  initialPainPoint?: string;
  initialHours?: number;
  onBack?: () => void;
  onComplete: (result: { recommendedScenario: Scenario; painPoint: OnboardingPainPoint; developmentHoursPerWeek: number }) => void;
}

const EXPERIENCE_OPTIONS = [
  'До 1 года',
  '1–3 года',
  '3–6 лет',
  'Более 6 лет',
];

const PAIN_OPTIONS: Array<{ value: OnboardingPainPoint; title: string; subtitle: string }> = [
  { value: 'рост', title: 'Хочу расти в текущей роли', subtitle: 'Интересует следующий грейд и требования рынка' },
  { value: 'смена', title: 'Хочу сменить профессию', subtitle: 'Нужен план перехода в новую роль' },
  { value: 'стагнация', title: 'Чувствую стагнацию', subtitle: 'Хочу увидеть новые направления развития' },
  { value: 'неопределённость', title: 'Не понимаю, куда двигаться', subtitle: 'Нужны варианты и ориентиры' },
];

const HOURS_OPTIONS = [2, 4, 6, 8, 10, 12];

export default function OnboardingQuiz({
  initialExperience,
  initialPainPoint,
  initialHours,
  onBack,
  onComplete,
}: Props) {
  const { user, refreshMe } = useAuth();
  const [experience, setExperience] = useState(initialExperience || user?.experience_level || '');
  const [painPoint, setPainPoint] = useState<OnboardingPainPoint | ''>(
    initialPainPoint && ['рост', 'смена', 'стагнация', 'неопределённость'].includes(initialPainPoint)
      ? (initialPainPoint as OnboardingPainPoint)
      : user?.pain_point && ['рост', 'смена', 'стагнация', 'неопределённость'].includes(user.pain_point)
        ? (user.pain_point as OnboardingPainPoint)
      : '',
  );
  const [hours, setHours] = useState<number>(initialHours || user?.development_hours_per_week || 4);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(
    () => Boolean(experience.trim() && painPoint && hours > 0),
    [experience, painPoint, hours],
  );

  const submit = async () => {
    if (!canSubmit || !painPoint) {
      setError('Пожалуйста, ответьте на все вопросы.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await saveOnboarding({
        experience_level: experience.trim(),
        pain_point: painPoint,
        development_hours_per_week: hours,
      });
      await refreshMe();
      showToast('Профиль сохранён. Рекомендации обновлены.');
      const recommendedScenario = deriveScenarioRecommendation(painPoint);
      onComplete({
        recommendedScenario: result.recommended_scenario || recommendedScenario,
        painPoint,
        developmentHoursPerWeek: hours,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Не удалось сохранить ответы';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout step={0} showStepper={false}>
      <div className="mx-auto max-w-3xl space-y-6 slide-up">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-(--color-text-primary)">Короткий onboarding</h1>
          <p className="mt-2 text-(--color-text-secondary)">
            Ответьте на 3 вопроса — мы подберём стартовый сценарий и точнее рассчитаем карьерный GPS.
          </p>
        </div>

        {error && (
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className="card space-y-6">
          <div>
            <label className="label flex items-center gap-2">
              <UserRound className="h-4 w-4 text-(--color-accent)" />
              Какой у вас опыт в профессии?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {EXPERIENCE_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => setExperience(option)}
                  className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                    experience === option
                      ? 'border-(--color-accent) bg-(--color-accent-light) text-(--color-accent)'
                      : 'border-(--color-border) hover:border-(--color-accent)/40'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label flex items-center gap-2">
              <Goal className="h-4 w-4 text-(--color-accent)" />
              Что сейчас больше всего мешает развитию?
            </label>
            <div className="space-y-2 mt-2">
              {PAIN_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPainPoint(option.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    painPoint === option.value
                      ? 'border-(--color-accent) bg-(--color-accent-light)'
                      : 'border-(--color-border) hover:border-(--color-accent)/40'
                  }`}
                >
                  <p className="text-sm font-medium text-(--color-text-primary)">{option.title}</p>
                  <p className="text-xs text-(--color-text-muted) mt-0.5">{option.subtitle}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-(--color-accent)" />
              Сколько часов в неделю готовы выделять на развитие?
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {HOURS_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => setHours(option)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    hours === option
                      ? 'border-(--color-accent) bg-(--color-accent-light) text-(--color-accent)'
                      : 'border-(--color-border) hover:border-(--color-accent)/40'
                  }`}
                >
                  {option} ч/нед
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {onBack ? (
            <button onClick={onBack} className="btn-secondary" type="button">
              <ArrowLeft className="h-4 w-4" /> Назад
            </button>
          ) : (
            <div />
          )}
          <button onClick={submit} className="btn-primary" disabled={!canSubmit || saving}>
            {saving ? 'Сохраняем...' : 'Продолжить'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="card bg-(--color-accent-light)/40 border-(--color-accent)/15">
          <p className="text-sm text-(--color-text-secondary) flex items-start gap-2">
            <Compass className="h-4 w-4 mt-0.5 text-(--color-accent)" />
            На основе ответов мы автоматически предложим сценарий в следующем шаге. Вы всегда сможете его изменить.
          </p>
        </div>
      </div>
    </Layout>
  );
}
