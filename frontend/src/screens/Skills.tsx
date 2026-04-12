import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { ArrowRight, ArrowLeft, Upload, Search, Plus, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import SkillCard from '../components/SkillCard';
import SkillConfidenceBadge from '../components/SkillConfidenceBadge';
import SkillAlternativeSelect from '../components/SkillAlternativeSelect';
import ProgressLoader from '../components/ProgressLoader';
import MiniProgress from '../components/MiniProgress';
import SoftOnboardingHint from '../components/SoftOnboardingHint';
import { showToast } from '../components/toastStore';
import { analyzeResume, suggestSkills, fetchSkillsForRole, fetchSkillsByCategoryForRole } from '../api/client';
import { ApiError } from '../api/client';
import type { AppState, Skill } from '../types';

interface Props {
  state: AppState;
  onChange: (patch: Partial<AppState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const RECOMMENDED_VISIBLE = 6;
type InputMode = 'resume' | 'manual';
interface SkillCategoryGroup {
  name: string;
  skills: string[];
}

function SkillQualityBar({ count }: { count: number }) {
  const pct = Math.min(count / 7, 1) * 100;
  const color =
    count === 0 ? 'bg-(--color-border)'
    : count < 3 ? 'bg-red-400'
    : count < 5 ? 'bg-amber-400'
    : 'bg-emerald-400';
  const label =
    count === 0 ? 'Добавьте навыки для точного плана'
    : count < 3 ? 'Маловато — добавьте ещё для точности'
    : count < 5 ? 'Хорошо, можно добавить ещё'
    : count < 7 ? 'Отлично!'
    : 'Превосходно!';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-(--color-text-muted)">{label}</span>
        <span className="text-(--color-text-muted) font-medium">{count} навык(ов)</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-(--color-border)/50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Skills({ state, onChange, onNext, onBack }: Props) {
  const [inputMode, setInputMode] = useState<InputMode>('resume');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState<{ title: string; text: string } | null>(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [roleSkills, setRoleSkills] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [newSkillNames, setNewSkillNames] = useState<Set<string>>(new Set());
  const [showAllRecommended, setShowAllRecommended] = useState(false);
  const [skillCategories, setSkillCategories] = useState<SkillCategoryGroup[]>([]);
  const suggestRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const roleAbortRef = useRef<AbortController | null>(null);
  const categoryAbortRef = useRef<AbortController | null>(null);

  const skills = state.skills;
  const setSkills = useCallback((s: Skill[]) => onChange({ skills: s }), [onChange]);

  const hasConfidenceMetadata = skills.some((s) => typeof s.confidence === 'number');

  useEffect(() => {
    if (state.profession) {
      roleAbortRef.current?.abort();
      roleAbortRef.current = new AbortController();
      fetchSkillsForRole(state.profession, roleAbortRef.current.signal)
        .then(setRoleSkills)
        .catch(() => {});

      categoryAbortRef.current?.abort();
      categoryAbortRef.current = new AbortController();
      fetchSkillsByCategoryForRole(state.profession, categoryAbortRef.current.signal)
        .then(setSkillCategories)
        .catch(() => setSkillCategories([]));
    }
    return () => {
      roleAbortRef.current?.abort();
      categoryAbortRef.current?.abort();
    };
  }, [state.profession]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear highlight from new skills after 3s
  useEffect(() => {
    if (newSkillNames.size === 0) return;
    const t = setTimeout(() => setNewSkillNames(new Set()), 3000);
    return () => clearTimeout(t);
  }, [newSkillNames]);

  const addSkill = useCallback(
    (name: string, level: number = 1) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (skills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return;
      setSkills([...skills, { name: trimmed, level }]);
      setNewSkillNames((prev) => new Set(prev).add(trimmed.toLowerCase()));
      setQuery('');
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIdx(-1);
    },
    [skills, setSkills],
  );

  const removeSkill = useCallback(
    (index: number) => {
      const removed = skills[index];
      const next = skills.filter((_, j) => j !== index);
      setSkills(next);
      showToast(`Навык «${removed.name}» удалён`, {
        label: 'Отменить',
        onClick: () => setSkills([...next.slice(0, index), removed, ...next.slice(index)]),
      });
    },
    [skills, setSkills],
  );

  const applyAlternative = useCallback(
    (index: number, altName: string) => {
      const current = skills[index];
      if (!current) return;
      const next = [...skills];

      // Если альтернатива уже есть в списке — не дублируем, только удаляем текущую запись.
      if (skills.some((s, i) => i !== index && s.name.toLowerCase() === altName.toLowerCase())) {
        next.splice(index, 1);
        setSkills(next);
        showToast(`Навык заменён на «${altName}» (дубликат объединён)`);
        return;
      }

      next[index] = {
        ...current,
        name: altName,
        confidence: 0.95,
        confidence_band: 'vector_llm',
      };
      setSkills(next);
      showToast(`Навык заменён на «${altName}»`);
    },
    [skills, setSkills],
  );

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setHighlightedIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    suggestAbortRef.current?.abort();
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        suggestAbortRef.current = new AbortController();
        suggestSkills(val, suggestAbortRef.current.signal)
          .then((s) => {
            setSuggestions(s);
            setShowSuggestions(s.length > 0);
          })
          .catch(() => {});
      }, 250);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        e.preventDefault();
        addSkill(query);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((h) => Math.max(h - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIdx >= 0 && suggestions[highlightedIdx]) {
        addSkill(suggestions[highlightedIdx]);
      } else if (query.trim()) {
        addSkill(query);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIdx(-1);
    }
  };

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setUploadError({ title: 'Неверный формат', text: 'Загрузите файл в формате PDF.' });
        return;
      }
      setUploading(true);
      setUploadError(null);
      setUploadMsg('');
      try {
        const result = await analyzeResume(file);
        if (result.skills.length === 0) {
          setUploadMsg('Не удалось найти навыки. Попробуйте другой файл или добавьте вручную.');
        } else {
          const newSkills = [...skills];
          const addedNames = new Set<string>();
          for (const s of result.skills) {
            if (!newSkills.some((x) => x.name.toLowerCase() === s.name.toLowerCase())) {
              newSkills.push(s);
              addedNames.add(s.name.toLowerCase());
            }
          }
          setSkills(newSkills);
          setNewSkillNames(addedNames);
          setUploadMsg(`Добавлено ${addedNames.size} из ${result.skills.length} найденных навыков`);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 400) {
            setUploadError({ title: 'Неверный формат', text: 'Загрузите файл в формате PDF.' });
          } else if (err.status === 503) {
            setUploadError({
              title: 'Автоматический разбор временно недоступен',
              text: 'Добавьте навыки вручную.',
            });
          } else {
            setUploadError({ title: 'Ошибка', text: 'Проверьте соединение и попробуйте ещё раз.' });
          }
        } else {
          setUploadError({ title: 'Ошибка', text: 'Проверьте соединение и попробуйте ещё раз.' });
        }
      } finally {
        setUploading(false);
      }
    },
    [skills, setSkills],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleNext = () => {
    if (skills.length === 0) {
      setValidationError('Добавьте хотя бы один навык, чтобы мы могли построить план.');
      return;
    }
    setValidationError('');
    onNext();
  };

  const existingNames = new Set(skills.map((s) => s.name.toLowerCase()));
  const filteredRoleSkills = roleSkills.filter((s) => !existingNames.has(s.toLowerCase()));
  const visibleRecommended = showAllRecommended
    ? filteredRoleSkills
    : filteredRoleSkills.slice(0, RECOMMENDED_VISIBLE);

  return (
    <Layout step={2}>
      <div className="space-y-8 slide-up">
        <div>
          <MiniProgress current={2} total={3} label="Навыки" />
          <h1 className="text-2xl sm:text-3xl font-bold text-(--color-text-primary) mt-2 mb-2">
            Опишите ваши навыки
          </h1>
          <p className="text-(--color-text-secondary)">
            Добавьте сильные стороны и зоны развития — это основа точного плана.
          </p>
        </div>

        <SoftOnboardingHint id="skills_intro">
          Это ключевой шаг — чем точнее данные, тем лучше план.
        </SoftOnboardingHint>

        {validationError && (
          <Alert variant="warning" onClose={() => setValidationError('')}>
            {validationError}
          </Alert>
        )}

        <div className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-(--color-text-primary) mb-1">Как добавить навыки</h2>
            <p className="text-sm text-(--color-text-muted)">
              Выберите удобный вариант: загрузка PDF или ручной выбор по категориям.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => setInputMode('resume')}
              className={`rounded-xl border p-3 text-left transition-colors ${
                inputMode === 'resume'
                  ? 'border-(--color-accent) bg-(--color-accent-light)'
                  : 'border-(--color-border) hover:border-(--color-accent)/40'
              }`}
            >
              <p className="font-medium text-(--color-text-primary)">Загрузить резюме (PDF)</p>
              <p className="text-xs text-(--color-text-muted) mt-1">Извлечём навыки автоматически</p>
            </button>
            <button
              onClick={() => setInputMode('manual')}
              className={`rounded-xl border p-3 text-left transition-colors ${
                inputMode === 'manual'
                  ? 'border-(--color-accent) bg-(--color-accent-light)'
                  : 'border-(--color-border) hover:border-(--color-accent)/40'
              }`}
            >
              <p className="font-medium text-(--color-text-primary)">Выбрать навыки вручную</p>
              <p className="text-xs text-(--color-text-muted) mt-1">Чипы навыков по категориям</p>
            </button>
          </div>
        </div>

        {/* Resume upload */}
        {inputMode === 'resume' && (
          <div className="card space-y-4 fade-in">
            <div>
              <h2 className="text-lg font-semibold text-(--color-text-primary) mb-1">Загрузите резюме</h2>
              <p className="text-sm text-(--color-text-muted)">PDF — мы извлечём навыки автоматически.</p>
            </div>

            {uploading ? (
              <ProgressLoader text="Извлекаем навыки из резюме…" subtext="Обычно это занимает до минуты" durationMs={40000} />
            ) : (
              <div
                {...getRootProps()}
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer ${
                  isDragActive
                    ? 'border-(--color-accent) bg-(--color-accent-light)'
                    : 'border-(--color-border) bg-(--color-surface-alt) hover:border-(--color-accent)/40 hover:bg-(--color-accent-light)/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 text-(--color-text-muted)" />
                <p className="text-sm text-(--color-text-secondary) text-center">
                  Перетащите PDF сюда или{' '}
                  <span className="font-medium text-(--color-accent)">выберите файл</span>
                </p>
              </div>
            )}

            {uploadMsg && !uploadError && (
              <Alert variant={uploadMsg.startsWith('Добавлено') ? 'success' : 'info'}>
                {uploadMsg}
              </Alert>
            )}

            {uploadError && (
              <Alert
                variant={uploadError.title.includes('недоступен') ? 'warning' : 'error'}
                title={uploadError.title}
                onClose={() => setUploadError(null)}
              >
                {uploadError.text}
              </Alert>
            )}
          </div>
        )}

        {/* Manual input */}
        <div className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-(--color-text-primary) mb-1">
              {inputMode === 'manual' ? 'Выбор навыков вручную' : 'Или добавьте вручную'}
            </h2>
            <p className="text-sm text-(--color-text-muted)">
              Введите название навыка или выберите из подсказок.
            </p>
          </div>

          <div className="relative" ref={suggestRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-(--color-text-muted)" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="SQL, коммуникации, roadmap…"
                className="input-field pl-10 pr-12"
                role="combobox"
                aria-expanded={showSuggestions}
                aria-autocomplete="list"
              />
              {query.trim() && (
                <button
                  onClick={() => addSkill(query)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-(--color-accent-light) p-1.5 text-(--color-accent) hover:bg-(--color-accent)/20 transition-colors"
                  title="Добавить"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div
                className="absolute z-20 mt-1 w-full rounded-xl border border-(--color-border) bg-(--color-surface-raised) shadow-lg max-h-60 overflow-y-auto"
                role="listbox"
                aria-live="polite"
              >
                {suggestions.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => addSkill(s)}
                    role="option"
                    aria-selected={i === highlightedIdx}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl ${
                      i === highlightedIdx
                        ? 'bg-(--color-accent-light) text-(--color-accent) font-medium'
                        : 'text-(--color-text-secondary) hover:bg-(--color-accent-light)'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {inputMode === 'manual' && skillCategories.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-(--color-text-muted)">
                Выбор по категориям для «{state.profession}»:
              </p>
              {skillCategories.map((category) => {
                const available = category.skills.filter((skillName) => !existingNames.has(skillName.toLowerCase()));
                if (available.length === 0) return null;
                return (
                  <div key={category.name} className="space-y-2">
                    <p className="text-sm font-medium text-(--color-text-primary)">{category.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {available.slice(0, 20).map((skillName) => (
                        <button
                          key={`${category.name}-${skillName}`}
                          onClick={() => addSkill(skillName)}
                          className="inline-flex items-center gap-1 rounded-lg border border-(--color-border) bg-(--color-surface-raised) px-3 py-1.5 text-sm text-(--color-text-secondary) hover:border-(--color-accent)/40 hover:bg-(--color-accent-light) transition-colors"
                        >
                          <Plus className="h-3 w-3" /> {skillName}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredRoleSkills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-(--color-text-muted) mb-2">
                Рекомендуемые для «{state.profession}»:
              </p>
              <div className="flex flex-wrap gap-2">
                {visibleRecommended.map((s) => (
                  <button
                    key={s}
                    onClick={() => addSkill(s)}
                    className="inline-flex items-center gap-1 rounded-lg border border-(--color-border) bg-(--color-surface-raised) px-3 py-1.5 text-sm text-(--color-text-secondary) hover:border-(--color-accent)/40 hover:bg-(--color-accent-light) transition-colors"
                  >
                    <Plus className="h-3 w-3" /> {s}
                  </button>
                ))}
              </div>
              {filteredRoleSkills.length > RECOMMENDED_VISIBLE && (
                <button
                  onClick={() => setShowAllRecommended(!showAllRecommended)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-(--color-accent) hover:text-(--color-accent-hover) transition-colors"
                >
                  {showAllRecommended ? (
                    <>Свернуть <ChevronUp className="h-3 w-3" /></>
                  ) : (
                    <>Показать все ({filteredRoleSkills.length}) <ChevronDown className="h-3 w-3" /></>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Selected skills */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-(--color-text-primary)">
            Выбранные навыки
            {skills.length > 0 && (
              <span className="ml-2 text-sm font-normal text-(--color-text-muted)">({skills.length})</span>
            )}
          </h2>

          <SkillQualityBar count={skills.length} />

          {hasConfidenceMetadata && (
            <Alert variant="info" title="Проверка распознавания навыков">
              Зелёный — распознано автоматически, жёлтый — подтвердите вариант, серый — низкая уверенность.
            </Alert>
          )}

          {skills.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-10 text-center">
              <FileText className="h-10 w-10 text-(--color-text-muted)/40 mb-3" />
              <p className="text-sm text-(--color-text-muted)">
                Добавьте 3–7 навыков — это улучшит точность рекомендаций.
              </p>
            </div>
          ) : (
            <div className="space-y-2" aria-live="polite">
              {skills.map((skill, i) => (
                <div key={`${skill.name}-${i}`} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <SkillConfidenceBadge skill={skill} />
                  </div>

                  <SkillCard
                    skill={skill}
                    isNew={newSkillNames.has(skill.name.toLowerCase())}
                    onChange={(updated) => {
                      const next = [...skills];
                      next[i] = updated;
                      setSkills(next);
                    }}
                    onRemove={() => removeSkill(i)}
                  />

                  {(skill.confidence ?? 0) > 0.6 && (skill.confidence ?? 0) <= 0.85 && (
                    <SkillAlternativeSelect
                      skill={skill}
                      onSelectAlternative={(altName: string) => applyAlternative(i, altName)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button onClick={onBack} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Назад
          </button>
          <button onClick={handleNext} className="btn-primary">
            Продолжить <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
