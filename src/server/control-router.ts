import { z } from 'zod';

import { createOpenAIResponse, getOpenAIOutputText } from './openai-response.js';

export interface ControlCaseCandidate {
  id: string;
  title: string;
  summary: string;
  state: string;
  nextAction?: string | null;
}

const routeSchema = z.object({
  kind: z.enum(['new_case', 'existing_case', 'status_query']),
  caseId: z.string().nullable(),
});

const routeJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: { type: 'string', enum: ['new_case', 'existing_case', 'status_query'] },
    caseId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  },
  required: ['kind', 'caseId'],
} as const;

function statusSummary(cases: ControlCaseCandidate[]) {
  const needs = cases.filter((item) => item.state === 'needs_user');
  const carrying = cases.filter((item) => item.state === 'carrying');
  const waiting = cases.filter((item) => item.state === 'waiting');

  if (cases.length === 0) return 'Carry has nothing active at the moment.';
  const parts = [
    needs.length ? `${needs.length} need you` : 'nothing needs you',
    carrying.length ? `${carrying.length} being carried` : null,
    waiting.length ? `${waiting.length} waiting on something else` : null,
  ].filter(Boolean);
  const next = needs.slice(0, 3).map((item) => item.title);
  return `${parts.join(', ')}.${next.length ? ` Needs you: ${next.join('; ')}.` : ''}`;
}

export async function routeControlInput(sourceText: string, cases: ControlCaseCandidate[]) {
  if (cases.length === 0) return { kind: 'new_case' as const, caseId: null, message: null };

  const text = sourceText.trim();
  if (/^(what|which).*(needs? me|do i need|still needs?|waiting|carrying)|^what('?s| is) (left|happening)/i.test(text)) {
    return { kind: 'status_query' as const, caseId: null, message: statusSummary(cases) };
  }

  const candidateText = cases.map((item) =>
    `- id=${item.id} | ${item.title} | state=${item.state} | ${item.summary} | next=${item.nextAction ?? ''}`
  ).join('\n');

  const response = await createOpenAIResponse({
    model: (process.env.CARRY_CASE_MODEL?.trim() || 'gpt-5.6-luna').replace(/^openai\//, ''),
    instructions: `Route a short user command for Carry.
Choose existing_case only when the utterance clearly refers to one current case. Examples: "not Wednesday", "chase them", "take the cheaper one", "yes that works".
Choose status_query for a question about what Carry currently needs, is doing or is waiting for.
Choose new_case for a genuinely new outcome, or whenever matching an existing case would be a guess.
Be conservative: do not attach a new problem to an existing case just because the domain is similar.
For existing_case, caseId must be exactly one supplied candidate id. Otherwise caseId must be null.`,
    input: `USER\n${text}\n\nACTIVE CASES\n${candidateText}`,
    max_output_tokens: 300,
    text: {
      format: {
        type: 'json_schema',
        name: 'carry_control_route',
        strict: true,
        schema: routeJsonSchema,
      },
    },
  });

  const output = getOpenAIOutputText(response);
  if (!output) return { kind: 'new_case' as const, caseId: null, message: null };

  const parsed = routeSchema.parse(JSON.parse(output));
  if (parsed.kind === 'status_query') {
    return { kind: 'status_query' as const, caseId: null, message: statusSummary(cases) };
  }
  if (parsed.kind === 'existing_case' && parsed.caseId && cases.some((item) => item.id === parsed.caseId)) {
    return { kind: 'existing_case' as const, caseId: parsed.caseId, message: null };
  }
  return { kind: 'new_case' as const, caseId: null, message: null };
}
