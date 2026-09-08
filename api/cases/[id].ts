import { getSql } from '../../src/server/db';

export default async function handler(request: Request) {
  if (request.method !== 'GET') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const id = new URL(request.url).pathname.split('/').filter(Boolean).at(-1);
  if (!id) return Response.json({ error: 'Case id is required' }, { status: 400 });

  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  const sql = getSql();
  const [item] = await sql`SELECT id, title, outcome, summary, state, domain, space_key, next_action, decision, plan FROM carry_cases WHERE id = ${id}::uuid AND owner_key = ${ownerKey} LIMIT 1`;
  if (!item) return Response.json({ error: 'Case not found' }, { status: 404 });

  const events = await sql`SELECT id, actor, label, created_at FROM carry_case_events WHERE case_id = ${id}::uuid ORDER BY created_at ASC`;
  const [run] = await sql`SELECT id, status, steps_taken, max_steps, stop_reason, started_at, finished_at FROM carry_case_runs WHERE case_id = ${id}::uuid ORDER BY started_at DESC LIMIT 1`;
  const [action] = await sql`SELECT type, status, summary, output FROM carry_actions WHERE case_id = ${id}::uuid ORDER BY created_at DESC LIMIT 1`;

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
    work: run ? {
      status: run.status,
      stepsTaken: run.steps_taken,
      maxSteps: run.max_steps,
      stopReason: run.stop_reason ?? undefined,
      latestAction: action ? {
        type: action.type,
        status: action.status,
        summary: action.summary,
        sources: Array.isArray(action.output?.sources) ? action.output.sources : [],
      } : undefined,
    } : undefined,
    activity: events.map((event) => ({
      id: event.id,
      at: new Date(event.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      actor: event.actor,
      label: event.label,
    })),
  });
}
