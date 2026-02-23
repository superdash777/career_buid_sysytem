export interface Skill {
  name: string;
  level: number; // 0..2, шаг 0.5
}

export const SKILL_LEVELS = [
  { value: 0,   label: 'Нет навыка',    short: '0' },
  { value: 0.5, label: 'Начальный',     short: '0.5' },
  { value: 1,   label: 'Базовый',       short: '1' },
  { value: 1.5, label: 'Продвинутый',   short: '1.5' },
  { value: 2,   label: 'Эксперт',       short: '2' },
] as const;

export function skillLevelLabel(level: number): string {
  return SKILL_LEVELS.find((l) => l.value === level)?.label ?? `${level}`;
}

export type Scenario =
  | 'Следующий грейд'
  | 'Смена профессии'
  | 'Исследование возможностей';

export type Grade =
  | 'Младший (Junior)'
  | 'Специалист (Middle)'
  | 'Старший (Senior)'
  | 'Ведущий (Lead)'
  | 'Эксперт (Expert)';

export const GRADES: Grade[] = [
  'Младший (Junior)',
  'Специалист (Middle)',
  'Старший (Senior)',
  'Ведущий (Lead)',
  'Эксперт (Expert)',
];

export const SCENARIOS: { value: Scenario; label: string; description: string }[] = [
  {
    value: 'Следующий грейд',
    label: 'Следующий грейд',
    description: 'Хочу вырасти в рамках текущей профессии',
  },
  {
    value: 'Смена профессии',
    label: 'Смена профессии',
    description: 'Хочу перейти в другую роль',
  },
  {
    value: 'Исследование возможностей',
    label: 'Исследование возможностей',
    description: 'Хочу понять, какие роли мне подходят',
  },
];

export interface PlanRequest {
  profession: string;
  grade: Grade;
  skills: Skill[];
  scenario: Scenario;
  target_profession?: string;
}

export interface PlanResponse {
  markdown: string;
  role_titles?: string[];
}

export interface AppState {
  profession: string;
  scenario: Scenario | '';
  grade: Grade;
  targetProfession: string;
  skills: Skill[];
}

export const INITIAL_STATE: AppState = {
  profession: '',
  scenario: '',
  grade: 'Специалист (Middle)',
  targetProfession: '',
  skills: [],
};
