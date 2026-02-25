import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface Stage {
  label: string;
  duration: number; // ms to stay on this stage before moving to next
}

interface Props {
  stages: Stage[];
  finalText?: string;
}

export default function ProgressLoader({ stages, finalText }: Props) {
  const [current, setCurrent] = useState(0);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    if (stages.length === 0) return;
    let mounted = true;
    let stageIdx = 0;
    let elapsed = 0;

    const tick = 80;
    const totalDuration = stages.reduce((s, st) => s + st.duration, 0);

    const interval = setInterval(() => {
      if (!mounted) return;
      elapsed += tick;

      const pct = Math.min((elapsed / totalDuration) * 92, 92);
      setBarWidth(pct);

      let acc = 0;
      for (let i = 0; i < stages.length; i++) {
        acc += stages[i].duration;
        if (elapsed < acc) { stageIdx = i; break; }
        if (i === stages.length - 1) stageIdx = i;
      }
      setCurrent(stageIdx);
    }, tick);

    return () => { mounted = false; clearInterval(interval); };
  }, [stages]);

  const stage = stages[current] || stages[stages.length - 1];

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 fade-in">
      {/* Circular pulse */}
      <div className="relative flex items-center justify-center">
        <div className="absolute h-16 w-16 rounded-full bg-(--color-accent)/10 animate-ping" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-(--color-accent)/15">
          <Loader2 className="h-7 w-7 animate-spin text-(--color-accent)" />
        </div>
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="text-base font-medium text-(--color-text-primary) mb-1">{stage?.label}</p>
        {finalText && (
          <p className="text-sm text-(--color-text-muted)">{finalText}</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-2 rounded-full bg-(--color-border) overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-(--color-accent) to-indigo-400 transition-all duration-300 ease-out"
            style={{ width: `${barWidth}%` }}
          />
        </div>

        {/* Stage dots */}
        <div className="flex justify-between mt-3">
          {stages.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${
                  i <= current
                    ? 'bg-(--color-accent) scale-110'
                    : 'bg-(--color-border)'
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors duration-300 max-w-16 text-center leading-tight ${
                  i <= current ? 'text-(--color-accent)' : 'text-(--color-text-muted)'
                }`}
              >
                {s.label.split(' ').slice(0, 2).join(' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
