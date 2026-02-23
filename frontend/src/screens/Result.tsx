import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Download, RotateCcw, ArrowLeft, ChevronRight, Check, List, X } from 'lucide-react';
import Layout from '../components/Layout';
import FeedbackRating from '../components/FeedbackRating';
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
  const [downloaded, setDownloaded] = useState(false);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const headings = el.querySelectorAll('h2, h3');
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
    });
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
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const scrollToHeading = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileTocOpen(false);
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
      <div className="space-y-8 slide-up">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-(--color-text-primary) mb-2">
            Ваш индивидуальный план развития
          </h1>
          <p className="text-(--color-text-secondary)">
            Сохраните результат и выберите первый шаг.
          </p>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap gap-2">
          <button onClick={handleCopy} className="btn-secondary text-sm">
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Скопирован' : 'Скопировать'}
          </button>
          <button onClick={handleDownload} className="btn-secondary text-sm">
            {downloaded ? <Check className="h-4 w-4 text-emerald-500" /> : <Download className="h-4 w-4" />}
            {downloaded ? 'Сохранён' : 'Скачать .md'}
          </button>
          <button onClick={onReset} className="btn-secondary text-sm">
            <RotateCcw className="h-4 w-4" /> Заново
          </button>
          {/* Mobile TOC trigger */}
          {toc.length > 2 && (
            <button
              onClick={() => setMobileTocOpen(true)}
              className="btn-secondary text-sm lg:hidden"
            >
              <List className="h-4 w-4" /> Оглавление
            </button>
          )}
        </div>

        {/* Feedback */}
        <FeedbackRating />

        {/* Mobile TOC overlay */}
        {mobileTocOpen && toc.length > 2 && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileTocOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] rounded-t-2xl bg-(--color-surface-raised) border-t border-(--color-border) overflow-y-auto slide-up">
              <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-(--color-border) bg-(--color-surface-raised)">
                <p className="text-sm font-semibold text-(--color-text-primary)">Оглавление</p>
                <button
                  onClick={() => setMobileTocOpen(false)}
                  className="p-1 text-(--color-text-muted) hover:text-(--color-text-secondary)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="p-4 space-y-1">
                {toc.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToHeading(item.id)}
                    className={`block w-full text-left text-sm py-2 px-3 rounded-lg truncate transition-colors hover:bg-(--color-accent-light) hover:text-(--color-accent) ${
                      item.level === 3
                        ? 'pl-7 text-(--color-text-muted)'
                        : 'text-(--color-text-secondary) font-medium'
                    }`}
                  >
                    {item.text}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Role titles */}
        {plan.role_titles && plan.role_titles.length > 0 && (
          <div className="card">
            <p className="text-sm font-semibold text-(--color-text-primary) mb-3">
              Вам также могут подойти:
            </p>
            <div className="flex flex-wrap gap-2">
              {plan.role_titles.map((role) => (
                <span
                  key={role}
                  className="inline-block rounded-full bg-(--color-accent-light) px-4 py-1.5 text-sm font-medium text-(--color-accent)"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Markdown + Desktop TOC */}
        <div className="flex gap-8">
          <div className="card flex-1 min-w-0">
            <div ref={contentRef} className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{plan.markdown}</ReactMarkdown>
            </div>
          </div>

          {toc.length > 2 && (
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-32">
                <p className="text-xs font-semibold text-(--color-text-muted) uppercase tracking-wider mb-3">
                  Оглавление
                </p>
                <nav className="space-y-1">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToHeading(item.id);
                      }}
                      className={`block text-sm truncate transition-colors hover:text-(--color-accent) ${
                        item.level === 3 ? 'pl-4 text-(--color-text-muted)' : 'text-(--color-text-secondary) font-medium'
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

        {/* Next step */}
        <div className="card bg-gradient-to-br from-(--color-accent-light) to-(--color-surface-alt) border-(--color-accent)/10">
          <h3 className="text-lg font-semibold text-(--color-text-primary) mb-2">Следующий шаг</h3>
          <p className="text-(--color-text-secondary) mb-4">
            Выберите одно действие из плана и запланируйте его на эту неделю.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={scrollToFirstAction} className="btn-primary text-sm">
              Выбрать действие <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={onBackToSkills} className="btn-secondary text-sm">
              <ArrowLeft className="h-4 w-4" /> Уточнить навыки
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
