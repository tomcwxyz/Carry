const base = (process.env.CARRY_API_URL || 'https://carry-gilt.vercel.app').replace(/\/$/, '');
const owner = process.env.CARRY_SMOKE_OWNER || `alpha-smoke-${Date.now()}`;
const prompt = process.argv.slice(2).join(' ').trim() || 'My gutter is blocked';
const responseText = process.env.CARRY_SMOKE_RESPONSE || 'NE3 5HN, two-storey house, normal access from the front and rear.';

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

async function getCase(caseId) {
  const response = await fetch(`${base}/api/cases/${encodeURIComponent(caseId)}`, {
    headers: { 'x-carry-owner': owner },
  });
  const item = await json(response);
  assert(response.ok, `Case load failed with ${response.status}: ${JSON.stringify(item)}`);
  return item;
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
  assert(capture.degraded !== true, 'Case understanding returned degraded/fallback mode');

  let item = await getCase(capture.caseId);
  assert(item.summary !== 'Carry saved this, but could not analyse it yet.', 'Case understanding fell back instead of succeeding');
  assert(item.domain && item.domain !== 'other', `Expected a useful domain, got ${item.domain}`);
  assert(typeof item.nextAction === 'string' && item.nextAction.length > 3, 'Case has no useful next action');
  assert(Array.isArray(item.plan) && item.plan.length >= 2, 'Case has no useful plan');

  if (item.state === 'needs_user') {
    console.log(`Hand-back: ${item.nextAction}`);
    console.log(`Responding: ${responseText}`);
    const respondResponse = await fetch(`${base}/api/cases/${encodeURIComponent(capture.caseId)}/respond`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-carry-owner': owner,
      },
      body: JSON.stringify({ text: responseText }),
    });
    const responded = await json(respondResponse);
    assert(respondResponse.ok, `Case response failed with ${respondResponse.status}: ${JSON.stringify(responded)}`);
    item = await getCase(capture.caseId);
  }

  assert(Array.isArray(item.activity) && item.activity.length >= 4, 'Case did not record a useful action trail');
  assert(typeof item.nextAction === 'string' && item.nextAction.length > 3, 'Advanced case has no useful next action');

  if (item.domain === 'household') {
    assert(Array.isArray(item.evidence) && item.evidence.length > 0, 'Household case did not produce grounded research evidence after location was supplied');
    assert(item.evidence.some((entry) => Array.isArray(entry.sources) && entry.sources.length > 0), 'Research evidence has no source URLs');
  }

  console.log('\nPASS');
  console.log(JSON.stringify({
    caseId: item.id,
    title: item.title,
    domain: item.domain,
    state: item.state,
    summary: item.summary,
    nextAction: item.nextAction,
    evidence: item.evidence,
    plan: item.plan,
  }, null, 2));
}

main().catch((error) => {
  console.error('\nFAIL');
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
