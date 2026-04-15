import type { PlanStep } from '../types';

export function parseStepsFromMarkdown(markdown: string): PlanStep[] {
  if (!markdown || !markdown.trim()) return [];

  const sections = markdown.split(/^## /m).filter(Boolean);
  const steps: PlanStep[] = [];

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const title = lines[0]?.trim();
    if (!title) continue;

    const description = lines.slice(1).join('\n').trim().slice(0, 300);

    let weekRange = '';
    const weekMatch = description.match(/(\d+)\s*(?:недел|нед\.)/i);
    const monthMatch = description.match(/(\d+)\s*(?:месяц|мес\.)/i);
    if (weekMatch) weekRange = `Нед. ${weekMatch[1]}`;
    else if (monthMatch) weekRange = `Мес. ${monthMatch[1]}`;

    const priority: PlanStep['priority'] =
      /критич|приоритет\s*1/i.test(description) ? 'critical' :
      /умерен|приоритет\s*2/i.test(description) ? 'moderate' : 'ok';

    steps.push({
      id: `step-${steps.length}`,
      title,
      description: description.slice(0, 200),
      week_range: weekRange,
      priority,
      status: 'todo',
    });
  }

  return steps;
}
