import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { ArrowRight, ArrowLeft, Upload, Search, Plus, FileText } from 'lucide-react';
import Layout from '../components/Layout';
import Alert from '../components/Alert';
import SkillCard from '../components/SkillCard';
import Spinner from '../components/Spinner';
import { analyzeResume, suggestSkills, fetchSkillsForRole } from '../api/client';
import { ApiError } from '../api/client';
import type { AppState, Skill } from '../types';

interface Props {
  state: AppState;
  onChange: (patch: Partial<AppState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Skills({ state, onChange, onNext, onBack }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState<{ title: string; text: string } | null>(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [roleSkills, setRoleSkills] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validationError, setValidationError] = useState('');
  const suggestRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const skills = state.skills;
  const setSkills = (s: Skill[]) => onChange({ skills: s });

  useEffect(() => {
    if (state.profession) {
      fetchSkillsForRole(state.profession).then(setRoleSkills).catch(() => {});
    }
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

  const addSkill = useCallback(
    (name: string, level: number = 1) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (skills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return;
      setSkills([...skills, { name: trimmed, level }]);
      setQuery('');
      setSuggestions([]);
      setShowSuggestions(false);
    },
    [skills, setSkills],
  );

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        suggestSkills(val).then((s) => {
          setSuggestions(s);
          setShowSuggestions(s.length > 0);
        }).catch(() => {});
      }, 250);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      addSkill(query);
    }
  };

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setUploadError({
          title: 'Нужен PDF-файл',
          text: 'Если резюме в другом формате — сохраните его как PDF и попробуйте снова.',
        });
        return;
      }
      setUploading(true);
      setUploadError(null);
      setUploadMsg('');
      try {
        const result = await analyzeResume(file);
        if (result.skills.length === 0) {
          setUploadMsg('Мы не нашли навыки в тексте. Попробуйте другой файл или добавьте навыки вручную.');
        } else {
          const newSkills = [...skills];
          for (const s of result.skills) {
            if (!newSkills.some((x) => x.name.toLowerCase() === s.name.toLowerCase())) {
              newSkills.push(s);
            }
          }
          setSkills(newSkills);
          setUploadMsg(`Извлечено навыков: ${result.skills.length}`);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 400) {
            setUploadError({
              title: 'Нужен PDF-файл',
              text: 'Если резюме в другом формате — сохраните его как PDF и попробуйте снова.',
            });
          } else if (err.status === 503) {
            setUploadError({
              title: 'Авторазбор резюме временно недоступен',
              text: 'Сейчас сервис не подключён к модели. Вы можете продолжить: добавьте навыки вручную.',
            });
          } else {
            setUploadError({
              title: 'Не получилось загрузить данные',
              text: 'Проверьте соединение и попробуйте ещё раз. Если ошибка повторяется — откройте страницу позже.',
            });
          }
        } else {
          setUploadError({
            title: 'Не получилось загрузить данные',
            text: 'Проверьте соединение и попробуйте ещё раз.',
          });
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
      setValidationError('Добавьте хотя бы один навык — иначе план не собрать.');
      return;
    }
    setValidationError('');
    onNext();
  };

  const existingNames = new Set(skills.map((s) => s.name.toLowerCase()));
  const filteredRoleSkills = roleSkills.filter((s) => !existingNames.has(s.toLowerCase()));

  return (
    <Layout step={2}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Навыки</h1>
          <p className="text-slate-500">Загрузите резюме или добавьте навыки вручную.</p>
        </div>

        {validationError && (
          <Alert variant="warning" onClose={() => setValidationError('')}>
            {validationError}
          </Alert>
        )}

        {/* Block A: Resume upload */}
        <div className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Загрузите резюме (PDF)</h2>
            <p className="text-sm text-slate-500">Мы извлечём навыки и предложим их к подтверждению.</p>
          </div>

          {uploading ? (
            <Spinner text="Читаем резюме…" subtext="Это обычно занимает до минуты." />
          ) : (
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer ${
                isDragActive
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 text-slate-400" />
              <p className="text-sm text-slate-600 text-center">
                Перетащите PDF сюда или{' '}
                <span className="font-medium text-indigo-600">выберите файл</span>
              </p>
            </div>
          )}

          {uploadMsg && !uploadError && (
            <Alert variant={uploadMsg.startsWith('Извлечено') ? 'success' : 'info'}>
              {uploadMsg}
            </Alert>
          )}

          {uploadError && (
            <Alert
              variant={uploadError.title.includes('временно') ? 'warning' : 'error'}
              title={uploadError.title}
              onClose={() => setUploadError(null)}
            >
              {uploadError.text}
            </Alert>
          )}
        </div>

        {/* Block B: Manual input */}
        <div className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Добавьте навыки</h2>
            <p className="text-sm text-slate-500">Можно вручную — введите название или выберите из подсказок.</p>
          </div>

          <div className="relative" ref={suggestRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Начните вводить навык: например, SQL, коммуникации, roadmap…"
                className="input-field pl-10 pr-12"
              />
              {query.trim() && (
                <button
                  onClick={() => addSkill(query)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-indigo-100 p-1.5 text-indigo-600 hover:bg-indigo-200 transition-colors"
                  title="Добавить навык"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => addSkill(s)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Подсказки учитывают синонимы и близкие формулировки.
          </p>

          {/* Role-based quick-add */}
          {filteredRoleSkills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">
                Навыки профессии «{state.profession}»:
              </p>
              <div className="flex flex-wrap gap-2">
                {filteredRoleSkills.slice(0, 20).map((s) => (
                  <button
                    key={s}
                    onClick={() => addSkill(s)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Block C: Selected skills */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              Выбранные навыки
              {skills.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-500">({skills.length})</span>
              )}
            </h2>
          </div>

          {skills.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-10 text-center">
              <FileText className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">
                Пока пусто. Добавьте 3–7 навыков — и мы соберём более точный план.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {skills.map((skill, i) => (
                <SkillCard
                  key={`${skill.name}-${i}`}
                  skill={skill}
                  onChange={(updated) => {
                    const next = [...skills];
                    next[i] = updated;
                    setSkills(next);
                  }}
                  onRemove={() => setSkills(skills.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}

          <p className="text-xs text-slate-400">
            Выберите уровень честно — план станет точнее.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button onClick={onBack} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Назад к цели
          </button>
          <button onClick={handleNext} className="btn-primary">
            Собрать план <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
