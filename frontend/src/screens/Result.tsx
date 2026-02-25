import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  Copy, Download, RotateCcw, ArrowLeft, ChevronRight, Check,
  TrendingUp, FileText, CheckCircle2, Target,
} from 'lucide-react';
import Layout from '../components/Layout';
import type {
  PlanResponse, GrowthAnalysis, SwitchAnalysis, ExploreAnalysis,
} from '../types';

interface Props {
  plan: PlanResponse;
  onReset: () => void;
  onBackToSkills: () => void;
}

type Tab = 'visual' | 'markdown';

export default function Result({ plan, onReset, onBackToSkills }: Props) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [tab, setTab] = useState<Tab>(plan.analysis ? 'visual' : 'markdown');
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(plan.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([plan.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'career-plan.md';
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <Layout step={4} wide>
      <div className="space-y-6 slide-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-(--color-text-primary)">
              Ваш индивидуальный план развития
            </h1>
            <p className="text-(--color-text-muted) mt-1">Сохраните результат или изучите анализ.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleCopy} className="btn-secondary text-sm">
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Скопировано' : 'Скопировать'}
            </button>
            <button onClick={handleDownload} className="btn-secondary text-sm">
              {downloaded ? <Check className="h-4 w-4 text-emerald-500" /> : <Download className="h-4 w-4" />}
              {downloaded ? 'Сохранено' : 'Скачать .md'}
            </button>
            <button onClick={onReset} className="btn-secondary text-sm">
              <RotateCcw className="h-4 w-4" /> Заново
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        {plan.analysis && (
          <div className="flex gap-1 p-1 rounded-xl bg-(--color-surface-alt) border border-(--color-border) w-fit">
            <button
              onClick={() => setTab('visual')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'visual'
                  ? 'bg-(--color-accent) text-white shadow-sm'
                  : 'text-(--color-text-muted) hover:text-(--color-text-secondary)'
              }`}
            >
              Визуализация
            </button>
            <button
              onClick={() => setTab('markdown')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'markdown'
                  ? 'bg-(--color-accent) text-white shadow-sm'
                  : 'text-(--color-text-muted) hover:text-(--color-text-secondary)'
              }`}
            >
              Полный отчёт
            </button>
          </div>
        )}

        {/* Content */}
        {tab === 'visual' && plan.analysis ? (
          <div className="fade-in">
            {plan.analysis.scenario === 'growth' && <GrowthView data={plan.analysis} />}
            {plan.analysis.scenario === 'switch' && <SwitchView data={plan.analysis} />}
            {plan.analysis.scenario === 'explore' && <ExploreView data={plan.analysis} />}
          </div>
        ) : (
          <div className="card fade-in" ref={contentRef}>
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{plan.markdown}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="card bg-gradient-to-br from-(--color-accent-light) to-(--color-surface-alt) border-(--color-accent)/10">
          <h3 className="text-lg font-semibold text-(--color-text-primary) mb-2">Следующий шаг</h3>
          <p className="text-(--color-text-secondary) mb-4">
            Выберите одно действие из плана и запланируйте его на эту неделю.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={onBackToSkills} className="btn-secondary text-sm">
              <ArrowLeft className="h-4 w-4" /> Уточнить навыки
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}


// ======================== GROWTH ========================

function GrowthView({ data }: { data: GrowthAnalysis }) {
  const radarMax = Math.max(...data.radar_data.map(d => d.target), 5);
  const radarForChart = data.radar_data.map(d => ({
    subject: d.param,
    current: d.current,
    target: d.target,
  }));

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">План роста</span>
              <h2 className="text-xl font-bold text-(--color-text-primary)">
                {data.current_grade} <span className="text-(--color-text-muted) mx-1">→</span> {data.target_grade}
              </h2>
            </div>
          </div>
          <div className="text-right px-5 py-3 rounded-xl bg-(--color-accent-light)">
            <div className="text-xs text-(--color-text-muted) font-medium">Совпадение</div>
            <div className="text-2xl font-bold text-(--color-accent)">{data.match_percent}%</div>
          </div>
        </div>
      </div>

      {/* Radar chart + priority gaps */}
      {radarForChart.length > 2 && (
        <div className="card">
          <h3 className="font-semibold text-(--color-text-primary) mb-4">Параметры атласа</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarForChart}>
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, radarMax]} tick={false} axisLine={false} />
                  <Radar name="Текущий" dataKey="current" stroke="#818cf8" fill="#818cf8" fillOpacity={0.5} />
                  <Radar name="Цель" dataKey="target" stroke="#34d399" fill="#34d399" fillOpacity={0.15} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-(--color-text-muted) uppercase tracking-wide mb-3">Зоны развития</p>
              {data.radar_data.filter(d => d.target > d.current).map((d, i) => (
                <div key={i} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="text-(--color-text-primary)">{d.param}</span>
                    <span className="text-amber-600">{d.current_label} → {d.target_label}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-amber-200 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(d.current / d.target) * 100}%` }} />
                  </div>
                </div>
              ))}
              {data.radar_data.filter(d => d.current >= d.target).length > 0 && (
                <p className="text-xs text-emerald-600 mt-2">
                  {data.radar_data.filter(d => d.current >= d.target).map(d => d.param).join(', ')} — соответствуют цели
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Skill gaps */}
      {data.skill_gaps.length > 0 && <SkillGapsSection gaps={data.skill_gaps} />}

      {/* Strong skills */}
      {data.skill_strong.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-(--color-text-primary) mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Сильные стороны
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.skill_strong.map(s => (
              <span key={s.name} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium border border-emerald-500/20">
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ======================== SWITCH ========================

function SwitchView({ data }: { data: SwitchAnalysis }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 text-center sm:text-left">
            <span className="text-xs font-bold text-(--color-text-muted) uppercase">Из профессии</span>
            <div className="font-semibold text-(--color-text-primary)">{data.from_role}</div>
          </div>
          <ChevronRight className="h-5 w-5 text-(--color-text-muted) hidden sm:block" />
          <div className="flex-1 text-center sm:text-left">
            <span className="text-xs font-bold text-(--color-text-muted) uppercase">В профессию</span>
            <div className="font-semibold text-purple-600">{data.to_role}</div>
          </div>
          <div className="px-5 py-3 rounded-xl bg-purple-500/10 text-center">
            <div className="text-xs text-purple-600 font-bold uppercase">Совместимость</div>
            <div className="text-2xl font-bold text-purple-700">{data.match_percent}%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Transferable */}
        <div className="card">
          <h3 className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400 mb-3">
            <CheckCircle2 className="h-5 w-5" /> Переносимые навыки
          </h3>
          <p className="text-sm text-(--color-text-muted) mb-3">Актуальны для новой роли.</p>
          <div className="flex flex-wrap gap-2">
            {data.transferable.map(s => (
              <span key={s.name} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 rounded-lg text-sm font-medium border border-emerald-500/20">
                {s.name}
              </span>
            ))}
          </div>
        </div>

        {/* Gaps */}
        <div className="card">
          <h3 className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400 mb-3">
            <Target className="h-5 w-5" /> Зона роста
          </h3>
          <p className="text-sm text-(--color-text-muted) mb-3">Навыки для освоения.</p>
          <div className="flex flex-wrap gap-2">
            {data.gaps.map(g => (
              <span key={g.name} className="px-3 py-1.5 bg-amber-500/10 text-amber-800 dark:text-amber-300 rounded-lg text-sm font-medium border border-amber-500/20">
                {g.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Gap details */}
      {data.gaps.filter(g => g.description || g.tasks).length > 0 && (
        <SkillGapsSection gaps={data.gaps.map(g => ({ ...g, current: 0, required: 2, delta: 2 }))} />
      )}

      {/* Tracks */}
      {data.suggested_tracks.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-(--color-text-primary) mb-3">Рекомендуемые треки</h3>
          <div className="space-y-2">
            {data.suggested_tracks.map((t, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-(--color-surface-alt) border border-(--color-border)">
                <div className="h-6 w-6 rounded-full bg-purple-500/10 flex items-center justify-center text-xs font-bold text-purple-600 shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <span className="text-sm text-(--color-text-secondary)">{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ======================== EXPLORE ========================

function ExploreView({ data }: { data: ExploreAnalysis }) {
  const categoryLabel: Record<string, string> = {
    closest: 'Ближайшие',
    adjacent: 'Смежные',
    far: 'Дальние',
  };
  const categoryColor: Record<string, string> = {
    closest: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    adjacent: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    far: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.roles.map((role, idx) => (
          <RoleCard key={idx} role={role} categoryLabel={categoryLabel} categoryColor={categoryColor} />
        ))}
      </div>
    </div>
  );
}

function RoleCard({ role, categoryLabel, categoryColor }: {
  role: ExploreAnalysis['roles'][0];
  categoryLabel: Record<string, string>;
  categoryColor: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const matchColor = role.match > 20 ? 'text-emerald-600' : role.match > 10 ? 'text-amber-600' : 'text-(--color-text-muted)';

  return (
    <div
      className="card hover:shadow-md transition-all cursor-pointer"
      onClick={() => setOpen(!open)}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-(--color-text-primary) text-lg">{role.title}</h3>
        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${categoryColor[role.category] || ''}`}>
          {role.match}%
        </span>
      </div>

      <span className={`text-xs font-medium ${matchColor}`}>
        {categoryLabel[role.category] || role.category}
      </span>

      {role.missing.length > 0 && (
        <div className="mt-3">
          <span className="text-xs font-semibold text-(--color-text-muted) uppercase">Не хватает:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {role.missing.map(m => (
              <span key={m} className="text-xs px-2 py-1 bg-(--color-surface-alt) text-(--color-text-secondary) rounded border border-(--color-border)">{m}</span>
            ))}
          </div>
        </div>
      )}

      {open && role.reasons.length > 0 && (
        <div className="mt-4 pt-3 border-t border-(--color-border) fade-in">
          <p className="text-xs font-semibold text-(--color-text-muted) uppercase mb-2">Почему подходит:</p>
          <ul className="space-y-1">
            {role.reasons.map((r, i) => (
              <li key={i} className="text-sm text-(--color-text-secondary) flex items-start gap-2">
                <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-(--color-accent)" /> {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


// ======================== SHARED ========================

function SkillGapsSection({ gaps }: { gaps: Array<{ name: string; description?: string; tasks?: string; delta?: number; level_key?: string }> }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const withDetails = gaps.filter(g => g.description || g.tasks);
  if (withDetails.length === 0) return null;

  return (
    <div className="card">
      <h3 className="font-semibold text-(--color-text-primary) mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-(--color-accent)" /> Навыки: описание и задачи на развитие
      </h3>
      <div className="space-y-2">
        {withDetails.map((g, i) => (
          <div key={g.name} className="rounded-xl border border-(--color-border) overflow-hidden">
            <button
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-(--color-surface-alt) transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-(--color-text-primary)">{g.name}</span>
                {g.level_key && (
                  <span className="text-xs px-2 py-0.5 rounded bg-(--color-accent-light) text-(--color-accent) font-medium">
                    {g.level_key}
                  </span>
                )}
              </div>
              <ChevronRight className={`h-4 w-4 text-(--color-text-muted) transition-transform ${expandedIdx === i ? 'rotate-90' : ''}`} />
            </button>
            {expandedIdx === i && (
              <div className="px-4 pb-4 fade-in space-y-3">
                {g.description && (
                  <div className="p-3 rounded-lg bg-(--color-accent-light)/50 border-l-3 border-(--color-accent)">
                    <p className="text-xs font-bold text-(--color-text-muted) uppercase mb-1">Описание уровня</p>
                    <p className="text-sm text-(--color-text-secondary) leading-relaxed">{g.description}</p>
                  </div>
                )}
                {g.tasks && (
                  <div className="p-3 rounded-lg bg-emerald-500/5 border-l-3 border-emerald-500">
                    <p className="text-xs font-bold text-(--color-text-muted) uppercase mb-1">Задачи на развитие</p>
                    <p className="text-sm text-(--color-text-secondary) leading-relaxed whitespace-pre-line">{g.tasks}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
