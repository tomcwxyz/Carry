export default function handler(request: Request) {
  if (request.method !== 'GET') {
    return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
  }

  return Response.json({
    ok: true,
    service: 'carry',
    version: '0.1.0-alpha.1',
  });
}
