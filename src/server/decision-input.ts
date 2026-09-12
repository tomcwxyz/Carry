import { z } from 'zod';

export const decisionInputSchema = z.object({
  kind: z.enum(['text', 'location', 'approval']),
  askRadius: z.boolean(),
});

export type DecisionInput = z.infer<typeof decisionInputSchema>;

export const nullableDecisionInputSchema = decisionInputSchema.nullable();

export const decisionInputJsonSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        kind: { type: 'string', enum: ['text', 'location', 'approval'] },
        askRadius: { type: 'boolean' },
      },
      required: ['kind', 'askRadius'],
    },
    { type: 'null' },
  ],
} as const;

export function normaliseDecisionInput(value: unknown, isHandback: boolean): DecisionInput | null {
  if (!isHandback) return null;
  const parsed = nullableDecisionInputSchema.safeParse(value);
  if (!parsed.success || !parsed.data) return { kind: 'text', askRadius: false };
  if (parsed.data.kind === 'location') return parsed.data;
  return { kind: parsed.data.kind, askRadius: false };
}
