import { outcomeVerificationSchema, verifyOutcome } from '../../../src/server/case-completion.js';

function caseIdFrom(request: Request) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  const casesIndex = parts.indexOf('cases');
  return casesIndex >= 0 ? parts[casesIndex + 1] : undefined;
}

function verifierAuthorised(request: Request) {
  const expected = process.env.CARRY_EXECUTOR_SECRET?.trim();
  if (!expected) return { ok: false as const, status: 503, error: 'Carry verifier callbacks are not configured' };
  const supplied = request.headers.get('x-carry-executor-secret')?.trim();
  if (!supplied || supplied !== expected) return { ok: false as const, status: 401, error: 'Invalid verifier credentials' };
  return { ok: true as const };
}

export async function POST(request: Request) {
  const caseId = caseIdFrom(request);
  if (!caseId) return Response.json({ error: 'Case id is required' }, { status: 400 });

  const auth = verifierAuthorised(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const parsed = outcomeVerificationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid outcome verification' }, { status: 400 });
  }

  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  try {
    return Response.json(await verifyOutcome(caseId, ownerKey, parsed.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Carry could not verify this outcome';
    return Response.json({ error: message }, { status: message === 'Case not found' ? 404 : 500 });
  }
}
