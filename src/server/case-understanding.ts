import { generateText, Output } from 'ai';
import { z } from 'zod';

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

const SYSTEM = `You are Carry, an agent that moves real-life and work cases towards completion.
Turn the user's capture into a concise operational case.
Do not turn it into a conventional to-do item. Define what finished looks like and a small plan.
Default to state=carrying when Carry can make useful progress without the user. Use needs_user only when a genuine decision or missing fact blocks progress now.
For physical or household problems, prefer safe assessment and arranging appropriate help; do not encourage risky DIY.
The first active plan step should be the next useful thing Carry can do. Never claim an external action has already happened.`;

export function getCaseModel() {
  return process.env.CARRY_CASE_MODEL?.trim() || 'openai/gpt-5.6-luna';
}

export async function understandCase(sourceText: string): Promise<UnderstoodCase> {
  const { output } = await generateText({
    model: getCaseModel(),
    system: SYSTEM,
    output: Output.object({ schema: understoodCaseSchema }),
    prompt: sourceText,
  });

  return output;
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
