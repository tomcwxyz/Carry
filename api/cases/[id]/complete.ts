import { getSql } from '../../../src/server/db.js';

function caseIdFrom(request: Request) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  return parts.at(-2);
}

export async function POST(request: Request) {
  const id = caseIdFrom(request);
  if (!id) return Response.json({ error: 'Case id is required' }, { status: 400 });
  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  const sql = getSql();

  const [item] = await sql`
    SELECT id, state, plan
    FROM carry_cases
    WHERE id = ${id}::uuid AND owner_key = ${ownerKey}
    LIMIT 1
  `;
  if (!item) return Response.json({ error: 'Case not found' }, { status: 404 });

  const plan = Array.isArray(item.plan)
    ? item.plan.map((step: unknown) => {
        if (!step || typeof step !== 'object') return step;
        return { ...(step as Record<string, unknown>), state: 'done' };
      })
    : [];

  await sql`
    UPDATE carry_cases
    SET state = 'done', next_action = 'Marked complete by you.', decision = null, waiting = null,
        plan = ${JSON.stringify(plan)}::jsonb, completed_at = now(), updated_at = now()
    WHERE id = ${id}::uuid AND owner_key = ${ownerKey}
  `;

  if (item.state !== 'done') {
    await sql`
      INSERT INTO carry_case_events (case_id, type, actor, label, payload)
      VALUES (${id}::uuid, 'case_completed_by_user', 'you', 'Marked this case complete', '{}'::jsonb)
    `;
  }

  return Response.json({ caseId: id, state: 'done' });
}
