import { z } from 'zod';

import { getCaseModel } from './case-understanding.js';
import { getSql } from './db.js';
import { createOpenAIResponse, getOpenAIOutputText } from './openai-response.js';
import { researchWeb, type ResearchResult } from './research-worker.js';

const stepSchema = z.object({
  label: z.string().min(3).max(140),
  state: z.enum(['done', 'active', 'todo']),
});

type PlanStep = z.infer<typeof stepSchema>;

const nextStepSchema = z.object({
  kind: z.enum(['needs_user', 'research', 'progress', 'waiting', 'done']),
  summary: z.string().min(4).max(220),
  nextAction: z.string().min(4).max(260),
  decisionLabel: z.string().max(140).nullable(),
  researchQuery: z.string().max(500).nullable(),
  plan: z.array(stepSchema).min(2).max(6),
});

const researchSynthesisSchema = z.object({
  kind: z.enum(['needs_user', 'progress', 'waiting', 'done']),
  summary: z.string().min(4).max(220),
  nextAction: z.string().min(4).max(260),
  decisionLabel: z.string().max(140).nullable(),
  resultTitle: z.string().min(3).max(100),
  resultBody: z.string().min(8).max(1800),
  plan: z.array(stepSchema).min(2).max(6),
});

const nextStepJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: { type: 'string', enum: ['needs_user', 'research', 'progress', 'waiting', 'done'] },
    summary: { type: 'string' },
    nextAction: { type: 'string' },
    decisionLabel: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    researchQuery: { anyOf: [{ type: 'string' }, { type: 'null' }] },
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
  required: ['kind', 'summary', 'nextAction', 'decisionLabel', 'researchQuery', 'plan'],
} as const;

const researchSynthesisJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: { type: 'string', enum: ['needs_user', 'progress', 'waiting', 'done'] },
    summary: { type: 'string' },
    nextAction: { type: 'string' },
    decisionLabel: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    resultTitle: { type: 'string' },
    resultBody: { type: 'string' },
    plan: nextStepJsonSchema.properties.plan,
  },
  required: ['kind', 'summary', 'nextAction', 'decisionLabel', 'resultTitle', 'resultBody', 'plan'],
} as const;

type NextStep = z.infer<typeof nextStepSchema>;
type ResearchSynthesis = z.infer<typeof researchSynthesisSchema>;

type AppliedKind = Exclude<NextStep['kind'], 'research'>;

export type CarryRunResult =
  | { kind: 'needs_user'; nextAction: string; decisionLabel: string | null }
  | { kind: 'progress'; nextAction: string }
  | { kind: 'waiting'; nextAction: string }
  | { kind: 'done'; nextAction: string };

type CaseSnapshot = {
  id: string;
  title: string;
  outcome: string;
  summary: string;
  state: string;
  domain: string;
  sourceText: string;
  nextAction: string | null;
  decision: unknown;
  plan: unknown;
  events: Array<{ type: string; actor: string; label: string; payload: unknown }>;
};

const RUNNER_SYSTEM = `You are Carry's bounded case runner. Choose exactly one useful next step.
Carry is not a to-do list: it should do work itself whenever it safely can.
Use needs_user only when a specific missing fact or decision genuinely blocks progress.
Use research when current web evidence, local providers, products, public information or live facts would materially advance the case.
Use progress only for useful work that does not require web research and can be honestly completed from the case context.
Use waiting only for a real external condition already in motion. Use done only when the outcome is actually verified.
Never claim that Carry booked, bought, sent, called or otherwise acted externally unless the case events contain evidence that action happened.
For household services, once location/building details are available, research providers rather than asking the user to do the research.
For purchases, once requirements are adequate, research options rather than asking the user to browse.
Keep the plan small, ordered and honest. Unless the case is done, exactly one plan step should be active. Earlier completed steps should be done and later steps should be todo.`;

function normalisePlan(plan: PlanStep[], kind: AppliedKind): PlanStep[] {
  const copy = plan.map((step) => ({ ...step }));
  if (kind === 'done') return copy.map((step) => ({ ...step, state: 'done' as const }));

  const activeIndexes = copy.flatMap((step, index) => step.state === 'active' ? [index] : []);
  if (activeIndexes.length > 1) {
    const keep = activeIndexes.at(-1)!;
    return copy.map((step, index) => {
      if (step.state !== 'active' || index === keep) return step;
      return { ...step, state: index < keep ? 'done' as const : 'todo' as const };
    });
  }

  if (activeIndexes.length === 1) return copy;

  const firstTodo = copy.findIndex((step) => step.state === 'todo');
  if (firstTodo >= 0) {
    return copy.map((step, index) => index === firstTodo ? { ...step, state: 'active' as const } : step);
  }

  const lastIndex = copy.length - 1;
  return copy.map((step, index) => index === lastIndex ? { ...step, state: 'active' as const } : step);
}

function withStepIds(plan: PlanStep[]) {
  return plan.map((step, index) => ({ ...step, id: `step-${index + 1}` }));
}

function snapshotText(snapshot: CaseSnapshot) {
  const events = snapshot.events.slice(-12).map((event) => ({
    type: event.type,
    actor: event.actor,
    label: event.label,
    payload: event.payload,
  }));

  return JSON.stringify({
    title: snapshot.title,
    outcome: snapshot.outcome,
    summary: snapshot.summary,
    domain: snapshot.domain,
    sourceText: snapshot.sourceText,
    currentState: snapshot.state,
    currentNextAction: snapshot.nextAction,
    decision: snapshot.decision,
    plan: snapshot.plan,
    recentEvents: events,
  }, null, 2).slice(0, 14000);
}

async function chooseNextStep(snapshot: CaseSnapshot): Promise<NextStep> {
  const data = await createOpenAIResponse({
    model: getCaseModel(),
    instructions: RUNNER_SYSTEM,
    input: snapshotText(snapshot),
    max_output_tokens: 1000,
    text: {
      format: {
        type: 'json_schema',
        name: 'carry_next_step',
        strict: true,
        schema: nextStepJsonSchema,
      },
    },
  });

  const text = getOpenAIOutputText(data);
  if (!text) throw new Error('Carry runner returned no structured next step');
  return nextStepSchema.parse(JSON.parse(text));
}

async function synthesiseResearch(snapshot: CaseSnapshot, research: ResearchResult): Promise<ResearchSynthesis> {
  const sourceList = research.sources.map((source, index) => `${index + 1}. ${source.title ?? source.url} — ${source.url}`).join('\n');
  const data = await createOpenAIResponse({
    model: getCaseModel(),
    instructions: `You are Carry. Turn grounded research into the next operational case state.
Only make factual claims supported by the research text and source list supplied below.
Respect the user's stated location and exclude evidence for same-named places in other countries.
For a shortlist or recommendation, make the useful comparison now, then ask for one concrete choice only if the next consequential action requires approval.
Do not invent ratings, prices, availability, contact details or actions. Distinguish indicative local price guides from provider-specific prices.
Never claim an external booking, purchase, message or call occurred.
Keep resultBody concise enough for a mobile screen and explain why the options are useful.
Unless the case is done, return exactly one active plan step.`,
    input: `CASE\n${snapshotText(snapshot)}\n\nRESEARCH\n${research.text}\n\nSOURCES\n${sourceList || 'No source URLs were returned.'}`,
    max_output_tokens: 1500,
    text: {
      format: {
        type: 'json_schema',
        name: 'carry_research_result',
        strict: true,
        schema: researchSynthesisJsonSchema,
      },
    },
  });

  const text = getOpenAIOutputText(data);
  if (!text) throw new Error('Carry research synthesis returned no structured output');
  return researchSynthesisSchema.parse(JSON.parse(text));
}

async function loadSnapshot(caseId: string, ownerKey: string): Promise<CaseSnapshot | null> {
  const sql = getSql();
  const [item] = await sql`
    SELECT id, title, outcome, summary, state, domain, source_text, next_action, decision, plan
    FROM carry_cases
    WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
    LIMIT 1
  `;
  if (!item) return null;

  const events = await sql`
    SELECT type, actor, label, payload
    FROM carry_case_events
    WHERE case_id = ${caseId}::uuid
    ORDER BY created_at ASC
  `;

  return {
    id: item.id,
    title: item.title,
    outcome: item.outcome,
    summary: item.summary,
    state: item.state,
    domain: item.domain,
    sourceText: item.source_text ?? '',
    nextAction: item.next_action ?? null,
    decision: item.decision ?? null,
    plan: item.plan ?? [],
    events: events.map((event) => ({
      type: event.type,
      actor: event.actor,
      label: event.label,
      payload: event.payload ?? {},
    })),
  };
}

function stateFor(kind: AppliedKind) {
  if (kind === 'needs_user') return 'needs_user';
  if (kind === 'waiting') return 'waiting';
  if (kind === 'done') return 'done';
  return 'carrying';
}

async function applyResult(
  caseId: string,
  result: Pick<NextStep, 'kind' | 'summary' | 'nextAction' | 'decisionLabel' | 'plan'> | ResearchSynthesis,
) {
  if (result.kind === 'research') throw new Error('Research must be completed before applying a case result');
  const sql = getSql();
  const kind: AppliedKind = result.kind;
  const state = stateFor(kind);
  const decision = kind === 'needs_user' && result.decisionLabel ? { label: result.decisionLabel } : null;
  const plan = withStepIds(normalisePlan(result.plan, kind));

  await sql`
    UPDATE carry_cases
    SET summary = ${result.summary}, state = ${state}::carry_case_state, next_action = ${result.nextAction},
        decision = ${decision ? JSON.stringify(decision) : null}::jsonb, plan = ${JSON.stringify(plan)}::jsonb,
        updated_at = now(), completed_at = ${state === 'done' ? new Date().toISOString() : null}
    WHERE id = ${caseId}::uuid
  `;

  if (kind === 'needs_user' && result.decisionLabel) {
    await sql`
      INSERT INTO carry_case_events (case_id, type, actor, label, payload)
      VALUES (${caseId}::uuid, 'decision_requested', 'carry', ${result.decisionLabel}, '{}'::jsonb)
    `;
  } else if (kind === 'waiting') {
    await sql`
      INSERT INTO carry_case_events (case_id, type, actor, label, payload)
      VALUES (${caseId}::uuid, 'waiting_started', 'carry', ${result.nextAction}, '{}'::jsonb)
    `;
  } else if (kind === 'done') {
    await sql`
      INSERT INTO carry_case_events (case_id, type, actor, label, payload)
      VALUES (${caseId}::uuid, 'case_completed', 'carry', ${result.summary}, '{}'::jsonb)
    `;
  }
}

function publicResult(result: Exclude<NextStep, { kind: 'research' }> | ResearchSynthesis): CarryRunResult {
  if (result.kind === 'needs_user') return { kind: 'needs_user', nextAction: result.nextAction, decisionLabel: result.decisionLabel };
  if (result.kind === 'waiting') return { kind: 'waiting', nextAction: result.nextAction };
  if (result.kind === 'done') return { kind: 'done', nextAction: result.nextAction };
  return { kind: 'progress', nextAction: result.nextAction };
}

export async function runCase(caseId: string, ownerKey: string): Promise<CarryRunResult> {
  const snapshot = await loadSnapshot(caseId, ownerKey);
  if (!snapshot) throw new Error('Case not found');

  if (snapshot.state === 'needs_user') {
    return { kind: 'needs_user', nextAction: snapshot.nextAction ?? 'Carry needs your input.', decisionLabel: typeof snapshot.decision === 'object' && snapshot.decision && 'label' in snapshot.decision ? String((snapshot.decision as { label?: unknown }).label ?? '') : null };
  }
  if (snapshot.state === 'waiting') return { kind: 'waiting', nextAction: snapshot.nextAction ?? 'Carry is waiting.' };
  if (snapshot.state === 'done') return { kind: 'done', nextAction: snapshot.nextAction ?? 'This case is complete.' };

  const sql = getSql();
  await sql`
    INSERT INTO carry_case_events (case_id, type, actor, label, payload)
    VALUES (${caseId}::uuid, 'action_started', 'carry', 'Started the next bounded case run', '{}'::jsonb)
  `;

  try {
    const next = await chooseNextStep(snapshot);

    if (next.kind !== 'research') {
      await applyResult(caseId, next);
      await sql`
        INSERT INTO carry_case_events (case_id, type, actor, label, payload)
        VALUES (${caseId}::uuid, 'action_completed', 'carry', ${next.summary}, ${JSON.stringify({ kind: next.kind })}::jsonb)
      `;
      return publicResult(next);
    }

    if (!next.researchQuery?.trim()) throw new Error('Carry selected research without a research query');

    const research = await researchWeb(next.researchQuery, snapshotText(snapshot));
    await sql`
      INSERT INTO carry_case_events (case_id, type, actor, label, payload)
      VALUES (
        ${caseId}::uuid, 'research_completed', 'carry', 'Researched current options and evidence',
        ${JSON.stringify({ query: research.query, text: research.text, sources: research.sources })}::jsonb
      )
    `;

    const synthesis = await synthesiseResearch(snapshot, research);
    await applyResult(caseId, synthesis);
    await sql`
      INSERT INTO carry_case_events (case_id, type, actor, label, payload)
      VALUES (
        ${caseId}::uuid, 'action_completed', 'carry', ${synthesis.resultTitle},
        ${JSON.stringify({ kind: synthesis.kind, body: synthesis.resultBody, sources: research.sources })}::jsonb
      )
    `;
    return publicResult(synthesis);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Carry run error';
    console.error('case_run_failed', { caseId, message, error });
    await sql`
      INSERT INTO carry_case_events (case_id, type, actor, label, payload)
      VALUES (${caseId}::uuid, 'action_failed', 'carry', 'The next Carry run failed and can be retried', ${JSON.stringify({ error: message })}::jsonb)
    `;
    await sql`
      UPDATE carry_cases
      SET state = 'carrying', next_action = 'Carry hit a problem while working on this. Retry the case run.', updated_at = now()
      WHERE id = ${caseId}::uuid
    `;
    throw error;
  }
}
