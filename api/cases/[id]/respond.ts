import { z } from 'zod';

import { advanceCase } from '../../../src/server/case-advance.js';
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
}).refine((value) => Boolean(value.text?.trim()) || Boolean(value.location), {
  message: 'A response or location is required',
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

export async function POST(request: Request) {
  const caseId = caseIdFrom(request);
  if (!caseId) return Response.json({ error: 'Case id is required' }, { status: 400 });

  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  const parsed = responseBodySchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'A response is required' }, { status: 400 });

  const { location } = parsed.data;
  const extraText = parsed.data.text?.trim() ?? '';
  const text = [location ? locationText(location) : '', extraText].filter(Boolean).join('. ');

  const sql = getSql();
  const [updated] = await sql`
    UPDATE carry_cases
    SET state = 'carrying', decision = null, next_action = 'Carry is continuing with the information you supplied.', updated_at = now()
    WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
    RETURNING id
  `;
  if (!updated?.id) return Response.json({ error: 'Case not found' }, { status: 404 });

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
  } : { text };

  await sql`
    INSERT INTO carry_case_events (case_id, type, actor, label, payload)
    VALUES (
      ${caseId}::uuid, 'decision_made', 'you',
      ${location ? 'Shared a location with Carry' : 'Gave Carry the information it needed'},
      ${JSON.stringify(eventPayload)}::jsonb
    )
  `;

  try {
    const result = await advanceCase(caseId, ownerKey);
    return Response.json({ caseId, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Carry could not continue this case';
    return Response.json({ error: message, caseId, saved: true }, { status: 500 });
  }
}
