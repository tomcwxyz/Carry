import { z } from 'zod';

import { getSql } from './db.js';

export const executionLifecycleInputSchema = z.object({
  status: z.enum(['attempted', 'completed', 'failed', 'external_update']),
  executor: z.string().trim().min(2).max(80),
  action: z.string().trim().min(3).max(220),
  summary: z.string().trim().min(3).max(500),
  externalRef: z.string().trim().max(500).optional(),
  waitingFor: z.string().trim().max(500).optional(),
  checkAfter: z.string().datetime({ offset: true }).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ExecutionLifecycleInput = z.infer<typeof executionLifecycleInputSchema>;

export type ExecutionLifecycleResult = {
  caseId: string;
  state: 'carrying' | 'waiting';
  shouldAdvance: boolean;
};

function waitingPayload(input: ExecutionLifecycleInput) {
  return {
    reason: input.waitingFor,
    executor: input.executor,
    action: input.action,
    externalRef: input.externalRef,
    since: new Date().toISOString(),
    checkAfter: input.checkAfter,
  };
}

export async function recordExecutionLifecycleEvent(
  caseId: string,
  ownerKey: string,
  rawInput: unknown,
): Promise<ExecutionLifecycleResult> {
  const input = executionLifecycleInputSchema.parse(rawInput);
  const sql = getSql();

  const [current] = await sql`
    SELECT id, state, waiting
    FROM carry_cases
    WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
    LIMIT 1
  `;
  if (!current) throw new Error('Case not found');

  if (input.status === 'external_update' && current.state !== 'waiting') {
    throw new Error('External updates can only resume a case that is waiting');
  }

  const eventPayload = {
    executor: input.executor,
    action: input.action,
    summary: input.summary,
    externalRef: input.externalRef,
    waitingFor: input.waitingFor,
    checkAfter: input.checkAfter,
    metadata: input.metadata ?? {},
    previousWaiting: input.status === 'external_update' ? current.waiting ?? null : undefined,
  };

  const eventType = input.status === 'attempted'
    ? 'execution_attempted'
    : input.status === 'completed'
      ? 'execution_completed'
      : input.status === 'failed'
        ? 'execution_failed'
        : 'external_update';
  const actor = input.status === 'external_update' ? 'external' : 'carry';

  await sql`
    INSERT INTO carry_case_events (case_id, type, actor, label, payload)
    VALUES (${caseId}::uuid, ${eventType}, ${actor}, ${input.summary}, ${JSON.stringify(eventPayload)}::jsonb)
  `;

  if (input.status === 'attempted') {
    await sql`
      UPDATE carry_cases
      SET state = 'carrying', waiting = null,
          next_action = ${`Carry is carrying out: ${input.action}`}, updated_at = now()
      WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
    `;
    return { caseId, state: 'carrying', shouldAdvance: false };
  }

  if (input.status === 'failed') {
    await sql`
      UPDATE carry_cases
      SET state = 'carrying', waiting = null,
          next_action = ${`The external action failed: ${input.summary}`}, updated_at = now()
      WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
    `;
    return { caseId, state: 'carrying', shouldAdvance: true };
  }

  if (input.status === 'external_update') {
    await sql`
      UPDATE carry_cases
      SET state = 'carrying', waiting = null,
          next_action = ${`Something changed outside Carry: ${input.summary}`}, updated_at = now()
      WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
    `;
    return { caseId, state: 'carrying', shouldAdvance: true };
  }

  if (input.waitingFor?.trim()) {
    const waiting = waitingPayload(input);
    await sql`
      UPDATE carry_cases
      SET state = 'waiting', waiting = ${JSON.stringify(waiting)}::jsonb,
          next_action = ${input.waitingFor}, decision = null, updated_at = now()
      WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
    `;
    await sql`
      INSERT INTO carry_case_events (case_id, type, actor, label, payload)
      VALUES (
        ${caseId}::uuid, 'waiting_started', 'carry', ${input.waitingFor},
        ${JSON.stringify({ ...waiting, basisEvent: 'execution_completed' })}::jsonb
      )
    `;
    return { caseId, state: 'waiting', shouldAdvance: false };
  }

  await sql`
    UPDATE carry_cases
    SET state = 'carrying', waiting = null,
        next_action = ${`External action completed: ${input.summary}`}, updated_at = now()
    WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
  `;
  return { caseId, state: 'carrying', shouldAdvance: true };
}
