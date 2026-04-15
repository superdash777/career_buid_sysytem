import { useState, useEffect, useCallback } from 'react';
import GoalSelection from './screens/GoalSelection';
import Dashboard from './screens/Dashboard';
import OnboardingQuiz from './screens/OnboardingQuiz';
import GoalSetup from './screens/GoalSetup';
import Skills from './screens/Skills';
import Confirmation from './screens/Confirmation';
import Result from './screens/Result';
import Auth from './screens/Auth';
import PublicLanding from './screens/PublicLanding';
import HRLanding from './screens/HRLanding';
import Alert from './components/Alert';
import NavBar from './components/NavBar';
import ShareCard from './components/ShareCard';
import ToastContainer from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './auth/AuthContext';
import { healthCheck, fetchSharedAnalysis, ApiError } from './api/client';
import type { AppState, PlanResponse, AnalysisRecord, Grade, Scenario, Skill, SharedAnalysisResponse } from './types';
import { GRADES, INITIAL_STATE } from './types';
import { Loader2, Home } from 'lucide-react';

type Screen =
  | 'public'
  | 'demo'
  | 'quickstart'
  | 'soft-gate'
  | 'login'
  | 'register'
  | 'share'
  | 'welcome'
  | 'onboarding'
  | 'dashboard'
  | 'goal'
  | 'skills'
  | 'confirm'
  | 'result'
  | 'hr-landing';

const SCREEN_ORDER: Screen[] = [
  'public',
  'demo',
  'quickstart',
  'soft-gate',
  'login',
  'register',
  'share',
  'welcome',
  'onboarding',
  'dashboard',
  'goal',
  'skills',
  'confirm',
  'result',
  'hr-landing',
];

const STORAGE_KEY = 'career_copilot_state';
const PLAN_STORAGE_KEY = 'career_copilot_plan';

function loadSavedState(): AppState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...INITIAL_STATE, ...parsed };
    }
  } catch { /* ignore */ }
  return INITIAL_STATE;
}

function loadSavedPlan(): PlanResponse | null {
  try {
    const raw = sessionStorage.getItem(PLAN_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function screenFromHash(): Screen {
  const hash = window.location.hash.replace('#', '') as Screen;
  if (hash.startsWith('share/')) return 'share';
  if (SCREEN_ORDER.includes(hash)) return hash;
  return 'public';
}

function shareIdFromHash(): string | null {
  const raw = window.location.hash.replace('#', '');
  if (!raw.startsWith('share/')) return null;
  const id = raw.slice('share/'.length).trim();
  return id || null;
}

function isScenario(value: string): value is Scenario {
  return value === 'Следующий грейд'
    || value === 'Смена профессии'
    || value === 'Исследование возможностей';
}

function isGrade(value: string): value is Grade {
  return GRADES.includes(value as Grade);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseSkills(payload: Record<string, unknown>): Skill[] {
  const rawSkills = Array.isArray(payload.skills) ? payload.skills : [];
  const parsed: Skill[] = [];
  for (const skill of rawSkills) {
    const record = asRecord(skill);
    if (!record) continue;
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    const level = asNumber(record.level);
    if (!name || level === null) continue;
    parsed.push({
      name,
      level,
      raw_name: typeof record.raw_name === 'string' ? record.raw_name : undefined,
      confidence: asNumber(record.confidence) ?? undefined,
      confidence_band:
        record.confidence_band === 'exact'
        || record.confidence_band === 'fuzzy'
        || record.confidence_band === 'vector_llm'
        || record.confidence_band === 'llm_unknown'
          ? record.confidence_band
          : undefined,
      evidence: typeof record.evidence === 'string' ? record.evidence : undefined,
      alternatives: Array.isArray(record.alternatives)
        ? record.alternatives
            .map((candidate) => {
              const c = asRecord(candidate);
              if (!c || typeof c.name !== 'string') return null;
              return {
                name: c.name,
                score: asNumber(c.score),
              };
            })
            .filter((candidate): candidate is { name: string; score: number | null } => Boolean(candidate))
        : undefined,
    });
  }
  return parsed;
}

function toPlanResponse(item: AnalysisRecord): PlanResponse | null {
  const result = asRecord(item.result_json);
  if (!result) return null;
  const markdown = typeof result.markdown === 'string' ? result.markdown : '';
  if (!markdown) return null;
  const plan: PlanResponse = { markdown, analysis_id: item.id };
  if (Array.isArray(result.role_titles)) {
    plan.role_titles = result.role_titles.filter((title): title is string => typeof title === 'string');
  }
  const analysis = asRecord(result.analysis);
  if (analysis) {
    plan.analysis = analysis as unknown as PlanResponse['analysis'];
  }
  return plan;
}

function getShareMatchPercent(analysis: SharedAnalysisResponse['analysis']): number {
  if (!analysis) return 0;
  if (analysis.scenario === 'growth' || analysis.scenario === 'switch') {
    return Math.round(analysis.match_percent ?? 0);
  }
  return Math.round(analysis.roles?.[0]?.match ?? 0);
}

export default function App() {
  const { isAuthenticated, user, refreshMe } = useAuth();
  const [screen, setScreenRaw] = useState<Screen>(screenFromHash);
  const [state, setStateRaw] = useState<AppState>(loadSavedState);
  const [plan, setPlanRaw] = useState<PlanResponse | null>(loadSavedPlan);
  const [serviceDown, setServiceDown] = useState(false);
  const [sharedPlan, setSharedPlan] = useState<SharedAnalysisResponse | null>(null);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedError, setSharedError] = useState('');
  const [pendingAuthScreen, setPendingAuthScreen] = useState<Screen | null>(null);

  const setScreen = useCallback((s: Screen, replace = false) => {
    if (s === 'share') return;
    setScreenRaw(s);
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({ screen: s }, '', `#${s}`);
  }, []);

  const openShare = useCallback((analysisId: string, replace = false) => {
    const method = replace ? 'replaceState' : 'pushState';
    setScreenRaw('share');
    window.history[method]({ screen: 'share', analysisId }, '', `#share/${analysisId}`);
  }, []);

  useEffect(() => {
    if (screen === 'share') return;
    if (isAuthenticated && screen === 'soft-gate') {
      setScreen('dashboard', true);
      return;
    }
    if (isAuthenticated && (screen === 'public' || screen === 'login' || screen === 'register' || screen === 'demo')) {
      setScreen(pendingAuthScreen || 'welcome', true);
      setPendingAuthScreen(null);
      return;
    }
    if (!isAuthenticated
      && screen !== 'public'
      && screen !== 'demo'
      && screen !== 'quickstart'
      && screen !== 'goal'
      && screen !== 'skills'
      && screen !== 'login'
      && screen !== 'register'
      && screen !== 'confirm'
      && screen !== 'result'
      && screen !== 'soft-gate'
      && screen !== 'hr-landing') {
      setScreen('public', true);
    }
  }, [isAuthenticated, screen, setScreen, pendingAuthScreen]);

  useEffect(() => {
    if (typeof user?.development_hours_per_week === 'number' && user.development_hours_per_week > 0) {
      setStateRaw((prev) => ({ ...prev, developmentHoursPerWeek: user.development_hours_per_week ?? undefined }));
    }
  }, [user?.development_hours_per_week]);

  useEffect(() => {
    healthCheck().then((ok) => {
      if (!ok) setServiceDown(true);
    });
  }, []);

  // Persist state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (plan) {
      sessionStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
    } else {
      sessionStorage.removeItem(PLAN_STORAGE_KEY);
    }
  }, [plan]);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = (e.state?.screen as Screen) || screenFromHash();
      if (s === 'share') {
        setScreenRaw('share');
        return;
      }
      if (s === 'result' && !plan) {
        setScreenRaw('confirm');
        return;
      }
      setScreenRaw(s);
    };
    window.addEventListener('popstate', onPop);

    // Set initial history entry
    if (!window.history.state?.screen) {
      window.history.replaceState({ screen: screen }, '', `#${screen}`);
    }

    return () => window.removeEventListener('popstate', onPop);
  }, [plan, screen]);

  useEffect(() => {
    if (screen !== 'share') return;
    const shareId = shareIdFromHash();
    if (!shareId) {
      setSharedPlan(null);
      setSharedError('Некорректная ссылка на результат.');
      return;
    }
    let cancelled = false;
    setSharedLoading(true);
    setSharedError('');
    setSharedPlan(null);
    fetchSharedAnalysis(shareId)
      .then((result) => {
        if (cancelled) return;
        setSharedPlan(result);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : 'Не удалось загрузить общий результат';
        setSharedError(message);
      })
      .finally(() => {
        if (!cancelled) setSharedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [screen]);

  const update = (patch: Partial<AppState>) =>
    setStateRaw((prev) => ({ ...prev, ...patch }));

  const setPlan = (p: PlanResponse | null) => setPlanRaw(p);

  const openAnalysisFromHistory = useCallback((item: AnalysisRecord) => {
    const restoredPlan = toPlanResponse(item);
    if (!restoredPlan) return;

    const payload = asRecord(item.skills_json) || {};
    const restoredSkills = parseSkills(payload);
    const scenario = isScenario(item.scenario) ? item.scenario : '';
    const gradeCandidate = typeof payload.grade === 'string' ? payload.grade : '';

    setStateRaw((prev) => ({
      ...prev,
      profession: item.current_role || prev.profession,
      scenario,
      grade: isGrade(gradeCandidate) ? gradeCandidate : prev.grade,
      targetProfession: item.target_role || '',
      skills: restoredSkills.length > 0 ? restoredSkills : prev.skills,
    }));
    setPlanRaw(restoredPlan);
    setScreen('result');
  }, [setScreen]);

  const reset = () => {
    setStateRaw(INITIAL_STATE);
    setPlanRaw(null);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(PLAN_STORAGE_KEY);
    setScreen(isAuthenticated ? 'welcome' : 'public', true);
  };

  if (serviceDown) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-(--color-surface)">
        <div className="max-w-md w-full">
          <div className="mb-4"><NavBar /></div>
          <Alert variant="warning" title="Сервис временно недоступен">
            Попробуйте обновить страницу через минуту.
          </Alert>
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                healthCheck().then((ok) => {
                  if (ok) setServiceDown(false);
                });
              }}
              className="btn-secondary text-sm"
            >
              Проверить снова
            </button>
          </div>
        </div>
        <ToastContainer />
      </div>
    );
  }

  const renderScreen = () => {
    if (screen === 'share') {
      return (
        <div className="min-h-screen flex flex-col bg-(--color-surface)">
          <header className="sticky top-0 z-30 border-b border-(--color-border) bg-(--color-surface-raised)/80 backdrop-blur-md">
            <div className="mx-auto max-w-4xl px-4">
              <NavBar />
            </div>
          </header>
          <main className="flex-1">
            <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
              {sharedLoading && (
                <div className="card flex items-center gap-3 text-(--color-text-secondary)">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Загружаем результат...
                </div>
              )}

              {sharedError && (
                <Alert variant="error">
                  {sharedError}
                </Alert>
              )}

              {!sharedLoading && !sharedError && sharedPlan && (
                <ShareCard
                  title="Мой план развития"
                  scenario={sharedPlan.analysis?.scenario || sharedPlan.scenario || ''}
                  matchPercent={getShareMatchPercent(sharedPlan.analysis)}
                  topSkills={(() => {
                    const a = sharedPlan.analysis;
                    if (!a) return [];
                    if (a.scenario === 'growth') return a.skill_gaps?.slice(0, 5).map((g: { name: string }) => g.name) || [];
                    if (a.scenario === 'switch') return a.gaps?.slice(0, 5).map((g: { name: string }) => g.name) || [];
                    if (a.scenario === 'explore') return a.roles?.slice(0, 5).map((r: { title: string }) => r.title) || [];
                    return [];
                  })()}
                  analysisId={shareIdFromHash() || undefined}
                />
              )}

              <div className="text-center">
                <button
                  onClick={() => setScreen(isAuthenticated ? 'welcome' : 'public', true)}
                  className="btn-secondary text-sm"
                >
                  <Home className="h-4 w-4" /> На главную
                </button>
              </div>
            </div>
          </main>
        </div>
      );
    }

    if (
      !isAuthenticated
      && screen !== 'public'
      && screen !== 'demo'
      && screen !== 'quickstart'
      && screen !== 'soft-gate'
      && screen !== 'login'
      && screen !== 'register'
      && screen !== 'confirm'
      && screen !== 'result'
      && screen !== 'hr-landing'
    ) {
      return (
        <PublicLanding
          onTryInstant={() => setScreen('quickstart')}
          onWatchDemo={() => setScreen('demo')}
          onLogin={() => setScreen('login')}
          onRegister={() => setScreen('register')}
          onTeams={() => setScreen('hr-landing')}
        />
      );
    }

    switch (screen) {
      case 'public':
        return (
          <PublicLanding
            onTryInstant={() => setScreen('quickstart')}
            onWatchDemo={() => setScreen('demo')}
            onLogin={() => setScreen('login')}
            onRegister={() => setScreen('register')}
            onTeams={() => setScreen('hr-landing')}
          />
        );
      case 'demo':
        return (
          <div className="min-h-screen bg-(--color-surface)">
            <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
              <NavBar />
              <div className="card space-y-3">
                <h1 className="text-2xl font-semibold text-(--color-text-primary)">Демо-режим</h1>
                <p className="text-sm text-(--color-text-secondary)">
                  За 60 секунд вы получите персональный career snapshot: match%, ключевые gap-навыки и
                  следующий шаг развития.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button className="btn-primary" onClick={() => setScreen('quickstart')}>
                    Запустить на своих данных
                  </button>
                  <button className="btn-secondary" onClick={() => setScreen('public')}>
                    Назад
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'quickstart':
        return (
          <GoalSetup
            state={state}
            onChange={update}
            onNext={() => setScreen('skills')}
            onBack={() => setScreen('public')}
          />
        );
      case 'soft-gate':
        return (
          <div className="min-h-screen bg-(--color-surface)">
            <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
              <NavBar />
              <div className="card space-y-3">
                <h1 className="text-2xl font-semibold text-(--color-text-primary)">
                  Сохраните результат и продолжайте
                </h1>
                <p className="text-sm text-(--color-text-secondary)">
                  Мы уже показали бесплатный snapshot. Создайте аккаунт, чтобы сохранить историю,
                  открыть полный план и трекинг прогресса.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setPendingAuthScreen('dashboard');
                      setScreen('register');
                    }}
                  >
                    Создать аккаунт
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setPendingAuthScreen('dashboard');
                      setScreen('login');
                    }}
                  >
                    Войти
                  </button>
                  <button className="btn-secondary" onClick={() => setScreen('quickstart')}>
                    Продолжить без сохранения
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'login':
        return (
          <Auth
            initialMode="login"
            onSuccess={() => {
              setScreen(pendingAuthScreen || 'welcome', true);
              setPendingAuthScreen(null);
            }}
            onSkip={() => setScreen('quickstart')}
            onBackToPublic={() => setScreen('public')}
          />
        );
      case 'register':
        return (
          <Auth
            initialMode="register"
            onSuccess={() => {
              setScreen(pendingAuthScreen || 'onboarding', true);
              setPendingAuthScreen(null);
            }}
            onSkip={() => setScreen('quickstart')}
            onBackToPublic={() => setScreen('public')}
          />
        );
      case 'welcome':
        return (
          <ProtectedRoute>
            <GoalSelection
              onSelect={(scenario) => {
                update({ scenario: scenario as Scenario });
                setScreen('goal');
              }}
              onOpenDashboard={() => setScreen('dashboard')}
              onOpenOnboarding={() => setScreen('onboarding')}
              recommendedPainPoint={state.onboardingPainPoint || null}
            />
          </ProtectedRoute>
        );
      case 'onboarding':
        return (
          <ProtectedRoute>
            <OnboardingQuiz
              onComplete={async (answers) => {
                update({
                  scenario: answers.recommendedScenario,
                  developmentHoursPerWeek: answers.developmentHoursPerWeek,
                  onboardingPainPoint: answers.painPoint,
                });
                await refreshMe();
                setScreen('welcome', true);
              }}
            />
          </ProtectedRoute>
        );
      case 'dashboard':
        return (
          <ProtectedRoute>
            <Dashboard
              onBack={() => setScreen('welcome')}
              onStartNew={() => setScreen('goal')}
              onOpenAnalysis={openAnalysisFromHistory}
              onOpenOnboarding={() => setScreen('onboarding')}
            />
          </ProtectedRoute>
        );
      case 'goal':
        if (!isAuthenticated) {
          return (
            <GoalSetup
              state={state}
              onChange={update}
              onNext={() => setScreen('skills')}
              onBack={() => setScreen('public')}
            />
          );
        }
        return (
          <ProtectedRoute>
            <GoalSetup
              state={state}
              onChange={update}
              onNext={() => setScreen('skills')}
              onBack={() => setScreen('welcome')}
            />
          </ProtectedRoute>
        );
      case 'skills':
        if (!isAuthenticated) {
          return (
            <Skills
              state={state}
              onChange={update}
              onNext={() => setScreen('confirm')}
              onBack={() => setScreen('goal')}
            />
          );
        }
        return (
          <ProtectedRoute>
            <Skills
              state={state}
              onChange={update}
              onNext={() => setScreen('confirm')}
              onBack={() => setScreen('goal')}
            />
          </ProtectedRoute>
        );
      case 'confirm':
        if (!isAuthenticated) {
          return (
            <Confirmation
              state={state}
              isAuthenticated={false}
              onRequireAuth={() => setScreen('soft-gate')}
              onBack={() => setScreen('skills')}
              onResult={(p) => {
                setPlan(p);
                setScreen('result');
              }}
            />
          );
        }
        return (
          <ProtectedRoute>
            <Confirmation
              state={state}
              onBack={() => setScreen('skills')}
              onResult={(p) => {
                setPlan(p);
                setScreen('result');
              }}
            />
          </ProtectedRoute>
        );
      case 'result':
        if (!plan) {
          return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-(--color-surface)">
              <div className="max-w-md w-full text-center">
                <NavBar />
                <Alert variant="info" title="План ещё не создан">
                  Вернитесь к предыдущему шагу и сгенерируйте план.
                </Alert>
                <button
                  onClick={() => setScreen('confirm')}
                  className="btn-primary mt-6"
                >
                  Вернуться к подтверждению
                </button>
              </div>
            </div>
          );
        }
        if (!isAuthenticated) {
          return (
            <Result
              plan={plan}
              appState={state}
              isAuthenticated={false}
              onSoftGate={() => setScreen('soft-gate')}
              onReset={reset}
              onBackToSkills={() => setScreen('skills')}
              onOpenDashboard={() => setScreen('soft-gate')}
              onOpenShare={openShare}
              onSelectRole={(role: string) => {
                update({ targetProfession: role, scenario: 'Смена профессии' });
                setScreen('goal');
              }}
            />
          );
        }
        return (
          <ProtectedRoute>
            <Result
              plan={plan}
              appState={state}
              isAuthenticated
              onReset={reset}
              onBackToSkills={() => setScreen('skills')}
              onOpenDashboard={() => setScreen('dashboard')}
              onOpenShare={openShare}
              onSelectRole={(role: string) => {
                update({ targetProfession: role, scenario: 'Смена профессии' });
                setScreen('goal');
              }}
            />
          </ProtectedRoute>
        );
      case 'hr-landing':
        return (
          <HRLanding onBack={() => setScreen('public')} />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {renderScreen()}
      <ToastContainer />
    </>
  );
}
