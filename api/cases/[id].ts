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

  if (decision.inputKind === 'location') {
    return { kind: 'location', askRadius: decision.askRadius === true } as const;
  }
  if (decision.inputKind === 'text') return { kind: 'text', askRadius: false } as const;

  // Cases created before location-aware handbacks only stored a label. Keep those usable
  // without turning every free-text decision into a location request.
  const copy = `${String(decision.label ?? '')} ${String(nextAction ?? '')}`.toLowerCase();
  const locationSpecific = /\b(postcode|postal code|location|address|town|city|area|where (?:you|the property|it|this))\b/.test(copy);
  if (!locationSpecific) return { kind: 'text', askRadius: false } as const;

  const nearbySearch = /\b(nearby|local|provider|service|contractor|shop|store|venue|restaurant|garage|find|search|options?)\b/.test(copy)
    || domain === 'household';
  return { kind: 'location', askRadius: nearbySearch } as const;
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
    decisionInput: decisionInputFrom(item.decision, item.next_action, item.domain),
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
