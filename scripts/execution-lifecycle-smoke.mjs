const base = (process.env.CARRY_API_URL || 'https://carry-gilt.vercel.app').replace(/\/$/, '');
const secret = process.env.CARRY_EXECUTOR_SECRET;
const owner = `execution-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function call(path, init = {}, executor = false) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'x-carry-owner': owner,
      ...(executor && secret ? { 'x-carry-executor-secret': secret } : {}),
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
  if (!secret) throw new Error('CARRY_EXECUTOR_SECRET is required for the execution lifecycle smoke');
  console.log(`Carry execution lifecycle smoke against ${base}`);

  const created = await call('/api/capture', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'Please help me chase a reply from a supplier.' }),
  });
  assert(typeof created.caseId === 'string', 'Capture returned no case id');
  const id = created.caseId;

  await call(`/api/cases/${encodeURIComponent(id)}/execution`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      status: 'attempted',
      executor: 'smoke-test',
      action: 'send supplier follow-up',
      summary: 'Started sending the supplier follow-up',
    }),
  }, true);

  await call(`/api/cases/${encodeURIComponent(id)}/execution`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      status: 'completed',
      executor: 'smoke-test',
      action: 'send supplier follow-up',
      summary: 'Supplier follow-up sent',
      externalRef: `smoke-message-${Date.now()}`,
      waitingFor: 'Waiting for the supplier to reply',
    }),
  }, true);

  let item = await call(`/api/cases/${encodeURIComponent(id)}`);
  assert(item.state === 'waiting', `Expected waiting after completed external action, got ${item.state}`);
  assert(item.waiting?.reason === 'Waiting for the supplier to reply', 'Structured waiting reason missing');
  assert(item.waiting?.executor === 'smoke-test', 'Waiting executor missing');

  await call(`/api/cases/${encodeURIComponent(id)}/execution`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      status: 'external_update',
      executor: 'smoke-test',
      action: 'supplier reply received',
      summary: 'The supplier replied with an update',
      externalRef: item.waiting?.externalRef,
    }),
  }, true);

  item = await call(`/api/cases/${encodeURIComponent(id)}`);
  assert(item.state !== 'waiting', 'External update did not wake the case');
  assert(!item.waiting, 'Waiting metadata was not cleared after wake');
  assert(Array.isArray(item.activity) && item.activity.some((event) => event.label === 'The supplier replied with an update'), 'External update event missing');

  await call(`/api/cases/${encodeURIComponent(id)}`, { method: 'DELETE' });
  console.log('PASS', { id, stateAfterWake: item.state });
}

main().catch((error) => {
  console.error('FAIL');
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
