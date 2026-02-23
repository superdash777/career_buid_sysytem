import { Check } from 'lucide-react';

interface Step {
  label: string;
  short: string;
}

const STEPS: Step[] = [
  { label: 'Старт', short: '1' },
  { label: 'Цель', short: '2' },
  { label: 'Навыки', short: '3' },
  { label: 'Проверка', short: '4' },
  { label: 'План', short: '5' },
];

interface Props {
  current: number; // 0-4
}

export default function Stepper({ current }: Props) {
  return (
    <nav className="flex items-center justify-center gap-1 sm:gap-2 py-4">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center gap-1 sm:gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`
                  flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold
                  transition-all duration-300
                  ${done ? 'bg-indigo-600 text-white' : ''}
                  ${active ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : ''}
                  ${!done && !active ? 'bg-slate-200 text-slate-500' : ''}
                `}
              >
                {done ? <Check className="h-4 w-4" /> : step.short}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  active ? 'text-indigo-700' : done ? 'text-indigo-600' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-6 sm:w-10 rounded transition-colors duration-300 ${
                  i < current ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
