import { getSql } from '../../../src/server/db.js';

const ratings = new Set(['good', 'mostly', 'missed']);

function caseIdFrom(request: Request) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  return parts.at(-2);
}

export async function POST(request: Request) {
  const id = caseIdFrom(request);
  if (!id) return Response.json({ error: 'Case id is required' }, { status: 400 });
  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  const sql = getSql();

  const body = await request.json() as { rating?: string; note?: string };
  const rating = body.rating?.trim() ?? '';
  const note = body.note?.trim().slice(0, 600) || null;
  if (!ratings.has(rating)) return Response.json({ error: 'Feedback rating is required' }, { status: 400 });

  const [item] = await sql`
    SELECT id FROM carry_cases
    WHERE id = ${id}::uuid AND owner_key = ${ownerKey}
    LIMIT 1
  `;
  if (!item) return Response.json({ error: 'Case not found' }, { status: 404 });

  const label = rating === 'good'
    ? 'Carry handled this well'
    : rating === 'mostly'
      ? 'Carry mostly handled this well'
      : 'Carry missed the mark on this case';

  await sql`
    INSERT INTO carry_case_events (case_id, type, actor, label, payload)
    VALUES (${id}::uuid, 'case_feedback', 'you', ${label}, ${JSON.stringify({ rating, note })}::jsonb)
  `;
  await sql`UPDATE carry_cases SET updated_at = now() WHERE id = ${id}::uuid`;

  return Response.json({ caseId: id, feedback: { rating, note } });
}
