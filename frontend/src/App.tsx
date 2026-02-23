import { useState, useEffect } from 'react';
import Welcome from './screens/Welcome';
import GoalSetup from './screens/GoalSetup';
import Skills from './screens/Skills';
import Confirmation from './screens/Confirmation';
import Result from './screens/Result';
import Alert from './components/Alert';
import { healthCheck } from './api/client';
import type { AppState, PlanResponse } from './types';
import { INITIAL_STATE } from './types';

type Screen = 'welcome' | 'goal' | 'skills' | 'confirm' | 'result';

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [serviceDown, setServiceDown] = useState(false);

  useEffect(() => {
    healthCheck().then((ok) => {
      if (!ok) setServiceDown(true);
    });
  }, []);

  const update = (patch: Partial<AppState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const reset = () => {
    setState(INITIAL_STATE);
    setPlan(null);
    setScreen('welcome');
  };

  if (serviceDown) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <Alert variant="warning" title="Сервис временно недоступен">
            Мы уже на старте — попробуйте обновить страницу через минуту.
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
      </div>
    );
  }

  switch (screen) {
    case 'welcome':
      return <Welcome onStart={() => setScreen('goal')} />;
    case 'goal':
      return (
        <GoalSetup
          state={state}
          onChange={update}
          onNext={() => setScreen('skills')}
          onBack={() => setScreen('welcome')}
        />
      );
    case 'skills':
      return (
        <Skills
          state={state}
          onChange={update}
          onNext={() => setScreen('confirm')}
          onBack={() => setScreen('goal')}
        />
      );
    case 'confirm':
      return (
        <Confirmation
          state={state}
          onBack={() => setScreen('skills')}
          onResult={(p) => {
            setPlan(p);
            setScreen('result');
          }}
        />
      );
    case 'result':
      return plan ? (
        <Result
          plan={plan}
          onReset={reset}
          onBackToSkills={() => setScreen('skills')}
        />
      ) : null;
    default:
      return null;
  }
}
