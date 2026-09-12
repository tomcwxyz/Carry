import { getSql } from './db.js';
import { runCase, type CarryRunResult } from './case-runner.js';

async function hasStructuredWaiting(caseId: string, ownerKey: string) {
  const sql = getSql();
  const [item] = await sql`
    SELECT waiting
    FROM carry_cases
    WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
    LIMIT 1
  `;
  if (!item?.waiting || typeof item.waiting !== 'object') return false;
  const reason = (item.waiting as Record<string, unknown>).reason;
  return typeof reason === 'string' && Boolean(reason.trim());
}

async function rejectUnsupportedWaiting(caseId: string, ownerKey: string) {
  const sql = getSql();
  await sql`
    UPDATE carry_cases
    SET state = 'carrying', waiting = null,
        next_action = 'Carry is continuing until there is evidence that something external is genuinely in motion.',
        updated_at = now()
    WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
  `;
  await sql`
    INSERT INTO carry_case_events (case_id, type, actor, label, payload)
    VALUES (
      ${caseId}::uuid, 'waiting_rejected', 'carry',
      'Did not enter Waiting without execution evidence',
      ${JSON.stringify({ reason: 'Waiting requires structured external dependency evidence.' })}::jsonb
    )
  `;
}

function reopenPlanForVerification(plan: unknown) {
  if (!Array.isArray(plan) || plan.length === 0) return [];
  const copy = plan.map((step) => step && typeof step === 'object' ? { ...(step as Record<string, unknown>) } : step);
  for (let index = copy.length - 1; index >= 0; index -= 1) {
    const step = copy[index];
    if (!step || typeof step !== 'object') continue;
    (step as Record<string, unknown>).state = 'active';
    break;
  }
  return copy;
}

async function requestCompletionVerification(caseId: string, ownerKey: string): Promise<CarryRunResult> {
  const sql = getSql();
  const [item] = await sql`
    SELECT plan
    FROM carry_cases
    WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
    LIMIT 1
  `;
  if (!item) throw new Error('Case not found');

  const label = 'Is this outcome actually complete?';
  const nextAction = 'Carry thinks this may be finished. Confirm whether the outcome is actually complete.';
  const decision = { label, inputKind: 'completion', askRadius: false };
  const plan = reopenPlanForVerification(item.plan);

  await sql`
    UPDATE carry_cases
    SET state = 'needs_user', next_action = ${nextAction}, decision = ${JSON.stringify(decision)}::jsonb,
        waiting = null, plan = ${JSON.stringify(plan)}::jsonb, completed_at = null, updated_at = now()
    WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
  `;
  await sql`
    INSERT INTO carry_case_events (case_id, type, actor, label, payload)
    VALUES (
      ${caseId}::uuid, 'completion_verification_requested', 'carry', ${label},
      ${JSON.stringify({ inputKind: 'completion', reason: 'Model-proposed completion requires trusted verification.' })}::jsonb
    )
  `;

  return {
    kind: 'needs_user',
    nextAction,
    decisionLabel: label,
    decisionInput: { kind: 'completion', askRadius: false },
  };
}

export async function advanceCase(caseId: string, ownerKey: string, maxRuns = 3): Promise<CarryRunResult> {
  let result: CarryRunResult = { kind: 'progress', nextAction: 'Carry is continuing this case.' };

  for (let attempt = 0; attempt < maxRuns; attempt += 1) {
    result = await runCase(caseId, ownerKey);

    if (result.kind === 'waiting') {
      if (await hasStructuredWaiting(caseId, ownerKey)) return result;
      await rejectUnsupportedWaiting(caseId, ownerKey);
      result = { kind: 'progress', nextAction: 'Carry is continuing this case.' };
      continue;
    }

    if (result.kind === 'done') {
      return requestCompletionVerification(caseId, ownerKey);
    }

    if (result.kind !== 'progress') return result;
  }

  return result;
}
