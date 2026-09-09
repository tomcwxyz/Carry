import { runCase } from '../../../src/server/case-runner.js';
import { getSql } from '../../../src/server/db.js';

export const maxDuration = 60;

function caseIdFrom(request: Request) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  const casesIndex = parts.indexOf('cases');
  return casesIndex >= 0 ? parts[casesIndex + 1] : undefined;
}

export async function POST(request: Request) {
  const caseId = caseIdFrom(request);
  if (!caseId) return Response.json({ error: 'Case id is required' }, { status: 400 });

  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  const body = await request.json() as { text?: string };
  const text = body.text?.trim() ?? '';
  if (!text) return Response.json({ error: 'A response is required' }, { status: 400 });

  const sql = getSql();
  const [updated] = await sql`
    UPDATE carry_cases
    SET state = 'carrying', decision = null, next_action = 'Carry is continuing with the information you supplied.', updated_at = now()
    WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
    RETURNING id
  `;
  if (!updated?.id) return Response.json({ error: 'Case not found' }, { status: 404 });

  await sql`
    INSERT INTO carry_case_events (case_id, type, actor, label, payload)
    VALUES (${caseId}::uuid, 'decision_made', 'you', 'Gave Carry the information it needed', ${JSON.stringify({ text })}::jsonb)
  `;

  try {
    const result = await runCase(caseId, ownerKey);
    return Response.json({ caseId, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Carry could not continue this case';
    return Response.json({ error: message, caseId, saved: true }, { status: 500 });
  }
}
