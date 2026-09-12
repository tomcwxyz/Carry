import { z } from 'zod';

import { normaliseResearchSynthesis, researchSynthesisJsonSchema, type ResearchSynthesis } from './actionable-result.js';
import { getCaseModel } from './case-understanding.js';
import { formatLearningSignals, getOwnerLearningSignals } from './case-learning.js';
import { decisionInputJsonSchema, decisionInputSchema, normaliseDecisionInput, type DecisionInput } from './decision-input.js';
import { getSql } from './db.js';
import { createOpenAIResponse, getOpenAIOutputText } from './openai-response.js';
import { researchWeb, type ResearchResult } from './research-worker.js';

const stepStateSchema = z.enum(['done', 'active', 'todo']);
const rawStepSchema = z.object({ label: z.string(), state: stepStateSchema });
const stepSchema = z.object({
  label: z.string().min(3).max(140),
  state: stepStateSchema,
});

type PlanStep = z.infer<typeof stepSchema>;

const rawNextStepSchema = z.object({
  kind: z.enum(['needs_user', 'research', 'progress', 'waiting', 'done']),
  summary: z.string(),
  nextAction: z.string(),
  decisionLabel: z.string().nullable(),
  decisionInput: decisionInputSchema.nullable(),
  researchQuery: z.string().nullable(),
  plan: z.array(rawStepSchema).min(2),
});

const nextStepSchema = z.object({
  kind: z.enum(['needs_user', 'research', 'progress', 'waiting', 'done']),
  summary: z.string().min(4).max(220),
  nextAction: z.string().min(4).max(260),
  decisionLabel: z.string().max(140).nullable(),
  decisionInput: decisionInputSchema.nullable(),
  researchQuery: z.string().max(500).nullable(),
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
    decisionInput: decisionInputJsonSchema,
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
  required: ['kind', 'summary', 'nextAction', 'decisionLabel', 'decisionInput', 'researchQuery', 'plan'],
} as const;

type NextStep = z.infer<typeof nextStepSchema>;
type AppliedKind = Exclude<NextStep['kind'], 'research'>;

export type CarryRunResult =
  | { kind: 'needs_user'; nextAction: string; decisionLabel: string | null; decisionInput: DecisionInput }
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
  learningSignals: string[];
};

const RUNNER_SYSTEM = `You are Carry's bounded case runner. Choose exactly one useful next step.
Carry is not a to-do list: it should do work itself whenever it safely can.
Use needs_user only when a specific missing fact, consequential approval or unavoidable human action genuinely blocks progress.
Use research when current web evidence, local providers, products, public information or live facts would materially advance the case.
Use progress only for useful work that does not require web research and can be honestly completed from the case context.
Use waiting only for a real external condition already in motion. Use done only when the outcome is actually verified.
Never claim that Carry booked, bought, sent, called or otherwise acted externally unless the case events contain evidence that action happened.
For household services and repairs, once location/building details are available, research a small provider shortlist rather than asking the user to do the research. Research should include usable contact routes where evidence supports them.
For purchases, once requirements are adequate, research options rather than asking the user to browse.
If a recent action_completed event already contains a grounded shortlist and prepared contact action, do not research the same thing again. Stop at the human/consequential boundary and make the next action precise.
When kind=needs_user, decisionInput tells the mobile app how to collect the blocking input. Use kind=location only when the user's current/place location is genuinely the missing information. Set askRadius=true only when Carry will search for nearby providers, places or options and the distance matters. Use kind=approval only when Carry is genuinely ready to take one specific consequential external action itself and has an execution capability for that action. Consequential actions include sending or publishing something, making/changing/cancelling a booking, committing money or a purchase, deleting/modifying an external record, changing permissions, or another externally visible or hard-to-reverse side effect. Do not use approval for ordinary facts, preferences, research choices, or actions the user must physically carry out themselves. For every other blocking fact use kind=text. For every non-needs_user result, decisionLabel and decisionInput must be null.
An approval_granted event authorises only the exact proposed action recorded in that event. Approval is not evidence that the action happened. Never move to waiting or done merely because approval was granted; require a later executor/tool event showing the external action actually occurred. If no executor exists for an approved action, say so honestly and hand back the minimum necessary human step rather than pretending it ran.
Recent explicit user feedback may be supplied in the case context. Treat it as soft working preferences only when relevant, especially notes about over-researching, unnecessary interruptions, poor hand-backs or missing action. Do not overgeneralise from unrelated domains and never treat it as factual evidence for the current case.
Keep every field terse. Keep the plan small, ordered and honest. Unless the case is done, exactly one plan step should be active. Earlier completed steps should be done and later steps should be todo.`;

function clip(value: string, max: number) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

function normaliseRawPlan(plan: Array<z.infer<typeof rawStepSchema>>): PlanStep[] {
  return plan.slice(0, 6).map((step) => ({
    label: clip(step.label, 140),
    state: step.state,
  }));
}

function normaliseNextStep(value: unknown): NextStep {
  const raw = rawNextStepSchema.parse(value);
  const hasHandback = raw.kind === 'needs_user' && Boolean(raw.decisionLabel?.trim());
  return nextStepSchema.parse({
    kind: raw.kind,
    summary: clip(raw.summary, 220),
    nextAction: clip(raw.nextAction, 260),
    decisionLabel: hasHandback && raw.decisionLabel ? clip(raw.decisionLabel, 140) : null,
    decisionInput: normaliseDecisionInput(raw.decisionInput, hasHandback),
    researchQuery: raw.kind === 'research' && raw.researchQuery ? clip(raw.researchQuery, 500) : null,
    plan: normaliseRawPlan(raw.plan),
  });
}

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
    recentExplicitUserFeedback: snapshot.learningSignals,
  }, null, 2).slice(0, 14000);
}

async function chooseNextStep(snapshot: CaseSnapshot): Promise<NextStep> {
  const data = await createOpenAIResponse({
    model: getCaseModel(),
    instructions: RUNNER_SYSTEM,
    input: snapshotText(snapshot),
    max_output_tokens: 1800,
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
  return normaliseNextStep(JSON.parse(text));
}

async function synthesiseResearch(snapshot: CaseSnapshot, research: ResearchResult): Promise<ResearchSynthesis> {
  const sourceList = research.sources.map((source, index) => `${index + 1}. ${source.title ?? source.url} — ${source.url}`).join('\n');
  const data = await createOpenAIResponse({
    model: getCaseModel(),
    instructions: `You are Carry. Turn grounded research into an actionable operational result, not a research report.
Only make factual claims supported by the research text and source list supplied below.
Respect the user's stated location and exclude evidence for same-named places in other countries.
For a local-service shortlist, return at most three strong options. Mark at most one as recommended and explain the practical reason it is the best fit.
For each option, include only evidence-backed contact routes from the research: phone, email, official website or contact form. The contact value must be the actual telephone/email/URL and sourceUrl must identify the evidence source. Never infer a phone number or email from a business name.
Prefer the provider's own contact route over a directory when both are available. If no verified route was found, return an empty contacts array rather than inventing one.
For purchase comparisons, use options for the strongest candidates and keep contact arrays empty unless a contact route is genuinely relevant.
Use resultKind=shortlist for providers/places, comparison for products/options, answer for a bounded factual answer, and summary otherwise.
Keep resultBody to a short orientation paragraph; put option-specific detail into options rather than repeating it in prose.
When the case contains enough information to prepare the next enquiry, quote request or call brief, populate preparedAction with a short label, optional subject and ready-to-use body. Preparing text is safe autonomous work: do it without asking permission. preparedAction does not mean anything has been sent.
Do not invent ratings, prices, availability, contact details or actions. Distinguish indicative local price guides from provider-specific prices.
Never claim an external booking, purchase, message or call occurred.
If the next step is an unavoidable human or consequential external action, use kind=needs_user and make nextAction concrete. Use decisionInput.kind=approval only when the case context proves Carry has an execution capability for the exact proposed external action. Otherwise use kind=text and make the human hand-back precise; opening a phone, mail or contact-form route is not the same as Carry sending or booking something itself.
If kind=needs_user, decisionInput kind=location only if a location is still genuinely missing. For non-needs_user results, decisionLabel and decisionInput must be null.
Unless the case is done, return exactly one active plan step.`,
    input: `CASE\n${snapshotText(snapshot)}\n\nRESEARCH\n${research.text}\n\nSOURCES\n${sourceList || 'No source URLs were returned.'}`,
    max_output_tokens: 3600,
    text: {
      format: {
        type: 'json_schema',
        name: 'carry_actionable_research_result',
        strict: true,
        schema: researchSynthesisJsonSchema,
      },
    },
  });

  const text = getOpenAIOutputText(data);
  if (!text) throw new Error('Carry research synthesis returned no structured output');
  return normaliseResearchSynthesis(JSON.parse(text));
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
  const learningSignals = formatLearningSignals(await getOwnerLearningSignals(ownerKey, caseId));

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
    learningSignals,
  };
}

function stateFor(kind: AppliedKind) {
  if (kind === 'needs_user') return 'needs_user';
  if (kind === 'waiting') return 'waiting';
  if (kind === 'done') return 'done';
  return 'carrying';
}

function storedDecisionInput(value: unknown): DecisionInput {
  if (!value || typeof value !== 'object') return { kind: 'text', askRadius: false };
  const decision = value as Record<string, unknown>;
  if (decision.inputKind === 'approval') return { kind: 'approval', askRadius: false };
  if (decision.inputKind === 'location') return { kind: 'location', askRadius: decision.askRadius === true };
  return { kind: 'text', askRadius: false };
}

async function applyResult(
  caseId: string,
  result: Pick<NextStep, 'kind' | 'summary' | 'nextAction' | 'decisionLabel' | 'decisionInput' | 'plan'> | ResearchSynthesis,
) {
  if (result.kind === 'research') throw new Error('Research must be completed before applying a case result');
  const sql = getSql();
  const kind: AppliedKind = result.kind;
  const state = stateFor(kind);
  const decision = kind === 'needs_user' && result.decisionLabel ? {
    label: result.decisionLabel,
    inputKind: result.decisionInput?.kind ?? 'text',
    askRadius: result.decisionInput?.askRadius ?? false,
  } : null;
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
      VALUES (
        ${caseId}::uuid, 'decision_requested', 'carry', ${result.decisionLabel},
        ${JSON.stringify({ inputKind: decision?.inputKind ?? 'text', askRadius: decision?.askRadius ?? false })}::jsonb
      )
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
  if (result.kind === 'needs_user') {
    return {
      kind: 'needs_user',
      nextAction: result.nextAction,
      decisionLabel: result.decisionLabel,
      decisionInput: result.decisionInput ?? { kind: 'text', askRadius: false },
    };
  }
  if (result.kind === 'waiting') return { kind: 'waiting', nextAction: result.nextAction };
  if (result.kind === 'done') return { kind: 'done', nextAction: result.nextAction };
  return { kind: 'progress', nextAction: result.nextAction };
}

export async function runCase(caseId: string, ownerKey: string): Promise<CarryRunResult> {
  const snapshot = await loadSnapshot(caseId, ownerKey);
  if (!snapshot) throw new Error('Case not found');

  if (snapshot.state === 'needs_user') {
    const decisionLabel = typeof snapshot.decision === 'object' && snapshot.decision && 'label' in snapshot.decision
      ? String((snapshot.decision as { label?: unknown }).label ?? '')
      : null;
    return {
      kind: 'needs_user',
      nextAction: snapshot.nextAction ?? 'Carry needs your input.',
      decisionLabel,
      decisionInput: storedDecisionInput(snapshot.decision),
    };
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
        ${JSON.stringify({
          kind: synthesis.kind,
          resultKind: synthesis.resultKind,
          body: synthesis.resultBody,
          options: synthesis.options,
          preparedAction: synthesis.preparedAction,
          sources: research.sources,
        })}::jsonb
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
