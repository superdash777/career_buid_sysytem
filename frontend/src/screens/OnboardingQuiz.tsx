import { useMemo, useState } from 'react';
import { ArrowRight, ArrowLeft, Briefcase, AlertCircle, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import { useAuth } from '../auth/AuthContext';
import { saveOnboarding, ApiError } from '../api/client';
import { showToast } from '../components/toastStore';
import type { OnboardingPainPoint, Scenario } from '../types';
import { deriveScenarioRecommendation } from '../utils/onboarding';
import Eyebrow from '../components/ui/Eyebrow';
import Button from '../components/ui/Button';

interface Props {
  initialExperience?: string;
  initialPainPoint?: string;
  initialHours?: number;
  onBack?: () => void;
  onComplete: (result: { recommendedScenario: Scenario; painPoint: OnboardingPainPoint; developmentHoursPerWeek: number }) => void;
}

const EXPERIENCE_OPTIONS = [
  { value: 'До 1 года', emoji: '🌱' },
  { value: '1–3 года', emoji: '🚀' },
  { value: '3–6 лет', emoji: '⚡' },
  { value: 'Более 6 лет', emoji: '🏆' },
];

const PAIN_OPTIONS: Array<{ value: OnboardingPainPoint; title: string; subtitle: string; icon: typeof Briefcase }> = [
  { value: 'рост', title: 'Хочу расти в текущей роли', subtitle: 'Следующий грейд и требования рынка', icon: Briefcase },
  { value: 'смена', title: 'Хочу сменить профессию', subtitle: 'План перехода в новую роль', icon: ArrowRight },
  { value: 'стагнация', title: 'Чувствую стагнацию', subtitle: 'Новые направления развития', icon: AlertCircle },
  { value: 'неопределённость', title: 'Не понимаю, куда двигаться', subtitle: 'Нужны варианты и ориентиры', icon: Sparkles },
];

const HOURS_OPTIONS = [2, 4, 6, 8, 10, 12];

type Step = 'experience' | 'pain' | 'hours';
const STEPS: Step[] = ['experience', 'pain', 'hours'];

export default function OnboardingQuiz({
  initialExperience,
  initialPainPoint,
  initialHours,
  onBack,
  onComplete,
}: Props) {
  const { user, refreshMe } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('experience');
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

  const stepIndex = STEPS.indexOf(currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'experience': return Boolean(experience.trim());
      case 'pain': return Boolean(painPoint);
      case 'hours': return hours > 0;
      default: return false;
    }
  }, [currentStep, experience, painPoint, hours]);

  const canSubmit = useMemo(
    () => Boolean(experience.trim() && painPoint && hours > 0),
    [experience, painPoint, hours],
  );

  const goNext = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1]);
  };

  const goPrev = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1]);
  };

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

  const isLastStep = currentStep === 'hours';

  return (
    <Layout step={0} showStepper={false}>
      <div className="mx-auto max-w-2xl slide-up">
        {/* Header */}
        <div className="mb-8 text-center">
          <Eyebrow className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--chip)] px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Шаг {stepIndex + 1} из {STEPS.length}
          </Eyebrow>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)] md:text-4xl">
            Настроим ваш профиль
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            Ответы влияют на рекомендации сценария и прогноз Career GPS
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
            <div
              className="h-full rounded-full bg-[var(--blue-deep)] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <Alert variant="error" onClose={() => setError('')}>
              {error}
            </Alert>
          </div>
        )}

        {/* Step content */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-[var(--shadow-soft)] md:p-8">
          {currentStep === 'experience' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chip)]">
                  <Briefcase className="h-5 w-5 text-[var(--blue-deep)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--ink)]">Опыт в профессии</h2>
                  <p className="text-sm text-[var(--muted)]">Выберите наиболее подходящий вариант</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {EXPERIENCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setExperience(option.value)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                      experience === option.value
                        ? 'border-[var(--blue-deep)] bg-[var(--chip)] shadow-[0_0_0_1px_var(--blue-deep)]'
                        : 'border-[var(--line)] hover:border-[var(--blue-deep)]/40'
                    }`}
                  >
                    <span className="text-xl">{option.emoji}</span>
                    <span className={`text-sm font-medium ${
                      experience === option.value ? 'text-[var(--blue-deep)]' : 'text-[var(--ink)]'
                    }`}>
                      {option.value}
                    </span>
                    {experience === option.value && (
                      <CheckCircle2 className="ml-auto h-4 w-4 text-[var(--blue-deep)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'pain' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chip)]">
                  <AlertCircle className="h-5 w-5 text-[var(--blue-deep)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--ink)]">Что мешает развитию?</h2>
                  <p className="text-sm text-[var(--muted)]">Это определит направление рекомендаций</p>
                </div>
              </div>
              <div className="grid gap-3">
                {PAIN_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPainPoint(option.value)}
                    className={`flex items-start gap-4 rounded-xl border p-4 text-left transition-all duration-200 ${
                      painPoint === option.value
                        ? 'border-[var(--blue-deep)] bg-[var(--chip)] shadow-[0_0_0_1px_var(--blue-deep)]'
                        : 'border-[var(--line)] hover:border-[var(--blue-deep)]/40'
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      painPoint === option.value ? 'bg-[var(--blue-deep)] text-white' : 'bg-[var(--chip)]'
                    }`}>
                      <option.icon className={`h-4 w-4 ${painPoint === option.value ? 'text-white' : 'text-[var(--blue-deep)]'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        painPoint === option.value ? 'text-[var(--blue-deep)]' : 'text-[var(--ink)]'
                      }`}>
                        {option.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{option.subtitle}</p>
                    </div>
                    {painPoint === option.value && (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--blue-deep)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'hours' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chip)]">
                  <Clock className="h-5 w-5 text-[var(--blue-deep)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--ink)]">Время на развитие</h2>
                  <p className="text-sm text-[var(--muted)]">Сколько часов в неделю готовы выделять?</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {HOURS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      onClick={() => setHours(option)}
                      className={`flex h-14 w-14 items-center justify-center rounded-xl border text-sm font-semibold transition-all duration-200 ${
                        hours === option
                          ? 'border-[var(--blue-deep)] bg-[var(--blue-deep)] text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)]'
                          : 'border-[var(--line)] text-[var(--ink)] hover:border-[var(--blue-deep)]/40'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-[var(--muted)]">
                  <span className="font-semibold text-[var(--ink)]">{hours} ч/неделю</span>
                  {' — '}
                  {hours <= 4 ? 'спокойный темп, стабильный рост' : hours <= 8 ? 'активное развитие, быстрый прогресс' : 'интенсивный режим, максимальный рост'}
                </p>
              </div>

              <div className="rounded-xl bg-[var(--chip)] p-4">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  На основе ваших ответов мы автоматически предложим сценарий развития.
                  Вы всегда сможете его изменить.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {stepIndex > 0 ? (
              <Button variant="ghost" onClick={goPrev}>
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
            ) : onBack ? (
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
            ) : (
              <div />
            )}
          </div>

          {isLastStep ? (
            <Button onClick={submit} disabled={!canSubmit || saving}>
              {saving ? 'Сохраняем...' : 'Завершить настройку'}
              {!saving && <CheckCircle2 className="h-4 w-4" />}
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!canProceed}>
              Далее
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
