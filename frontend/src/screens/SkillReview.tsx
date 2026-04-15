import { useState, type KeyboardEvent } from 'react';
import Layout from '../components/Layout';
import Button from '../components/ui/Button';
import Alert from '../components/Alert';
import Eyebrow from '../components/ui/Eyebrow';
import type { Skill } from '../types';

interface Props {
  extractedSkills: Skill[];
  onConfirm: (skills: Skill[]) => void;
  onBack: () => void;
}

type ConfidenceBand = Skill['confidence_band'];

const DELETE_SENTINEL = '__DELETE__';

function isHighConfidence(band: ConfidenceBand): boolean {
  return band === 'exact' || band === 'fuzzy';
}

function isLowConfidence(band: ConfidenceBand): boolean {
  return band === 'vector_llm' || band === 'llm_unknown' || band === undefined;
}

export default function SkillReview({ extractedSkills, onConfirm, onBack }: Props) {
  const [confirmedSkills, setConfirmedSkills] = useState<Skill[]>(() => [...extractedSkills]);
  const [manualInput, setManualInput] = useState('');

  const highConfidence = confirmedSkills.filter((s) => isHighConfidence(s.confidence_band));
  const lowConfidence = confirmedSkills.filter((s) => isLowConfidence(s.confidence_band));

  const removeSkill = (name: string) => {
    setConfirmedSkills((prev) => prev.filter((s) => s.name !== name));
  };

  const replaceSkill = (originalName: string, newName: string) => {
    if (newName === DELETE_SENTINEL) {
      removeSkill(originalName);
      return;
    }
    setConfirmedSkills((prev) =>
      prev.map((s) =>
        s.name === originalName
          ? { ...s, name: newName, confidence_band: 'fuzzy' as const }
          : s,
      ),
    );
  };

  const addManualSkill = () => {
    const trimmed = manualInput.trim();
    if (!trimmed) return;
    if (confirmedSkills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    setConfirmedSkills((prev) => [...prev, { name: trimmed, level: 1 }]);
    setManualInput('');
  };

  const handleManualKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addManualSkill();
    }
  };

  return (
    <Layout step={2} showStepper={true}>
      <div className="space-y-8 slide-up">
        {/* Header */}
        <div>
          <h1 className="mt-2 mb-2 text-3xl leading-tight text-(--color-text-primary) sm:text-4xl">
            Проверка извлеченных навыков
          </h1>
          <p className="text-(--color-text-secondary)">
            {confirmedSkills.length} навыков
          </p>
        </div>

        {/* Block 1 — High confidence */}
        {highConfidence.length > 0 && (
          <div className="card space-y-4 border-l-4 border-l-emerald-500">
            <Eyebrow>Распознано уверенно</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {highConfidence.map((skill) => (
                <span
                  key={skill.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-(--color-border) bg-[var(--chip)] px-3 py-1.5 text-sm font-medium text-(--color-text-primary)"
                >
                  {skill.name}
                  <button
                    onClick={() => removeSkill(skill.name)}
                    className="ml-0.5 text-(--color-text-muted) hover:text-[var(--accent-red)] transition-colors"
                    aria-label={`Удалить ${skill.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Block 2 — Low confidence */}
        {lowConfidence.length > 0 && (
          <div className="card space-y-4 border-l-4 border-l-amber-500">
            <Eyebrow>Уточните — неуверенные совпадения</Eyebrow>
            <Alert variant="warning">
              Эти навыки распознаны с низкой уверенностью. Выберите правильный вариант или удалите.
            </Alert>
            <div className="space-y-4">
              {lowConfidence.map((skill) => (
                <div
                  key={skill.name}
                  className="rounded-xl border border-(--color-border) bg-(--color-surface-raised) p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {skill.raw_name && (
                      <span className="text-sm text-(--color-text-muted) line-through">
                        {skill.raw_name}
                      </span>
                    )}
                    {skill.raw_name && (
                      <span className="text-(--color-text-muted)">→</span>
                    )}

                    {skill.alternatives && skill.alternatives.length > 0 ? (
                      <select
                        value={skill.name}
                        onChange={(e) => replaceSkill(skill.name, e.target.value)}
                        className="input-field max-w-xs text-sm"
                      >
                        <option value={skill.name}>{skill.name}</option>
                        {skill.alternatives.map((alt) => (
                          <option key={alt.name} value={alt.name}>
                            {alt.name}
                            {alt.score != null ? ` (${Math.round(alt.score * 100)}%)` : ''}
                          </option>
                        ))}
                        <option value={DELETE_SENTINEL}>Удалить</option>
                      </select>
                    ) : (
                      <span className="text-sm font-medium text-(--color-text-primary)">
                        {skill.name}
                      </span>
                    )}

                    {(!skill.alternatives || skill.alternatives.length === 0) && (
                      <button
                        onClick={() => removeSkill(skill.name)}
                        className="ml-auto text-sm text-[var(--accent-red)] hover:underline transition-colors"
                      >
                        Удалить
                      </button>
                    )}
                  </div>

                  {skill.evidence && (
                    <p className="text-xs text-(--color-text-muted) leading-relaxed italic">
                      «{skill.evidence}»
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Block 3 — Manual add */}
        <div className="card space-y-4">
          <Eyebrow>Добавить вручную</Eyebrow>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={handleManualKeyDown}
              placeholder="Название навыка…"
              className="input-field flex-1"
            />
            <Button
              variant="secondary"
              size="md"
              onClick={addManualSkill}
              disabled={!manualInput.trim()}
            >
              Добавить
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="secondary" onClick={onBack}>
            ← Назад
          </Button>
          <Button onClick={() => onConfirm(confirmedSkills)}>
            Подтвердить — {confirmedSkills.length} навыков
          </Button>
        </div>
      </div>
    </Layout>
  );
}
