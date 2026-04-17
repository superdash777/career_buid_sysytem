import { useState, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, Check, ChevronRight } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/ui/Button';
import MonoLabel from '../components/ui/MonoLabel';
import ProgressLoader from '../components/ProgressLoader';
import { buildFocusedPlan, ApiError } from '../api/client';
import type { FocusedPlan } from '../types';

// --------------- Types ---------------

interface TransferableSkill {
  name: string;
  levelKey: string;
  transferContext: string;
  transferDetail: string;
}

interface SwitchSkillGap {
  name: string;
  current: number;
  required: number;
  delta: number;
  levelKey: string;
  gapType: 'new' | 'deepen';
}

export interface SwitchPageProps {
  fromProfession: string;
  fromGrade: string;
  toProfession: string;
  toGrade: string;
  matchPercent: number;
  grade: string;
  scenario: string;
  transferableSkills: TransferableSkill[];
  skillGaps: SwitchSkillGap[];
  onBack: () => void;
  onGoToDashboard: () => void;
}

// --------------- Sub-components ---------------

function TransferableSkillCard({
  skill,
  isExpanded,
  onToggle,
}: {
  skill: TransferableSkill;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="cursor-pointer rounded-xl border border-[#9FE1CB] bg-[#E1F5EE] p-3 transition-all duration-200 hover:bg-[#c8edd9] hover:border-[#5DCAA5]"
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1D9E75] mt-0.5">
          <Check className="h-3 w-3 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-[#04342C]">{skill.name}</span>
            <ChevronRight
              className={`h-3.5 w-3.5 shrink-0 text-[#1D9E75] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            />
          </div>
          <p className="text-[11px] leading-relaxed text-[#085041] mt-0.5">{skill.transferContext}</p>
          <span className="inline-flex items-center gap-1 mt-1.5 rounded-full bg-[rgba(29,158,117,.12)] px-2 py-0.5 text-[10px] font-medium text-[#1D9E75]">
            {skill.levelKey} ✓
          </span>

          {isExpanded && (
            <div className="mt-3 rounded-lg bg-[rgba(255,255,255,.6)] p-2.5 fade-in">
              <p className="text-[11px] leading-[1.65] text-[#085041]">{skill.transferDetail}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GapChip({ name, gapType }: { name: string; gapType: 'new' | 'deepen' }) {
  const isNew = gapType === 'new';
  const chipStyle = isNew
    ? 'bg-[#FCEBEB] text-[#A32D2D]'
    : 'bg-[#FAEEDA] text-[#BA7517]';
  const badgeStyle = isNew
    ? 'bg-[rgba(162,45,45,.15)] text-[#A32D2D]'
    : 'bg-[rgba(186,117,23,.15)] text-[#BA7517]';
  const badgeText = isNew ? 'Новый' : 'Углубить';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${chipStyle}`}>
      {name}
      <span className={`rounded-full px-1.5 py-px text-[9px] font-semibold ${badgeStyle}`}>
        {badgeText}
      </span>
    </span>
  );
}

function FocusedPlanSection({ plan }: { plan: FocusedPlan }) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="border-t border-[var(--line)] pt-5 mt-5 space-y-4 fade-in">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
        План перехода
      </p>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-[var(--shadow-soft)]">
        <MonoLabel>70%</MonoLabel>
        <h3 className="mt-3 mb-4 font-semibold text-[var(--ink)]">Задачи на развитие</h3>
        <div className="space-y-4">
          {plan.tasks.map((t) => (
            <div key={t.skill}>
              <p className="text-sm font-semibold text-[var(--blue-deep)] mb-2">{t.skill}</p>
              <ul className="space-y-2">
                {t.items.map((item, j) => {
                  const itemId = `${t.skill}::${j}`;
                  const done = checkedItems.has(itemId);
                  return (
                    <li key={itemId} className="flex items-start gap-3">
                      <button
                        onClick={() => toggleCheck(itemId)}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          done
                            ? 'border-[var(--blue-deep)] bg-[var(--blue-deep)]'
                            : 'border-[var(--line)] hover:border-[var(--blue-deep)]'
                        }`}
                      >
                        {done && <Check className="h-3.5 w-3.5 text-white" />}
                      </button>
                      <span className={`text-sm leading-relaxed ${done ? 'text-[var(--muted)] line-through' : 'text-[var(--ink)]'}`}>
                        {item}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-[var(--shadow-soft)]">
        <MonoLabel>20%</MonoLabel>
        <h3 className="mt-3 mb-4 font-semibold text-[var(--ink)]">Развитие через общение</h3>
        <ul className="space-y-2">
          {plan.communication.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[var(--ink)]">
              <span className="mt-0.5 shrink-0 text-[var(--muted)]">—</span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-[var(--shadow-soft)]">
        <MonoLabel>10%</MonoLabel>
        <h3 className="mt-3 mb-4 font-semibold text-[var(--ink)]">Книги и курсы</h3>
        <ul className="space-y-2">
          {plan.learning.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[var(--ink)]">
              <span className="mt-0.5 shrink-0 text-[var(--muted)]">—</span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// --------------- Main Component ---------------

export default function SwitchPage({
  fromProfession,
  fromGrade,
  toProfession,
  toGrade,
  matchPercent,
  grade,
  scenario,
  transferableSkills,
  skillGaps,
  onBack,
  onGoToDashboard,
}: SwitchPageProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [focusedPlan, setFocusedPlan] = useState<FocusedPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState('');

  const toggleExpanded = (name: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const transferCount = transferableSkills.length;

  const newSkills = useMemo(
    () => skillGaps.filter(s => s.gapType === 'new'),
    [skillGaps]
  );

  const deepenSkills = useMemo(
    () => skillGaps.filter(s => s.gapType === 'deepen'),
    [skillGaps]
  );

  const handleBuildPlan = async () => {
    if (planLoading) return;
    setPlanLoading(true);
    setPlanError('');
    try {
      const gapSkillNames = skillGaps.map(s => s.name);
      const result = await buildFocusedPlan({
        profession: fromProfession,
        grade,
        scenario,
        target_profession: toProfession,
        selected_skills: gapSkillNames,
      });
      setFocusedPlan(result);
    } catch (err) {
      setPlanError(err instanceof ApiError ? err.message : 'Не удалось сформировать план');
    } finally {
      setPlanLoading(false);
    }
  };

  return (
    <Layout step={4} wide>
      <div className="space-y-0 slide-up">
        {/* ---- Topbar row ---- */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--blue-deep)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </button>
          <MonoLabel>Результат · Switch</MonoLabel>
        </div>

        {/* ---- Hero ---- */}
        <section className="pb-6 border-b border-[var(--line)]">
          {/* Scenario tag */}
          <span className="inline-block rounded-full bg-[#E1F5EE] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1D9E75] mb-4">
            ⇄ Switch — смена профессии
          </span>

          {/* Bridge card */}
          <div className="rounded-2xl border border-[var(--line)] overflow-hidden mb-5">
            <div className="grid grid-cols-3">
              {/* From */}
              <div className="bg-[var(--bg)] p-4 flex flex-col justify-center">
                <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] mb-1">Сейчас</span>
                <p className="text-[17px] font-bold text-[var(--ink)] leading-tight truncate" style={{ fontFamily: 'var(--font-display)' }}>
                  {fromProfession}
                </p>
                <p className="text-[11px] text-[var(--muted)] mt-1 truncate">{fromGrade}</p>
                <span className="inline-flex self-start items-center rounded-full border border-[var(--line)] bg-[var(--paper)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--muted)] mt-2">
                  {fromGrade}
                </span>
              </div>

              {/* Middle */}
              <div className="bg-[var(--bg)] border-x border-[var(--line)] p-4 flex flex-col items-center justify-center gap-1.5">
                <span className="text-[28px] font-bold text-[#534AB7]" style={{ fontFamily: 'var(--font-display)' }}>
                  {matchPercent}%
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Совместимость</span>
                <ArrowRight className="h-[18px] w-[18px] text-[#534AB7]" />
              </div>

              {/* To */}
              <div className="bg-[#EEEDFE] p-4 flex flex-col justify-center">
                <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#534AB7]/60 mb-1">Цель</span>
                <p className="text-[17px] font-bold text-[#26215C] leading-tight truncate" style={{ fontFamily: 'var(--font-display)' }}>
                  {toProfession}
                </p>
                <p className="text-[11px] text-[#534AB7]/75 mt-1 truncate">Целевой грейд · {toGrade}</p>
                <span className="inline-flex self-start items-center rounded-full bg-[rgba(83,74,183,.12)] px-2.5 py-0.5 text-[10px] font-medium text-[#534AB7] mt-2">
                  {toGrade}
                </span>
              </div>
            </div>
          </div>

          {/* Stat chips */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-[#9FE1CB] bg-[#E1F5EE] p-3 text-center">
              <p className="text-xl font-bold text-[#1D9E75]">{transferCount}</p>
              <p className="mt-0.5 text-[10px] text-[#085041]/70">Навыков переносятся</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 text-center shadow-[var(--shadow-soft)]">
              <p className="text-xl font-bold text-[#A32D2D]">{newSkills.length}</p>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">Освоить с нуля</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 text-center shadow-[var(--shadow-soft)]">
              <p className="text-xl font-bold text-[#534AB7]">{deepenSkills.length}</p>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">Углубить</p>
            </div>
          </div>
        </section>

        {/* ---- Insight callout ---- */}
        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 py-3 my-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EEEDFE]">
            <Sparkles className="h-3.5 w-3.5 text-[#534AB7]" />
          </div>
          <p className="text-[11px] leading-[1.65] text-[var(--muted)]">
            <strong className="text-[var(--ink)]">{matchPercent}% вашего опыта работает на новую роль.</strong>{' '}
            Ниже — навыки, которые уже есть и напрямую применяются в {toProfession}. Это ваша точка опоры при переходе.
          </p>
        </div>

        {/* ---- Transferable skills ---- */}
        <section className="border-t border-[var(--line)] pt-5">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Что работает на вас
            </p>
            <span className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--bg)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
              {transferCount} навыков
            </span>
          </div>

          <div className="flex flex-col gap-[7px]">
            {transferableSkills.map(s => (
              <TransferableSkillCard
                key={s.name}
                skill={s}
                isExpanded={expandedIds.has(s.name)}
                onToggle={() => toggleExpanded(s.name)}
              />
            ))}
          </div>
        </section>

        {/* ---- Gap skills ---- */}
        <section className="border-t border-[var(--line)] pt-5 mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] mb-4">
            Рекомендуем эти навыки
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* New skills (delta >= 2) */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block h-2 w-2 rounded-full bg-[#E24B4A]" />
                <span className="text-[10px] font-medium text-[var(--muted)]">Освоить с нуля (δ ≥ 2)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {newSkills.map(s => (
                  <GapChip key={s.name} name={s.name} gapType="new" />
                ))}
                {newSkills.length === 0 && (
                  <span className="text-[11px] text-[var(--muted)]">—</span>
                )}
              </div>
            </div>

            {/* Deepen skills (delta = 1) */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block h-2 w-2 rounded-full bg-[#EF9F27]" />
                <span className="text-[10px] font-medium text-[var(--muted)]">Углубить (δ = 1)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {deepenSkills.map(s => (
                  <GapChip key={s.name} name={s.name} gapType="deepen" />
                ))}
                {deepenSkills.length === 0 && (
                  <span className="text-[11px] text-[var(--muted)]">—</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ---- Plan loading / error ---- */}
        {planLoading && (
          <div className="mt-5">
            <ProgressLoader text="Формируем план перехода..." subtext="Несколько секунд" durationMs={20000} />
          </div>
        )}

        {planError && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-sm text-red-600">{planError}</p>
          </div>
        )}

        {/* ---- Generated plan ---- */}
        {focusedPlan && <FocusedPlanSection plan={focusedPlan} />}

        {/* ---- CTA bar ---- */}
        <section className="border-t border-[var(--line)] pt-5 mt-5 flex flex-col sm:flex-row gap-2">
          {!focusedPlan ? (
            <Button
              className="flex-1"
              onClick={handleBuildPlan}
              disabled={planLoading}
            >
              {planLoading ? (
                <><Sparkles className="h-4 w-4 animate-pulse" /> Генерируем...</>
              ) : (
                <>Составить план перехода <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          ) : (
            <Button
              className="flex-1"
              onClick={onGoToDashboard}
            >
              Отслеживать прогресс <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </section>
      </div>
    </Layout>
  );
}
