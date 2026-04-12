import { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import { useAuth } from '../auth/AuthContext';
import { saveOnboarding, ApiError } from '../api/client';
import { showToast } from '../components/toastStore';
import type { OnboardingPainPoint, Scenario } from '../types';
import { deriveScenarioRecommendation } from '../utils/onboarding';
import Eyebrow from '../components/ui/Eyebrow';
import Button from '../components/ui/Button';
import MonoLabel from '../components/ui/MonoLabel';

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
      <div className="mx-auto max-w-6xl space-y-6 slide-up">
        <div>
          <Eyebrow className="mb-2">Onboarding // 3 вопроса</Eyebrow>
          <h1 className="text-3xl leading-tight text-[var(--ink)] md:text-4xl">Настроим персональный старт</h1>
          <p className="mt-2 max-w-2xl text-(--color-text-secondary)">
            Ответы сохраняются в профиле и влияют на рекомендации сценария и прогноз в Career GPS.
          </p>
        </div>

        {error && (
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className="grid gap-5 lg:grid-cols-[0.25fr_0.5fr_0.25fr]">
          <aside className="card h-fit space-y-4">
            <MonoLabel>Шаг 01</MonoLabel>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Отметьте опыт, ключевую боль и доступное время. Это занимает меньше минуты.
            </p>
          </aside>

          <div className="card space-y-7">
            <div>
              <label className="label">Какой у вас опыт в профессии?</label>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {EXPERIENCE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setExperience(option)}
                    className={`rounded-2xl border px-3 py-2.5 text-left text-sm transition-colors ${
                      experience === option
                        ? 'border-[var(--blue-deep)] bg-[var(--chip)] text-[var(--blue-deep)]'
                        : 'border-(--color-border) hover:border-[var(--blue-deep)]/40'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Что сейчас больше всего мешает развитию?</label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {PAIN_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPainPoint(option.value)}
                    className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                      painPoint === option.value
                        ? 'border-[var(--blue-deep)] bg-[var(--chip)]'
                        : 'border-(--color-border) hover:border-[var(--blue-deep)]/40'
                    }`}
                  >
                    <p className="text-sm font-medium text-(--color-text-primary)">{option.title}</p>
                    <p className="mt-0.5 text-xs text-(--color-text-muted)">{option.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Сколько часов в неделю готовы выделять на развитие?</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {HOURS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setHours(option)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      hours === option
                        ? 'border-[var(--blue-deep)] bg-[var(--chip)] text-[var(--blue-deep)]'
                        : 'border-(--color-border) hover:border-[var(--blue-deep)]/40'
                    }`}
                  >
                    {option} ч/нед
                  </button>
                ))}
              </div>
            </div>
          </div>

          <aside className="card h-fit space-y-4">
            <MonoLabel>Почему важно</MonoLabel>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Более точный onboarding уменьшает шум в рекомендациях и повышает релевантность плана.
            </p>
          </aside>
        </div>

        <div className="flex items-center justify-between gap-2">
          {onBack ? (
            <Button variant="secondary" onClick={onBack}>
              ← Назад
            </Button>
          ) : (
            <div />
          )}
          <Button onClick={submit} disabled={!canSubmit || saving}>
            {saving ? 'Сохраняем...' : 'Продолжить →'}
          </Button>
        </div>

        <div className="card border-[var(--line)] bg-[var(--chip)]">
          <p className="text-sm text-(--color-text-secondary)">
            На основе ответов мы автоматически предложим сценарий в следующем шаге. Вы всегда сможете его изменить.
          </p>
        </div>
      </div>
    </Layout>
  );
}
