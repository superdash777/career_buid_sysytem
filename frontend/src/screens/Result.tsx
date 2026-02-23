import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Download, RotateCcw, ArrowLeft, ChevronRight, Check } from 'lucide-react';
import Layout from '../components/Layout';
import type { PlanResponse } from '../types';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface Props {
  plan: PlanResponse;
  onReset: () => void;
  onBackToSkills: () => void;
}

export default function Result({ plan, onReset, onBackToSkills }: Props) {
  const [copied, setCopied] = useState(false);
  const [toc, setToc] = useState<TocItem[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;
    const headings = contentRef.current.querySelectorAll('h2, h3');
    const items: TocItem[] = [];
    headings.forEach((h, i) => {
      const id = `heading-${i}`;
      h.id = id;
      items.push({
        id,
        text: h.textContent || '',
        level: h.tagName === 'H2' ? 2 : 3,
      });
    });
    setToc(items);
  }, [plan.markdown]);

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
  };

  const scrollToFirstAction = () => {
    if (!contentRef.current) return;
    const lists = contentRef.current.querySelectorAll('ol li, ul li');
    if (lists.length > 0) {
      lists[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <Layout step={4} wide>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            Ваш план готов
          </h1>
          <p className="text-slate-500">
            Сохраните результат и выберите один шаг, который сделаете сегодня.
          </p>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap gap-2">
          <button onClick={handleCopy} className="btn-secondary text-sm">
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Скопировано' : 'Скопировать'}
          </button>
          <button onClick={handleDownload} className="btn-secondary text-sm">
            <Download className="h-4 w-4" /> Скачать .md
          </button>
          <button onClick={onReset} className="btn-secondary text-sm">
            <RotateCcw className="h-4 w-4" /> Собрать новый план
          </button>
        </div>

        {/* Role titles (for exploration scenario) */}
        {plan.role_titles && plan.role_titles.length > 0 && (
          <div className="card">
            <p className="text-sm font-semibold text-slate-700 mb-3">Подходящие роли</p>
            <div className="flex flex-wrap gap-2">
              {plan.role_titles.map((role) => (
                <span
                  key={role}
                  className="inline-block rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-medium text-indigo-700"
                >
                  {role}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Это направления, где ваш профиль ближе всего по навыкам.
            </p>
          </div>
        )}

        {/* Main content: markdown + TOC */}
        <div className="flex gap-8">
          {/* Markdown */}
          <div className="card flex-1 min-w-0">
            <div ref={contentRef} className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{plan.markdown}</ReactMarkdown>
            </div>
          </div>

          {/* TOC sidebar (desktop) */}
          {toc.length > 2 && (
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-24">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Оглавление
                </p>
                <nav className="space-y-1">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`block text-sm truncate transition-colors hover:text-indigo-600 ${
                        item.level === 3 ? 'pl-4 text-slate-400' : 'text-slate-600 font-medium'
                      }`}
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}
        </div>

        {/* Motivational block */}
        <div className="card bg-gradient-to-br from-indigo-50 to-slate-50 border-indigo-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Следующий шаг</h3>
          <p className="text-slate-600 mb-4">
            Выберите 1 действие из плана и поставьте его на эту неделю.
            Маленький шаг даёт самый быстрый прогресс.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={scrollToFirstAction} className="btn-primary text-sm">
              Выбрать действие недели <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={onBackToSkills} className="btn-secondary text-sm">
              <ArrowLeft className="h-4 w-4" /> Вернуться к навыкам
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
