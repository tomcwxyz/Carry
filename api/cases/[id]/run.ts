import { runCase } from '../../../src/server/case-runner.js';

export const maxDuration = 60;

function caseIdFrom(request: Request) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  const casesIndex = parts.indexOf('cases');
  return casesIndex >= 0 ? parts[casesIndex + 1] : undefined;
}

export async function POST(request: Request) {
  const caseId = caseIdFrom(request);
  if (!caseId) return Response.json({ error: 'Case id is required' }, { status: 400 });

  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  try {
    const result = await runCase(caseId, ownerKey);
    return Response.json({ caseId, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Carry could not run this case';
    const status = message === 'Case not found' ? 404 : 500;
    return Response.json({ error: message, caseId }, { status });
  }
}
