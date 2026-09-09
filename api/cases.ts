import { getSql } from '../src/server/db.js';

export async function GET(request: Request) {
  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  const sql = getSql();

  const rows = await sql`
    SELECT id, title, outcome, summary, state, domain, space_key, next_action, decision, plan, created_at, updated_at
    FROM carry_cases
    WHERE owner_key = ${ownerKey}
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 100
  `;

  return Response.json({
    cases: rows.map((item) => ({
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
      activity: [],
      evidence: [],
    })),
  });
}
