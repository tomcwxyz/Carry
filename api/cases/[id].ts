import { advanceCase } from '../../src/server/case-advance.js';
import { understandCase } from '../../src/server/case-understanding.js';
import { formatLearningSignals, getOwnerLearningSignals } from '../../src/server/case-learning.js';
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

function normaliseContacts(value: unknown) {
  if (!Array.isArray(value)) return [];
  const validKinds = new Set(['phone', 'email', 'website', 'contact_form']);
  return value.flatMap((contact) => {
    if (!contact || typeof contact !== 'object') return [];
    const item = contact as Record<string, unknown>;
    const kind = String(item.kind ?? '').trim();
    const label = String(item.label ?? '').trim();
    const contactValue = String(item.value ?? '').trim();
    const sourceUrl = String(item.sourceUrl ?? '').trim();
    if (!validKinds.has(kind) || !contactValue || !sourceUrl) return [];
    return [{ kind, label: label || kind, value: contactValue, sourceUrl }];
  }).slice(0, 5);
}

function normaliseOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((option) => {
    if (!option || typeof option !== 'object') return [];
    const item = option as Record<string, unknown>;
    const name = String(item.name ?? '').trim();
    const summary = String(item.summary ?? '').trim();
    if (!name || !summary) return [];
    const reason = typeof item.reason === 'string' && item.reason.trim() ? item.reason.trim() : null;
    const location = typeof item.location === 'string' && item.location.trim() ? item.location.trim() : null;
    return [{
      name,
      summary,
      reason,
      recommended: item.recommended === true,
      location,
      contacts: normaliseContacts(item.contacts),
    }];
  }).slice(0, 3);
}

function normalisePreparedAction(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const action = value as Record<string, unknown>;
  const label = String(action.label ?? '').trim();
  const body = String(action.body ?? '').trim();
  if (!label || !body) return null;
  const subject = typeof action.subject === 'string' && action.subject.trim() ? action.subject.trim() : null;
  return { label, subject, body };
}

function resultKindFrom(value: unknown, options: ReturnType<typeof normaliseOptions>) {
  if (value === 'summary' || value === 'shortlist' || value === 'comparison' || value === 'answer') return value;
  return options.length > 0 ? 'shortlist' : 'summary';
}

function decisionInputFrom(value: unknown, nextAction: unknown, domain: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const decision = value as Record<string, unknown>;

  if (decision.inputKind === 'location') return { kind: 'location', askRadius: decision.askRadius === true } as const;
  if (decision.inputKind === 'text') return { kind: 'text', askRadius: false } as const;

  const copy = `${String(decision.label ?? '')} ${String(nextAction ?? '')}`.toLowerCase();
  const locationSpecific = /\b(postcode|postal code|location|address|town|city|area|where (?:you|the property|it|this))\b/.test(copy);
  if (!locationSpecific) return { kind: 'text', askRadius: false } as const;

  const nearbySearch = /\b(nearby|local|provider|service|contractor|shop|store|venue|restaurant|garage|find|search|options?)\b/.test(copy)
    || domain === 'household';
  return { kind: 'location', askRadius: nearbySearch } as const;
}

function withStepIds(plan: Array<{ label: string; state: 'done' | 'active' | 'todo' }>) {
  return plan.map((step, index) => ({ ...step, id: `step-${index + 1}` }));
}

function requestCaseId(request: Request) {
  return new URL(request.url).pathname.split('/').filter(Boolean).at(-1);
}

export async function GET(request: Request) {
  const id = requestCaseId(request);
  if (!id) return Response.json({ error: 'Case id is required' }, { status: 400 });

  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  const sql = getSql();

  const [item] = await sql`
    SELECT id, title, outcome, summary, state, domain, space_key, source_text, next_action, decision, plan, created_at, updated_at
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

  const lastResetIndex = events.reduce((latest, event, index) => {
    const payload = event.payload && typeof event.payload === 'object' ? event.payload as Record<string, unknown> : {};
    return event.type === 'case_edited' && payload.resetsWork === true ? index : latest;
  }, -1);
  const currentEvents = events.slice(lastResetIndex + 1);

  const evidence = currentEvents.flatMap((event) => {
    const payload = event.payload && typeof event.payload === 'object' ? event.payload as Record<string, unknown> : {};
    if (event.type !== 'action_completed' || typeof payload.body !== 'string' || !payload.body.trim()) return [];
    const options = normaliseOptions(payload.options);
    return [{
      id: event.id,
      kind: resultKindFrom(payload.resultKind, options),
      title: event.label,
      body: payload.body.trim(),
      options,
      preparedAction: normalisePreparedAction(payload.preparedAction),
      sources: normaliseSources(payload.sources),
    }];
  });

  const latestFeedback = [...currentEvents].reverse().find((event) => event.type === 'case_feedback');
  const feedbackPayload = latestFeedback?.payload && typeof latestFeedback.payload === 'object'
    ? latestFeedback.payload as Record<string, unknown>
    : null;
  const rating = feedbackPayload?.rating;
  const feedback = latestFeedback && (rating === 'good' || rating === 'mostly' || rating === 'missed') ? {
    rating,
    note: typeof feedbackPayload?.note === 'string' && feedbackPayload.note.trim() ? feedbackPayload.note.trim() : undefined,
  } : undefined;

  return Response.json({
    id: item.id,
    title: item.title,
    outcome: item.outcome,
    summary: item.summary,
    state: item.state,
    domain: item.domain,
    space: item.space_key === 'personal' ? 'Personal' : item.space_key,
    sourceText: item.source_text ?? '',
    nextAction: item.next_action,
    decisionLabel: item.decision?.label ?? undefined,
    decisionInput: decisionInputFrom(item.decision, item.next_action, item.domain),
    plan: item.plan ?? [],
    evidence,
    feedback,
    activity: events.map((event) => ({
      id: event.id,
      at: new Date(event.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      actor: event.actor,
      label: event.label,
    })),
  });
}

export async function PATCH(request: Request) {
  const id = requestCaseId(request);
  if (!id) return Response.json({ error: 'Case id is required' }, { status: 400 });
  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  const sql = getSql();

  try {
    const body = await request.json() as { sourceText?: string; title?: string };
    const [current] = await sql`
      SELECT id, title, source_text, domain
      FROM carry_cases
      WHERE id = ${id}::uuid AND owner_key = ${ownerKey}
      LIMIT 1
    `;
    if (!current) return Response.json({ error: 'Case not found' }, { status: 404 });

    const currentSource = String(current.source_text ?? '').trim();
    const sourceText = body.sourceText === undefined ? currentSource : body.sourceText.trim();
    const titleOverride = body.title === undefined ? String(current.title) : body.title.trim();
    if (!sourceText) return Response.json({ error: 'What needs sorting cannot be empty' }, { status: 400 });
    if (!titleOverride) return Response.json({ error: 'Case title cannot be empty' }, { status: 400 });

    const sourceChanged = sourceText !== currentSource;
    const titleChanged = titleOverride !== String(current.title);
    if (!sourceChanged && !titleChanged) return Response.json({ caseId: id, changed: false });

    if (!sourceChanged) {
      await sql`
        UPDATE carry_cases SET title = ${titleOverride.slice(0, 80)}, updated_at = now()
        WHERE id = ${id}::uuid AND owner_key = ${ownerKey}
      `;
      await sql`
        INSERT INTO carry_case_events (case_id, type, actor, label, payload)
        VALUES (${id}::uuid, 'case_edited', 'you', 'Renamed this case', ${JSON.stringify({ resetsWork: false })}::jsonb)
      `;
      return Response.json({ caseId: id, changed: true, reran: false });
    }

    const learningSignals = formatLearningSignals(await getOwnerLearningSignals(ownerKey, id));
    const understood = await understandCase(sourceText, learningSignals);
    const plan = withStepIds(understood.plan);
    const decision = understood.decisionLabel ? {
      label: understood.decisionLabel,
      inputKind: understood.decisionInput?.kind ?? 'text',
      askRadius: understood.decisionInput?.askRadius ?? false,
    } : null;

    await sql`
      UPDATE carry_cases
      SET title = ${body.title === undefined ? understood.title : titleOverride.slice(0, 80)},
          outcome = ${understood.outcome}, summary = ${understood.summary}, state = ${understood.state}::carry_case_state,
          domain = ${understood.domain}::carry_case_domain, source_text = ${sourceText}, next_action = ${understood.nextAction},
          decision = ${decision ? JSON.stringify(decision) : null}::jsonb, waiting = null,
          plan = ${JSON.stringify(plan)}::jsonb, completed_at = null, updated_at = now()
      WHERE id = ${id}::uuid AND owner_key = ${ownerKey}
    `;
    await sql`
      INSERT INTO carry_case_events (case_id, type, actor, label, payload)
      VALUES (
        ${id}::uuid, 'case_edited', 'you', 'Changed what Carry needs to sort',
        ${JSON.stringify({ resetsWork: true, previousSourceText: currentSource, sourceText })}::jsonb
      )
    `;

    if (understood.state === 'needs_user' && understood.decisionLabel) {
      await sql`
        INSERT INTO carry_case_events (case_id, type, actor, label, payload)
        VALUES (
          ${id}::uuid, 'decision_requested', 'carry', ${understood.decisionLabel},
          ${JSON.stringify({ inputKind: decision?.inputKind ?? 'text', askRadius: decision?.askRadius ?? false })}::jsonb
        )
      `;
      return Response.json({ caseId: id, changed: true, reran: true, result: { kind: 'needs_user' } });
    }

    const result = await advanceCase(id, ownerKey);
    return Response.json({ caseId: id, changed: true, reran: true, result });
  } catch (error) {
    console.error('case_edit_failed', { id, error });
    return Response.json({ error: error instanceof Error ? error.message : 'Carry could not update this case' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const id = requestCaseId(request);
  if (!id) return Response.json({ error: 'Case id is required' }, { status: 400 });
  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  const sql = getSql();
  const [deleted] = await sql`
    DELETE FROM carry_cases
    WHERE id = ${id}::uuid AND owner_key = ${ownerKey}
    RETURNING id
  `;
  if (!deleted) return Response.json({ error: 'Case not found' }, { status: 404 });
  return Response.json({ deleted: true, caseId: id });
}
