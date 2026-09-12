import { z } from 'zod';

import { getSql } from './db.js';

export const outcomeVerificationSchema = z.object({
  verifier: z.string().trim().min(2).max(80),
  summary: z.string().trim().min(3).max(500),
  externalRef: z.string().trim().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type OutcomeVerification = z.infer<typeof outcomeVerificationSchema>;

function completedPlan(plan: unknown) {
  if (!Array.isArray(plan)) return [];
  return plan.map((step) => {
    if (!step || typeof step !== 'object') return step;
    return { ...(step as Record<string, unknown>), state: 'done' };
  });
}

export async function completeCaseByUser(caseId: string, ownerKey: string) {
  const sql = getSql();
  const [item] = await sql`
    SELECT id, state, plan
    FROM carry_cases
    WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
    LIMIT 1
  `;
  if (!item) throw new Error('Case not found');

  const plan = completedPlan(item.plan);
  await sql`
    UPDATE carry_cases
    SET state = 'done', next_action = 'Marked complete by you.', decision = null, waiting = null,
        plan = ${JSON.stringify(plan)}::jsonb, completed_at = now(), updated_at = now()
    WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
  `;

  if (item.state !== 'done') {
    await sql`
      INSERT INTO carry_case_events (case_id, type, actor, label, payload)
      VALUES (${caseId}::uuid, 'case_completed_by_user', 'you', 'Confirmed this outcome is complete', '{}'::jsonb)
    `;
  }

  return { caseId, state: 'done' as const };
}

export async function verifyOutcome(caseId: string, ownerKey: string, rawInput: unknown) {
  const verification = outcomeVerificationSchema.parse(rawInput);
  const sql = getSql();
  const [item] = await sql`
    SELECT id, state, plan
    FROM carry_cases
    WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
    LIMIT 1
  `;
  if (!item) throw new Error('Case not found');

  const plan = completedPlan(item.plan);
  const payload = {
    verifier: verification.verifier,
    summary: verification.summary,
    externalRef: verification.externalRef,
    metadata: verification.metadata ?? {},
  };

  await sql`
    INSERT INTO carry_case_events (case_id, type, actor, label, payload)
    VALUES (${caseId}::uuid, 'outcome_verified', 'external', ${verification.summary}, ${JSON.stringify(payload)}::jsonb)
  `;

  await sql`
    UPDATE carry_cases
    SET state = 'done', summary = ${verification.summary}, next_action = 'Outcome verified.',
        decision = null, waiting = null, plan = ${JSON.stringify(plan)}::jsonb,
        completed_at = now(), updated_at = now()
    WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
  `;

  return { caseId, state: 'done' as const, verification: payload };
}
