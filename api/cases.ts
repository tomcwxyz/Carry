import { getSql } from '../src/server/db.js';
import { getCaseEmailExecutionIntent } from '../src/server/email-executor.js';

function decisionInputFrom(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const decision = value as Record<string, unknown>;
  const inputKind = decision.inputKind;
  if (inputKind === 'approval' || inputKind === 'completion' || inputKind === 'location' || inputKind === 'text') {
    return { kind: inputKind, askRadius: inputKind === 'location' && decision.askRadius === true };
  }
  return undefined;
}

function normaliseWaiting(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const waiting = value as Record<string, unknown>;
  const reason = typeof waiting.reason === 'string' ? waiting.reason.trim() : '';
  if (!reason) return undefined;
  const optional = (key: string) => typeof waiting[key] === 'string' && String(waiting[key]).trim()
    ? String(waiting[key]).trim()
    : undefined;
  return {
    reason,
    executor: optional('executor'),
    action: optional('action'),
    externalRef: optional('externalRef'),
    since: optional('since'),
    checkAfter: optional('checkAfter'),
  };
}

export async function GET(request: Request) {
  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  const sql = getSql();

  const rows = await sql`
    SELECT id, title, outcome, summary, state, domain, space_key, next_action, decision, waiting, plan, created_at, updated_at
    FROM carry_cases
    WHERE owner_key = ${ownerKey}
    ORDER BY
      CASE state
        WHEN 'needs_user' THEN 0
        WHEN 'carrying' THEN 1
        WHEN 'waiting' THEN 2
        ELSE 3
      END,
      updated_at DESC,
      created_at DESC
    LIMIT 100
  `;

  const cases = await Promise.all(rows.map(async (item) => {
    const storedDecisionInput = decisionInputFrom(item.decision);
    const emailIntent = item.state === 'needs_user'
      ? await getCaseEmailExecutionIntent(String(item.id), ownerKey)
      : null;
    const decisionInput = emailIntent
      ? { kind: 'approval' as const, askRadius: false }
      : storedDecisionInput;

    return {
      id: item.id,
      title: item.title,
      outcome: item.outcome,
      summary: item.summary,
      state: item.state,
      domain: item.domain,
      space: item.space_key === 'personal' ? 'Personal' : item.space_key,
      nextAction: item.next_action,
      decisionLabel: emailIntent ? `Send this email to ${emailIntent.to}?` : item.decision?.label ?? undefined,
      decisionInput,
      waiting: normaliseWaiting(item.waiting),
      approvalAction: emailIntent ? {
        capability: emailIntent.capability,
        provider: emailIntent.provider,
        label: 'Send email',
        to: emailIntent.to,
        subject: emailIntent.subject,
        body: emailIntent.body,
      } : undefined,
      plan: item.plan ?? [],
      activity: [],
      evidence: [],
    };
  }));

  return Response.json({ cases });
}
