import { useState, useEffect, useCallback } from 'react';
import Welcome from './screens/Welcome';
import Dashboard from './screens/Dashboard';
import GoalSetup from './screens/GoalSetup';
import Skills from './screens/Skills';
import Confirmation from './screens/Confirmation';
import Result from './screens/Result';
import Login from './screens/Login';
import Register from './screens/Register';
import Alert from './components/Alert';
import NavBar from './components/NavBar';
import ToastContainer from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './auth/AuthContext';
import { healthCheck } from './api/client';
import type { AppState, PlanResponse, AnalysisRecord, Grade, Scenario, Skill } from './types';
import { GRADES, INITIAL_STATE } from './types';

type Screen = 'login' | 'register' | 'welcome' | 'dashboard' | 'goal' | 'skills' | 'confirm' | 'result';

const SCREEN_ORDER: Screen[] = ['login', 'register', 'welcome', 'dashboard', 'goal', 'skills', 'confirm', 'result'];

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
  if (SCREEN_ORDER.includes(hash)) return hash;
  return 'login';
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

export default function App() {
  const { isAuthenticated } = useAuth();
  const [screen, setScreenRaw] = useState<Screen>(screenFromHash);
  const [state, setStateRaw] = useState<AppState>(loadSavedState);
  const [plan, setPlanRaw] = useState<PlanResponse | null>(loadSavedPlan);
  const [serviceDown, setServiceDown] = useState(false);

  const setScreen = useCallback((s: Screen, replace = false) => {
    setScreenRaw(s);
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({ screen: s }, '', `#${s}`);
  }, []);

  useEffect(() => {
    if (isAuthenticated && (screen === 'login' || screen === 'register')) {
      setScreen('welcome', true);
      return;
    }
    if (!isAuthenticated && screen !== 'login' && screen !== 'register') {
      setScreen('login', true);
    }
  }, [isAuthenticated, screen, setScreen]);

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
    setScreen(isAuthenticated ? 'welcome' : 'login', true);
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
    if (!isAuthenticated && screen !== 'login' && screen !== 'register') {
      return (
        <Login
          onSuccess={() => setScreen('welcome', true)}
          onGoRegister={() => setScreen('register')}
        />
      );
    }

    switch (screen) {
      case 'login':
        return (
          <Login
            onSuccess={() => setScreen('welcome', true)}
            onGoRegister={() => setScreen('register')}
          />
        );
      case 'register':
        return (
          <Register
            onSuccess={() => setScreen('welcome', true)}
            onGoLogin={() => setScreen('login')}
          />
        );
      case 'welcome':
        return (
          <ProtectedRoute>
            <Welcome
              onStart={() => setScreen('goal')}
              onOpenDashboard={() => setScreen('dashboard')}
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
            />
          </ProtectedRoute>
        );
      case 'goal':
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
        return (
          <ProtectedRoute>
            {plan ? (
              <Result
                plan={plan}
                appState={state}
                onReset={reset}
                onBackToSkills={() => setScreen('skills')}
                onOpenDashboard={() => setScreen('dashboard')}
              />
            ) : (
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
            )}
          </ProtectedRoute>
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
