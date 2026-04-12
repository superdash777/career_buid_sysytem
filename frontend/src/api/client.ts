import type {
  PlanRequest,
  PlanResponse,
  Skill,
  FocusedPlan,
  AuthResponse,
  UserProfile,
  AnalysisRecord,
  ProgressRecord,
  ProgressStatus,
  OnboardingRequest,
  OnboardingResponse,
} from '../types';

const BASE = '';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(
  url: string,
  init?: RequestInit,
  signal?: AbortSignal,
): Promise<T> {
  const authToken = localStorage.getItem('career_copilot_jwt') || '';
  const initHeaders = new Headers(init?.headers || {});
  if (authToken && !initHeaders.has('Authorization')) {
    initHeaders.set('Authorization', `Bearer ${authToken}`);
  }

  const res = await fetch(`${BASE}${url}`, { ...init, headers: initHeaders, signal });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch { /* ignore */ }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function fetchProfessions(signal?: AbortSignal): Promise<string[]> {
  const data = await request<{ professions: string[] }>('/api/professions', undefined, signal);
  return data.professions;
}

export async function fetchSkillsForRole(
  profession: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const data = await request<{ skills: string[] }>(
    `/api/skills-for-role?profession=${encodeURIComponent(profession)}`,
    undefined,
    signal,
  );
  return data.skills;
}

export async function suggestSkills(q: string, signal?: AbortSignal): Promise<string[]> {
  if (q.trim().length < 2) return [];
  const data = await request<{ suggestions: string[] }>(
    `/api/suggest-skills?q=${encodeURIComponent(q.trim())}`,
    undefined,
    signal,
  );
  return data.suggestions;
}

export async function analyzeResume(
  file: File,
  signal?: AbortSignal,
): Promise<{ skills: Skill[]; error?: string }> {
  const form = new FormData();
  form.append('file', file);
  return request<{ skills: Skill[]; error?: string }>(
    '/api/analyze-resume',
    { method: 'POST', body: form },
    signal,
  );
}

export async function buildPlan(
  req: PlanRequest,
  signal?: AbortSignal,
): Promise<PlanResponse> {
  return request<PlanResponse>(
    '/api/plan',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    },
    signal,
  );
}

export async function buildFocusedPlan(
  params: { profession: string; grade: string; scenario: string; target_profession?: string; selected_skills: string[] },
  signal?: AbortSignal,
): Promise<FocusedPlan> {
  return request<FocusedPlan>(
    '/api/focused-plan',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) },
    signal,
  );
}

export async function register(
  params: { email: string; password: string },
  signal?: AbortSignal,
): Promise<AuthResponse> {
  return request<AuthResponse>(
    '/api/auth/register',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    signal,
  );
}

export async function login(
  params: { email: string; password: string },
  signal?: AbortSignal,
): Promise<AuthResponse> {
  return request<AuthResponse>(
    '/api/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    signal,
  );
}

export async function authMe(signal?: AbortSignal): Promise<{ user: UserProfile }> {
  return request<{ user: UserProfile }>('/api/auth/me', undefined, signal);
}

export async function fetchMe(signal?: AbortSignal): Promise<UserProfile> {
  const data = await request<{ user: UserProfile }>('/api/auth/me', undefined, signal);
  return data.user;
}

export async function saveOnboarding(
  payload: OnboardingRequest,
  signal?: AbortSignal,
): Promise<OnboardingResponse> {
  return request<OnboardingResponse>(
    '/api/auth/onboarding',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    signal,
  );
}

export async function fetchAnalyses(signal?: AbortSignal): Promise<AnalysisRecord[]> {
  const data = await request<{ items: AnalysisRecord[] }>('/api/analyses', undefined, signal);
  return data.items;
}

export async function createAnalysis(
  payload: {
    scenario: string;
    current_role?: string;
    target_role?: string;
    skills_json?: Record<string, unknown>;
    result_json?: Record<string, unknown>;
  },
  signal?: AbortSignal,
): Promise<AnalysisRecord> {
  const data = await request<{ item: AnalysisRecord }>(
    '/api/analyses',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    signal,
  );
  return data.item;
}

export async function fetchAnalysisById(analysisId: string, signal?: AbortSignal): Promise<AnalysisRecord> {
  const data = await request<{ item: AnalysisRecord }>(`/api/analyses/${encodeURIComponent(analysisId)}`, undefined, signal);
  return data.item;
}

export async function patchProgress(
  payload: { skill_name: string; status: ProgressStatus },
  signal?: AbortSignal,
): Promise<ProgressRecord> {
  const data = await request<{ item: ProgressRecord }>(
    '/api/progress',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    signal,
  );
  return data.item;
}

export async function fetchProgress(signal?: AbortSignal): Promise<ProgressRecord[]> {
  const data = await request<{ items: ProgressRecord[] }>('/api/progress', undefined, signal);
  return data.items;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const data = await request<{ status: string }>('/health');
    return data.status === 'ok';
  } catch {
    return false;
  }
}

export { ApiError };
