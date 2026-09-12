import { advanceCase } from '../../../src/server/case-advance.js';
import { executionLifecycleInputSchema, recordExecutionLifecycleEvent } from '../../../src/server/execution-lifecycle.js';

export const maxDuration = 60;

function caseIdFrom(request: Request) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  const casesIndex = parts.indexOf('cases');
  return casesIndex >= 0 ? parts[casesIndex + 1] : undefined;
}

function executorAuthorised(request: Request) {
  const expected = process.env.CARRY_EXECUTOR_SECRET?.trim();
  if (!expected) return { ok: false as const, status: 503, error: 'Carry executor callbacks are not configured' };
  const supplied = request.headers.get('x-carry-executor-secret')?.trim();
  if (!supplied || supplied !== expected) return { ok: false as const, status: 401, error: 'Invalid executor credentials' };
  return { ok: true as const };
}

export async function POST(request: Request) {
  const caseId = caseIdFrom(request);
  if (!caseId) return Response.json({ error: 'Case id is required' }, { status: 400 });

  const auth = executorAuthorised(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const parsed = executionLifecycleInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid executor event' }, { status: 400 });
  }

  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';

  try {
    const lifecycle = await recordExecutionLifecycleEvent(caseId, ownerKey, parsed.data);
    if (!lifecycle.shouldAdvance) return Response.json({ caseId, lifecycle });

    const result = await advanceCase(caseId, ownerKey);
    return Response.json({ caseId, lifecycle, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Carry could not record the executor event';
    const status = message === 'Case not found' ? 404 : message.includes('only resume') ? 409 : 500;
    return Response.json({ error: message }, { status });
  }
}
