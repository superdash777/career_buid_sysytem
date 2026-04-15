import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Verdict } from '../types';

interface Props {
  verdict: Verdict;
  defaultOpen?: boolean;
}

const COLORS = {
  green: { header: 'bg-[#EAF3DE]', text: 'text-[#27500A]', icon: 'bg-[#C0DD97]', body: 'bg-[#F4F9EC]' },
  amber: { header: 'bg-[#FAEEDA]', text: 'text-[#633806]', icon: 'bg-[#FAC775]', body: 'bg-[#FDF6EC]' },
  red:   { header: 'bg-[#FCEBEB]', text: 'text-[#791F1F]', icon: 'bg-[#F7C1C1]', body: 'bg-[#FEF5F5]' },
};

export default function VerdictCard({ verdict, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const c = COLORS[verdict.color];

  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--line)]">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-5 py-4 ${c.header}`}
      >
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${c.icon} text-xs font-bold ${c.text}`}>
          AI
        </div>
        <span className={`flex-1 text-left text-sm font-semibold ${c.text}`}>{verdict.title}</span>
        <ChevronDown className={`h-4 w-4 ${c.text} transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`px-5 py-4 ${c.body}`}>
          <p className="text-sm leading-relaxed text-slate-600">{verdict.text}</p>
          {verdict.sources && verdict.sources.length > 0 && (
            <div className="mt-3 space-y-1">
              {verdict.sources.map((s, i) => (
                <p key={i} className="text-xs text-slate-400">{s}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
