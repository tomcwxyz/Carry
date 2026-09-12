import { z } from 'zod';

import { advanceCase } from '../../../src/server/case-advance.js';
import { completeCaseByUser } from '../../../src/server/case-completion.js';
import { getSql } from '../../../src/server/db.js';

export const maxDuration = 60;

const locationResponseSchema = z.object({
  source: z.enum(['device', 'pin']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMetres: z.number().nonnegative().max(100000).optional(),
  label: z.string().trim().max(220).optional(),
  radiusMiles: z.number().positive().max(100).optional(),
});

const responseBodySchema = z.object({
  text: z.string().trim().max(1200).optional(),
  location: locationResponseSchema.optional(),
  approval: z.enum(['approve', 'decline']).optional(),
  completion: z.enum(['confirm', 'not_yet']).optional(),
}).refine((value) => Boolean(value.text?.trim()) || Boolean(value.location) || Boolean(value.approval) || Boolean(value.completion), {
  message: 'A response, location, approval or completion decision is required',
});

function caseIdFrom(request: Request) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  const casesIndex = parts.indexOf('cases');
  return casesIndex >= 0 ? parts[casesIndex + 1] : undefined;
}

function roundedCoordinate(value: number) {
  return Math.round(value * 10000) / 10000;
}

function locationText(location: z.infer<typeof locationResponseSchema>) {
  const latitude = roundedCoordinate(location.latitude);
  const longitude = roundedCoordinate(location.longitude);
  const parts = [
    location.label?.trim()
      ? `Location: ${location.label.trim()} (${latitude}, ${longitude})`
      : `Location: ${latitude}, ${longitude}`,
  ];
  if (typeof location.radiusMiles === 'number') parts.push(`Search radius: ${location.radiusMiles} miles`);
  if (typeof location.accuracyMetres === 'number') parts.push(`Device accuracy: about ${Math.round(location.accuracyMetres)} metres`);
  return parts.join('. ');
}

function decisionInputKind(value: unknown) {
  if (!value || typeof value !== 'object') return 'text';
  const inputKind = (value as Record<string, unknown>).inputKind;
  return inputKind === 'location' || inputKind === 'approval' || inputKind === 'completion' ? inputKind : 'text';
}

function decisionLabel(value: unknown) {
  if (!value || typeof value !== 'object') return '';
  const label = (value as Record<string, unknown>).label;
  return typeof label === 'string' ? label.trim() : '';
}

export async function POST(request: Request) {
  const caseId = caseIdFrom(request);
  if (!caseId) return Response.json({ error: 'Case id is required' }, { status: 400 });

  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  const parsed = responseBodySchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'A response is required' }, { status: 400 });

  const sql = getSql();
  const [current] = await sql`
    SELECT id, state, decision
    FROM carry_cases
    WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
    LIMIT 1
  `;
  if (!current) return Response.json({ error: 'Case not found' }, { status: 404 });

  const expectedInput = decisionInputKind(current.decision);
  const { location, approval, completion } = parsed.data;
  const extraText = parsed.data.text?.trim() ?? '';

  if (expectedInput === 'approval' && !approval) {
    return Response.json({ error: 'This hand-back needs an explicit approval or decline' }, { status: 400 });
  }
  if (expectedInput === 'completion' && !completion) {
    return Response.json({ error: 'This hand-back needs an explicit completion decision' }, { status: 400 });
  }
  if (approval && expectedInput !== 'approval') {
    return Response.json({ error: 'This case is not currently waiting for an approval' }, { status: 400 });
  }
  if (completion && expectedInput !== 'completion') {
    return Response.json({ error: 'This case is not currently waiting for completion confirmation' }, { status: 400 });
  }

  if (completion === 'confirm') {
    const completed = await completeCaseByUser(caseId, ownerKey);
    return Response.json({
      caseId,
      result: { kind: 'done', nextAction: 'Outcome confirmed complete by you.' },
      completion: completed,
    });
  }

  const approvalText = approval === 'approve'
    ? `User explicitly approved: ${decisionLabel(current.decision) || 'the proposed action'}`
    : approval === 'decline'
      ? `User declined: ${decisionLabel(current.decision) || 'the proposed action'}`
      : '';
  const completionText = completion === 'not_yet' ? 'User confirmed the outcome is not complete yet' : '';
  const text = [location ? locationText(location) : '', approvalText, completionText, extraText].filter(Boolean).join('. ');

  const nextAction = approval === 'decline'
    ? 'Carry is finding a different route that respects your decision.'
    : completion === 'not_yet'
      ? 'Carry is continuing because the outcome is not complete yet.'
      : 'Carry is continuing with the information you supplied.';

  await sql`
    UPDATE carry_cases
    SET state = 'carrying', decision = null, next_action = ${nextAction}, completed_at = null, updated_at = now()
    WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
  `;

  const eventPayload = location ? {
    text,
    location: {
      source: location.source,
      latitude: roundedCoordinate(location.latitude),
      longitude: roundedCoordinate(location.longitude),
      accuracyMetres: location.accuracyMetres ? Math.round(location.accuracyMetres) : undefined,
      label: location.label?.trim() || undefined,
      radiusMiles: location.radiusMiles,
    },
  } : approval ? {
    text,
    approval,
    decision: current.decision ?? null,
  } : completion ? {
    text,
    completion,
    decision: current.decision ?? null,
  } : { text };

  const eventType = approval === 'approve'
    ? 'approval_granted'
    : approval === 'decline'
      ? 'approval_declined'
      : completion === 'not_yet'
        ? 'completion_not_confirmed'
        : 'decision_made';
  const eventLabel = approval === 'approve'
    ? `Approved: ${decisionLabel(current.decision) || 'Carry action'}`
    : approval === 'decline'
      ? `Declined: ${decisionLabel(current.decision) || 'Carry action'}`
      : completion === 'not_yet'
        ? 'Confirmed this outcome is not complete yet'
        : location
          ? 'Shared a location with Carry'
          : 'Gave Carry the information it needed';

  await sql`
    INSERT INTO carry_case_events (case_id, type, actor, label, payload)
    VALUES (${caseId}::uuid, ${eventType}, 'you', ${eventLabel}, ${JSON.stringify(eventPayload)}::jsonb)
  `;

  try {
    const result = await advanceCase(caseId, ownerKey);
    return Response.json({ caseId, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Carry could not continue this case';
    return Response.json({ error: message, caseId, saved: true }, { status: 500 });
  }
}
