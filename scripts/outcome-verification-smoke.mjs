const base = (process.env.CARRY_API_URL || 'https://carry-gilt.vercel.app').replace(/\/$/, '');
const secret = process.env.CARRY_EXECUTOR_SECRET;
const owner = `verification-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function call(path, init = {}, verifier = false) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'x-carry-owner': owner,
      ...(verifier && secret ? { 'x-carry-executor-secret': secret } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { throw new Error(`Unreadable response from ${response.url}`); }
  if (!response.ok) throw new Error(`${init.method || 'GET'} ${path} failed ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  if (!secret) throw new Error('CARRY_EXECUTOR_SECRET is required for the outcome verification smoke');
  console.log(`Carry outcome verification smoke against ${base}`);

  const created = await call('/api/capture', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'Track whether the supplier confirms my replacement has shipped.' }),
  });
  assert(typeof created.caseId === 'string', 'Capture returned no case id');
  const id = created.caseId;

  await call(`/api/cases/${encodeURIComponent(id)}/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      verifier: 'smoke-test',
      summary: 'Supplier confirmed the replacement has shipped',
      externalRef: `shipment-${Date.now()}`,
    }),
  }, true);

  const item = await call(`/api/cases/${encodeURIComponent(id)}`);
  assert(item.state === 'done', `Expected done after trusted verification, got ${item.state}`);
  assert(item.nextAction === 'Outcome verified.', `Unexpected next action after verification: ${item.nextAction}`);
  assert(Array.isArray(item.plan) && item.plan.every((step) => step.state === 'done'), 'Verified completion did not close the plan');
  assert(Array.isArray(item.activity) && item.activity.some((event) => event.label === 'Supplier confirmed the replacement has shipped'), 'Outcome verification event missing');

  await call(`/api/cases/${encodeURIComponent(id)}`, { method: 'DELETE' });
  console.log('PASS', { id });
}

main().catch((error) => {
  console.error('FAIL');
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
