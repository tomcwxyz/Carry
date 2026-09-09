import { z } from 'zod';

import { createOpenAIResponse, getOpenAIOutputText } from './openai-response.js';

const domainSchema = z.enum(['personal', 'household', 'family', 'admin', 'purchase', 'travel', 'work', 'code', 'other']);
const stateSchema = z.enum(['carrying', 'needs_user']);
const stepStateSchema = z.enum(['done', 'active', 'todo']);

export const understoodCaseSchema = z.object({
  title: z.string().min(2).max(80),
  outcome: z.string().min(8).max(280),
  summary: z.string().min(4).max(180),
  domain: domainSchema,
  state: stateSchema,
  nextAction: z.string().min(4).max(220),
  decisionLabel: z.string().max(80).nullable(),
  plan: z.array(z.object({
    label: z.string().min(3).max(140),
    state: stepStateSchema,
  })).min(2).max(6),
});

export type UnderstoodCase = z.infer<typeof understoodCaseSchema>;

const understoodCaseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    outcome: { type: 'string' },
    summary: { type: 'string' },
    domain: { type: 'string', enum: ['personal', 'household', 'family', 'admin', 'purchase', 'travel', 'work', 'code', 'other'] },
    state: { type: 'string', enum: ['carrying', 'needs_user'] },
    nextAction: { type: 'string' },
    decisionLabel: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    plan: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: { type: 'string' },
          state: { type: 'string', enum: ['done', 'active', 'todo'] },
        },
        required: ['label', 'state'],
      },
    },
  },
  required: ['title', 'outcome', 'summary', 'domain', 'state', 'nextAction', 'decisionLabel', 'plan'],
} as const;

const SYSTEM = `You are Carry, an agent that moves real-life and work cases towards completion.
Turn the user's capture into a concise operational case.
Do not turn it into a conventional to-do item. Define what finished looks like and a small plan.
Default to state=carrying when Carry can make useful progress without the user. Use needs_user only when a genuine decision or missing fact blocks progress now.
For physical or household problems, prefer safe assessment and arranging appropriate help; do not encourage risky DIY.
The first active plan step should be the next useful thing Carry can do. Never claim an external action has already happened.`;

export function getCaseModel() {
  const configured = process.env.CARRY_CASE_MODEL?.trim();
  return (configured || 'gpt-5.6-luna').replace(/^openai\//, '');
}

export function getCaseProvider() {
  return 'openai-direct';
}

export async function understandCase(sourceText: string): Promise<UnderstoodCase> {
  const data = await createOpenAIResponse({
    model: getCaseModel(),
    instructions: SYSTEM,
    input: sourceText,
    max_output_tokens: 900,
    text: {
      format: {
        type: 'json_schema',
        name: 'carry_case',
        strict: true,
        schema: understoodCaseJsonSchema,
      },
    },
  });

  const text = getOpenAIOutputText(data);
  if (!text) throw new Error('OpenAI case understanding returned no structured output');

  return understoodCaseSchema.parse(JSON.parse(text));
}

export function fallbackCase(sourceText: string): UnderstoodCase {
  const cleaned = sourceText.trim();
  const words = cleaned.replace(/[.!?]+$/g, '').split(/\s+/).slice(0, 7).join(' ');
  return {
    title: words || 'New case',
    outcome: `Get this sorted: ${cleaned}`,
    summary: 'Carry saved this, but could not analyse it yet.',
    domain: 'other',
    state: 'carrying',
    nextAction: 'Carry needs to retry understanding this case before taking action.',
    decisionLabel: null,
    plan: [
      { label: 'Understand what needs resolving', state: 'active' },
      { label: 'Take the next useful action', state: 'todo' },
      { label: 'Verify the outcome', state: 'todo' },
    ],
  };
}
