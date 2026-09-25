import { z } from 'zod';

import { getSql } from '../../src/server/db.js';

const bodySchema = z.object({
  token: z.string().trim().min(12).max(512),
  platform: z.string().trim().max(40).optional(),
});

export async function POST(request: Request) {
  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'A valid push token is required' }, { status: 400 });
  }

  const sql = getSql();
  await sql`
    INSERT INTO carry_push_devices (owner_key, expo_push_token, platform, enabled, last_seen_at)
    VALUES (${ownerKey}, ${parsed.data.token}, ${parsed.data.platform ?? null}, true, now())
    ON CONFLICT (expo_push_token)
    DO UPDATE SET owner_key = EXCLUDED.owner_key, platform = EXCLUDED.platform, enabled = true, last_seen_at = now()
  `;

  return Response.json({ registered: true });
}

export async function DELETE(request: Request) {
  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: 'A valid push token is required' }, { status: 400 });

  const sql = getSql();
  await sql`
    UPDATE carry_push_devices
    SET enabled = false, last_seen_at = now()
    WHERE owner_key = ${ownerKey} AND expo_push_token = ${parsed.data.token}
  `;

  return Response.json({ registered: false });
}
