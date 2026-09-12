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

    if (result.kind !== 'progress') return result;
  }

  return result;
}
