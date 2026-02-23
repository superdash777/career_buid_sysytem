import type { PlanRequest, PlanResponse, Skill } from '../types';

const BASE = '';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, init);
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

export async function fetchProfessions(): Promise<string[]> {
  const data = await request<{ professions: string[] }>('/api/professions');
  return data.professions;
}

export async function fetchSkillsForRole(profession: string): Promise<string[]> {
  const data = await request<{ skills: string[] }>(
    `/api/skills-for-role?profession=${encodeURIComponent(profession)}`,
  );
  return data.skills;
}

export async function suggestSkills(q: string): Promise<string[]> {
  if (q.trim().length < 2) return [];
  const data = await request<{ suggestions: string[] }>(
    `/api/suggest-skills?q=${encodeURIComponent(q.trim())}`,
  );
  return data.suggestions;
}

export async function analyzeResume(file: File): Promise<{ skills: Skill[]; error?: string }> {
  const form = new FormData();
  form.append('file', file);
  return request<{ skills: Skill[]; error?: string }>('/api/analyze-resume', {
    method: 'POST',
    body: form,
  });
}

export async function buildPlan(req: PlanRequest): Promise<PlanResponse> {
  return request<PlanResponse>('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
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
