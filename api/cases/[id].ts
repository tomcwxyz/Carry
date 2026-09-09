import { getSql } from '../../src/server/db.js';

function normaliseSources(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((source) => {
    if (!source || typeof source !== 'object' || !('url' in source)) return [];
    const url = String((source as { url?: unknown }).url ?? '').trim();
    if (!url) return [];
    const titleValue = (source as { title?: unknown }).title;
    const title = typeof titleValue === 'string' && titleValue.trim() ? titleValue.trim() : undefined;
    return [{ url, title }];
  });
}

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
    SELECT id, type, actor, label, payload, created_at
    FROM carry_case_events
    WHERE case_id = ${id}::uuid
    ORDER BY created_at ASC
  `;

  const evidence = events.flatMap((event) => {
    const payload = event.payload && typeof event.payload === 'object' ? event.payload as Record<string, unknown> : {};
    if (event.type !== 'action_completed' || typeof payload.body !== 'string' || !payload.body.trim()) return [];
    return [{
      id: event.id,
      title: event.label,
      body: payload.body.trim(),
      sources: normaliseSources(payload.sources),
    }];
  });

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
    evidence,
    activity: events.map((event) => ({
      id: event.id,
      at: new Date(event.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      actor: event.actor,
      label: event.label,
    })),
  });
}
