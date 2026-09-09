const base = (process.env.CARRY_API_URL || 'https://carry-gilt.vercel.app').replace(/\/$/, '');
const owner = process.env.CARRY_SMOKE_OWNER || `alpha-smoke-${Date.now()}`;
const prompt = process.argv.slice(2).join(' ').trim() || 'I need an outside tap installed';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function json(response) {
  const body = await response.text();
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    throw new Error(`Expected JSON from ${response.url}, got: ${body.slice(0, 300)}`);
  }
}

async function main() {
  console.log(`Carry alpha smoke: ${prompt}`);
  console.log(`API: ${base}`);

  const captureResponse = await fetch(`${base}/api/capture`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-carry-owner': owner,
    },
    body: JSON.stringify({ text: prompt }),
  });
  const capture = await json(captureResponse);
  assert(captureResponse.ok, `Capture failed with ${captureResponse.status}: ${JSON.stringify(capture)}`);
  assert(typeof capture.caseId === 'string' && capture.caseId.length > 0, 'Capture returned no caseId');

  const caseResponse = await fetch(`${base}/api/cases/${encodeURIComponent(capture.caseId)}`, {
    headers: { 'x-carry-owner': owner },
  });
  const item = await json(caseResponse);
  assert(caseResponse.ok, `Case load failed with ${caseResponse.status}: ${JSON.stringify(item)}`);
  assert(item.summary !== 'Carry saved this, but could not analyse it yet.', 'Case understanding fell back instead of succeeding');
  assert(item.domain && item.domain !== 'other', `Expected a useful domain, got ${item.domain}`);
  assert(typeof item.nextAction === 'string' && item.nextAction.length > 3, 'Case has no useful next action');
  assert(Array.isArray(item.plan) && item.plan.length >= 2, 'Case has no useful plan');
  assert(Array.isArray(item.activity) && item.activity.length >= 2, 'Case has no case event trail');

  console.log('\nPASS');
  console.log(JSON.stringify({
    caseId: item.id,
    title: item.title,
    domain: item.domain,
    state: item.state,
    summary: item.summary,
    nextAction: item.nextAction,
    plan: item.plan,
  }, null, 2));
}

main().catch((error) => {
  console.error('\nFAIL');
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
