import { getSql } from '../../src/server/db.js';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.pathname.split('/').filter(Boolean).at(-1);
  if (!id) return Response.json({ error: 'Case id is required' }, { status: 400 });

  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  const sql = getSql();

  const [item] = await sql`
    SELECT id, title, outcome, summary, state, domain, space_key, next_action, decision, plan, created_at, updated_at
    FROM carry_cases
    WHERE id = ${id}::uuid AND owner_key = ${ownerKey}
    LIMIT 1
  `;

  if (!item) return Response.json({ error: 'Case not found' }, { status: 404 });

  const events = await sql`
    SELECT id, actor, label, created_at
    FROM carry_case_events
    WHERE case_id = ${id}::uuid
    ORDER BY created_at ASC
  `;

  return Response.json({
    id: item.id,
    title: item.title,
    outcome: item.outcome,
    summary: item.summary,
    state: item.state,
    domain: item.domain,
    space: item.space_key === 'personal' ? 'Personal' : item.space_key,
    nextAction: item.next_action,
    decisionLabel: item.decision?.label ?? undefined,
    plan: item.plan ?? [],
    activity: events.map((event) => ({
      id: event.id,
      at: new Date(event.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      actor: event.actor,
      label: event.label,
    })),
  });
}
