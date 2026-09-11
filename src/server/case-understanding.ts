import { z } from 'zod';

import { createOpenAIResponse, getOpenAIOutputText } from './openai-response.js';
import { decisionInputJsonSchema, decisionInputSchema, normaliseDecisionInput } from './decision-input.js';

const domainSchema = z.enum(['personal', 'household', 'family', 'admin', 'purchase', 'travel', 'work', 'code', 'other']);
const stateSchema = z.enum(['carrying', 'needs_user']);
const stepStateSchema = z.enum(['done', 'active', 'todo']);

const rawUnderstoodCaseSchema = z.object({
  title: z.string(),
  outcome: z.string(),
  summary: z.string(),
  domain: domainSchema,
  state: stateSchema,
  nextAction: z.string(),
  decisionLabel: z.string().nullable(),
  decisionInput: decisionInputSchema.nullable(),
  plan: z.array(z.object({
    label: z.string(),
    state: stepStateSchema,
  })).min(2),
});

export const understoodCaseSchema = z.object({
  title: z.string().min(2).max(80),
  outcome: z.string().min(8).max(280),
  summary: z.string().min(4).max(180),
  domain: domainSchema,
  state: stateSchema,
  nextAction: z.string().min(4).max(220),
  decisionLabel: z.string().max(80).nullable(),
  decisionInput: decisionInputSchema.nullable(),
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
    decisionInput: decisionInputJsonSchema,
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
  required: ['title', 'outcome', 'summary', 'domain', 'state', 'nextAction', 'decisionLabel', 'decisionInput', 'plan'],
} as const;

const SYSTEM = `You are Carry, an agent that moves real-life and work cases towards completion.
Turn the user's capture into a concise operational case.
Do not turn it into a conventional to-do item. Define what finished looks like and a small plan.
Default to state=carrying when Carry can make useful progress without the user. Use needs_user only when a genuine decision or missing fact blocks progress now.
For physical or household problems, prefer safe assessment and arranging appropriate help; do not encourage risky DIY.
The first active plan step should be the next useful thing Carry can do. Never claim an external action has already happened.
When state=needs_user, set decisionInput to describe how the mobile app should collect the blocking input. Use kind=location only when the user's current/place location is genuinely required; otherwise use kind=text. Set askRadius=true only when Carry will search for nearby providers, places or options and a search distance would materially change the result. Never request location merely because it could be convenient.
When state=carrying, decisionLabel and decisionInput must both be null.
If recent explicit feedback from this user is supplied, treat it as soft working preferences only when relevant. Do not overgeneralise one case to unrelated domains and never treat feedback as factual evidence about the current case.
Be terse: title under 60 characters, summary one short sentence, decision label a short prompt, and normally 2-4 plan steps.`;

function clip(value: string, max: number) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function normaliseUnderstoodCase(value: unknown): UnderstoodCase {
  const raw = rawUnderstoodCaseSchema.parse(value);
  const hasHandback = raw.state === 'needs_user' && Boolean(raw.decisionLabel?.trim());
  return understoodCaseSchema.parse({
    title: clip(raw.title, 80),
    outcome: clip(raw.outcome, 280),
    summary: clip(raw.summary, 180),
    domain: raw.domain,
    state: raw.state,
    nextAction: clip(raw.nextAction, 220),
    decisionLabel: hasHandback && raw.decisionLabel ? clip(raw.decisionLabel, 80) : null,
    decisionInput: normaliseDecisionInput(raw.decisionInput, hasHandback),
    plan: raw.plan.slice(0, 6).map((step) => ({
      label: clip(step.label, 140),
      state: step.state,
    })),
  });
}

export function getCaseModel() {
  const configured = process.env.CARRY_CASE_MODEL?.trim();
  return (configured || 'gpt-5.6-luna').replace(/^openai\//, '');
}

export function getCaseProvider() {
  return 'openai-direct';
}

export async function understandCase(sourceText: string, learningSignals: string[] = []): Promise<UnderstoodCase> {
  const input = learningSignals.length > 0
    ? `CURRENT CASE\n${sourceText}\n\nRECENT EXPLICIT USER FEEDBACK\n${learningSignals.join('\n')}`
    : sourceText;

  const data = await createOpenAIResponse({
    model: getCaseModel(),
    instructions: SYSTEM,
    input,
    max_output_tokens: 1800,
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

  return normaliseUnderstoodCase(JSON.parse(text));
}

export function fallbackCase(sourceText: string): UnderstoodCase {
  const cleaned = sourceText.trim();
  const words = cleaned.replace(/[.!?]+$/g, '').split(/\s+/).slice(0, 7).join(' ');
  return {
    title: words || 'New case',
    outcome: clip(`Get this sorted: ${cleaned}`, 280),
    summary: 'Carry saved this, but could not analyse it yet.',
    domain: 'other',
    state: 'carrying',
    nextAction: 'Carry needs to retry understanding this case before taking action.',
    decisionLabel: null,
    decisionInput: null,
    plan: [
      { label: 'Understand what needs resolving', state: 'active' },
      { label: 'Take the next useful action', state: 'todo' },
      { label: 'Verify the outcome', state: 'todo' },
    ],
  };
}
