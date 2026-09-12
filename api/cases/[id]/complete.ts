import { completeCaseByUser } from '../../../src/server/case-completion.js';

function caseIdFrom(request: Request) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  return parts.at(-2);
}

export async function POST(request: Request) {
  const id = caseIdFrom(request);
  if (!id) return Response.json({ error: 'Case id is required' }, { status: 400 });
  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';

  try {
    const result = await completeCaseByUser(id, ownerKey);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Carry could not complete this case';
    return Response.json({ error: message }, { status: message === 'Case not found' ? 404 : 500 });
  }
}
