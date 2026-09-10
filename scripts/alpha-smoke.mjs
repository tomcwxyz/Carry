const base = (process.env.CARRY_API_URL || 'https://carry-gilt.vercel.app').replace(/\/$/, '');
const owner = process.env.CARRY_SMOKE_OWNER || `alpha-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const prompt = process.argv.slice(2).join(' ').trim() || 'My gutter is blocked';
const responseText = process.env.CARRY_SMOKE_RESPONSE || 'Two-storey house, normal access from the front and rear. Water is not entering the house.';
const expectedDomain = process.env.CARRY_EXPECT_DOMAIN?.trim();
const requireEvidence = process.env.CARRY_REQUIRE_EVIDENCE !== 'false';
const requireActionable = process.env.CARRY_REQUIRE_ACTIONABLE === 'true';
const forbiddenSourcePattern = process.env.CARRY_FORBID_SOURCE_PATTERN?.trim();
const expectLocationHandback = process.env.CARRY_EXPECT_LOCATION_HAND_BACK === 'true';
const smokeLocation = process.env.CARRY_SMOKE_LOCATION ? JSON.parse(process.env.CARRY_SMOKE_LOCATION) : undefined;

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

function validatePlan(item) {
  assert(Array.isArray(item.plan) && item.plan.length >= 2, 'Case has no useful plan');
  const activeCount = item.plan.filter((step) => step.state === 'active').length;
  if (item.state === 'done') {
    assert(activeCount === 0, `Completed case has ${activeCount} active plan steps`);
  } else {
    assert(activeCount === 1, `Expected exactly one active plan step, got ${activeCount}`);
  }
}

function validateEvidence(item) {
  if (!requireEvidence) return;
  assert(Array.isArray(item.evidence) && item.evidence.length > 0, 'Case did not produce grounded research evidence');
  const sourceUrls = item.evidence.flatMap((entry) => Array.isArray(entry.sources) ? entry.sources.map((source) => source.url) : []);
  assert(sourceUrls.length > 0, 'Research evidence has no source URLs');
  if (forbiddenSourcePattern) {
    assert(!sourceUrls.some((url) => String(url).includes(forbiddenSourcePattern)), `Research included forbidden/irrelevant source pattern: ${forbiddenSourcePattern}`);
  }
}

function actionableEvidence(item) {
  if (!Array.isArray(item.evidence)) return undefined;
  return [...item.evidence].reverse().find((entry) => {
    const hasPreparedAction = Boolean(entry?.preparedAction?.body);
    const hasContact = Array.isArray(entry?.options) && entry.options.some((option) => Array.isArray(option.contacts) && option.contacts.length > 0);
    return hasPreparedAction || hasContact;
  });
}

function validateActionable(item) {
  if (!requireActionable) return;
  const evidence = actionableEvidence(item);
  assert(evidence, 'Case did not produce an actionable result');
  assert(Array.isArray(evidence.options) && evidence.options.length > 0 && evidence.options.length <= 3, `Expected 1-3 actionable options, got ${evidence.options?.length ?? 0}`);
  const recommended = evidence.options.find((option) => option.recommended === true);
  assert(recommended, 'Actionable shortlist has no recommended option');
  assert(Array.isArray(recommended.contacts) && recommended.contacts.length > 0, 'Recommended option has no evidence-backed contact route');
  assert(typeof evidence.preparedAction?.body === 'string' && evidence.preparedAction.body.trim().length > 3, 'Actionable shortlist has no prepared enquiry/call brief');
}

async function respond(caseId, item) {
  const inputKind = item.decisionInput?.kind ?? 'text';
  const usesLocation = inputKind === 'location';
  if (usesLocation) assert(smokeLocation, 'Case requested location but CARRY_SMOKE_LOCATION is not configured');
  assert(responseText.trim() || usesLocation, 'Case needs a response but CARRY_SMOKE_RESPONSE is empty');

  const body = usesLocation
    ? { location: smokeLocation, text: responseText.trim() || undefined }
    : { text: responseText };

  console.log(`Hand-back [${inputKind}]: ${item.nextAction}`);
  console.log(`Responding: ${JSON.stringify(body)}`);
  const response = await fetch(`${base}/api/cases/${encodeURIComponent(caseId)}/respond`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-carry-owner': owner,
    },
    body: JSON.stringify(body),
  });
  const responded = await json(response);
  assert(response.ok, `Case response failed with ${response.status}: ${JSON.stringify(responded)}`);
  return usesLocation;
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
  if (expectedDomain) assert(item.domain === expectedDomain, `Expected domain ${expectedDomain}, got ${item.domain}`);
  assert(typeof item.nextAction === 'string' && item.nextAction.length > 3, 'Case has no useful next action');

  let sawLocationHandback = false;
  for (let handback = 0; handback < 3 && item.state === 'needs_user'; handback += 1) {
    // An actionable result is the legitimate human/consequence boundary. The smoke must
    // not pretend to call, email or book by replying with unrelated fixture text.
    if (actionableEvidence(item)) break;
    const usedLocation = await respond(capture.caseId, item);
    sawLocationHandback ||= usedLocation;
    item = await getCase(capture.caseId);
  }

  if (expectLocationHandback) {
    assert(sawLocationHandback, 'Expected a location-specific hand-back, but Carry only requested text');
  }

  assert(Array.isArray(item.activity) && item.activity.length >= 4, 'Case did not record a useful action trail');
  assert(typeof item.nextAction === 'string' && item.nextAction.length > 3, 'Advanced case has no useful next action');
  validatePlan(item);
  validateEvidence(item);
  validateActionable(item);

  console.log('\nPASS');
  console.log(JSON.stringify({
    caseId: item.id,
    title: item.title,
    domain: item.domain,
    state: item.state,
    summary: item.summary,
    nextAction: item.nextAction,
    sawLocationHandback,
    evidence: item.evidence,
    plan: item.plan,
  }, null, 2));
}

main().catch((error) => {
  console.error('\nFAIL');
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
