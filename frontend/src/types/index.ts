export interface Skill {
  name: string;
  level: number; // 1 = Базовый, 1.5 = Уверенный, 2 = Продвинутый
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
