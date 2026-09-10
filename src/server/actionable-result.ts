import { z } from 'zod';

import { decisionInputJsonSchema, decisionInputSchema, normaliseDecisionInput } from './decision-input.js';

const stepStateSchema = z.enum(['done', 'active', 'todo']);
const rawStepSchema = z.object({ label: z.string(), state: stepStateSchema });
const stepSchema = z.object({
  label: z.string().min(3).max(140),
  state: stepStateSchema,
});

const contactKindSchema = z.enum(['phone', 'email', 'website', 'contact_form']);
const rawContactSchema = z.object({
  kind: contactKindSchema,
  label: z.string(),
  value: z.string(),
  sourceUrl: z.string(),
});
const contactSchema = z.object({
  kind: contactKindSchema,
  label: z.string().min(2).max(60),
  value: z.string().min(2).max(500),
  sourceUrl: z.string().min(4).max(500),
});

const rawOptionSchema = z.object({
  name: z.string(),
  summary: z.string(),
  reason: z.string().nullable(),
  recommended: z.boolean(),
  location: z.string().nullable(),
  contacts: z.array(rawContactSchema),
});
const optionSchema = z.object({
  name: z.string().min(2).max(100),
  summary: z.string().min(4).max(360),
  reason: z.string().max(360).nullable(),
  recommended: z.boolean(),
  location: z.string().max(160).nullable(),
  contacts: z.array(contactSchema).max(5),
});

const rawPreparedActionSchema = z.object({
  label: z.string(),
  subject: z.string().nullable(),
  body: z.string(),
});
const preparedActionSchema = z.object({
  label: z.string().min(2).max(80),
  subject: z.string().max(140).nullable(),
  body: z.string().min(4).max(1200),
});

const rawResearchSynthesisSchema = z.object({
  kind: z.enum(['needs_user', 'progress', 'waiting', 'done']),
  summary: z.string(),
  nextAction: z.string(),
  decisionLabel: z.string().nullable(),
  decisionInput: decisionInputSchema.nullable(),
  resultKind: z.enum(['summary', 'shortlist', 'comparison', 'answer']),
  resultTitle: z.string(),
  resultBody: z.string(),
  options: z.array(rawOptionSchema),
  preparedAction: rawPreparedActionSchema.nullable(),
  plan: z.array(rawStepSchema).min(2),
});

const researchSynthesisSchema = z.object({
  kind: z.enum(['needs_user', 'progress', 'waiting', 'done']),
  summary: z.string().min(4).max(220),
  nextAction: z.string().min(4).max(260),
  decisionLabel: z.string().max(140).nullable(),
  decisionInput: decisionInputSchema.nullable(),
  resultKind: z.enum(['summary', 'shortlist', 'comparison', 'answer']),
  resultTitle: z.string().min(3).max(100),
  resultBody: z.string().min(4).max(900),
  options: z.array(optionSchema).max(3),
  preparedAction: preparedActionSchema.nullable(),
  plan: z.array(stepSchema).min(2).max(6),
});

const contactJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: { type: 'string', enum: ['phone', 'email', 'website', 'contact_form'] },
    label: { type: 'string' },
    value: { type: 'string' },
    sourceUrl: { type: 'string' },
  },
  required: ['kind', 'label', 'value', 'sourceUrl'],
} as const;

const optionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    summary: { type: 'string' },
    reason: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    recommended: { type: 'boolean' },
    location: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    contacts: { type: 'array', items: contactJsonSchema },
  },
  required: ['name', 'summary', 'reason', 'recommended', 'location', 'contacts'],
} as const;

export const researchSynthesisJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: { type: 'string', enum: ['needs_user', 'progress', 'waiting', 'done'] },
    summary: { type: 'string' },
    nextAction: { type: 'string' },
    decisionLabel: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    decisionInput: decisionInputJsonSchema,
    resultKind: { type: 'string', enum: ['summary', 'shortlist', 'comparison', 'answer'] },
    resultTitle: { type: 'string' },
    resultBody: { type: 'string' },
    options: { type: 'array', items: optionJsonSchema },
    preparedAction: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            label: { type: 'string' },
            subject: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            body: { type: 'string' },
          },
          required: ['label', 'subject', 'body'],
        },
        { type: 'null' },
      ],
    },
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
  required: [
    'kind', 'summary', 'nextAction', 'decisionLabel', 'decisionInput', 'resultKind', 'resultTitle',
    'resultBody', 'options', 'preparedAction', 'plan',
  ],
} as const;

function clip(value: string, max: number) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function normaliseContacts(contacts: Array<z.infer<typeof rawContactSchema>>) {
  const seen = new Set<string>();
  return contacts.flatMap((contact) => {
    const value = contact.value.trim();
    const sourceUrl = contact.sourceUrl.trim();
    if (!value || !sourceUrl) return [];
    const key = `${contact.kind}:${value.toLowerCase()}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      kind: contact.kind,
      label: clip(contact.label || contact.kind, 60),
      value: clip(value, 500),
      sourceUrl: clip(sourceUrl, 500),
    }];
  }).slice(0, 5);
}

export type ResearchSynthesis = z.infer<typeof researchSynthesisSchema>;

export function normaliseResearchSynthesis(value: unknown): ResearchSynthesis {
  const raw = rawResearchSynthesisSchema.parse(value);
  const hasHandback = raw.kind === 'needs_user' && Boolean(raw.decisionLabel?.trim());
  let recommendedSeen = false;

  const options = raw.options.slice(0, 3).map((option) => {
    const recommended = option.recommended && !recommendedSeen;
    if (recommended) recommendedSeen = true;
    return {
      name: clip(option.name, 100),
      summary: clip(option.summary, 360),
      reason: option.reason ? clip(option.reason, 360) : null,
      recommended,
      location: option.location ? clip(option.location, 160) : null,
      contacts: normaliseContacts(option.contacts),
    };
  });

  return researchSynthesisSchema.parse({
    kind: raw.kind,
    summary: clip(raw.summary, 220),
    nextAction: clip(raw.nextAction, 260),
    decisionLabel: hasHandback && raw.decisionLabel ? clip(raw.decisionLabel, 140) : null,
    decisionInput: normaliseDecisionInput(raw.decisionInput, hasHandback),
    resultKind: raw.resultKind,
    resultTitle: clip(raw.resultTitle, 100),
    resultBody: clip(raw.resultBody, 900),
    options,
    preparedAction: raw.preparedAction ? {
      label: clip(raw.preparedAction.label, 80),
      subject: raw.preparedAction.subject ? clip(raw.preparedAction.subject, 140) : null,
      body: clip(raw.preparedAction.body, 1200),
    } : null,
    plan: raw.plan.slice(0, 6).map((step) => ({ label: clip(step.label, 140), state: step.state })),
  });
}
