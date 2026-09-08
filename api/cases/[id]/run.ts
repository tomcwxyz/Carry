import { runCase } from '../../../src/server/action-engine';

export default async function handler(request: Request) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  const id = parts.at(-2);
  if (!id) return Response.json({ error: 'Case id is required' }, { status: 400 });

  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  try {
    const result = await runCase(id, ownerKey, { trigger: 'user', maxSteps: 2 });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Carry run failed' }, { status: 500 });
  }
}
