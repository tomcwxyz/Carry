const base = (process.env.CARRY_API_URL || 'https://carry-gilt.vercel.app').replace(/\/$/, '');
const owner = `lifecycle-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function json(response) {
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { throw new Error(`Unreadable response from ${response.url}`); }
  return { response, body };
}

async function call(path, init = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'x-carry-owner': owner, ...(init.headers || {}) },
  });
  const result = await json(response);
  if (!response.ok) throw new Error(`${init.method || 'GET'} ${path} failed ${response.status}: ${JSON.stringify(result.body)}`);
  return result.body;
}

async function main() {
  console.log(`Carry lifecycle smoke against ${base}`);

  const created = await call('/api/capture', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'I need to sort the hall cupboard' }),
  });
  assert(typeof created.caseId === 'string', 'Capture returned no case id');
  const id = created.caseId;

  await call(`/api/cases/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'Sort hall cupboard',
      sourceText: 'I need to sort the hall cupboard before Saturday and donate anything usable I no longer need.',
    }),
  });

  let item = await call(`/api/cases/${encodeURIComponent(id)}`);
  assert(item.title === 'Sort hall cupboard', `Edit did not retain title override: ${item.title}`);
  assert(String(item.sourceText || '').includes('before Saturday'), 'Edited brief was not persisted');
  assert(Array.isArray(item.activity) && item.activity.some((event) => event.label === 'Changed what Carry needs to sort'), 'Edit event missing');

  await call(`/api/cases/${encodeURIComponent(id)}/complete`, { method: 'POST' });
  item = await call(`/api/cases/${encodeURIComponent(id)}`);
  assert(item.state === 'done', `Expected done after manual completion, got ${item.state}`);
  assert(Array.isArray(item.plan) && item.plan.every((step) => step.state === 'done'), 'Manual completion did not close the plan');

  await call(`/api/cases/${encodeURIComponent(id)}/feedback`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rating: 'mostly', note: 'Carry should ask fewer questions on small household jobs.' }),
  });
  item = await call(`/api/cases/${encodeURIComponent(id)}`);
  assert(item.feedback?.rating === 'mostly', 'Feedback was not persisted');
  assert(String(item.feedback?.note || '').includes('fewer questions'), 'Feedback note was not persisted');

  await call(`/api/cases/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const deletedResponse = await fetch(`${base}/api/cases/${encodeURIComponent(id)}`, { headers: { 'x-carry-owner': owner } });
  assert(deletedResponse.status === 404, `Deleted case still loads with ${deletedResponse.status}`);

  console.log('PASS', { id });
}

main().catch((error) => {
  console.error('FAIL');
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
