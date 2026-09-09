import { z } from 'zod';

export const decisionInputSchema = z.object({
  kind: z.enum(['text', 'location']),
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
        kind: { type: 'string', enum: ['text', 'location'] },
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
  if (parsed.data.kind === 'text') return { kind: 'text', askRadius: false };
  return parsed.data;
}
