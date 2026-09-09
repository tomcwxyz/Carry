const base = (process.env.CARRY_API_URL || 'https://carry-gilt.vercel.app').replace(/\/$/, '');
const ownerPrefix = process.env.CARRY_GATE_OWNER || `alpha-release-gate-${Date.now()}`;

const textPrompts = [
  'My gutter is blocked',
  'My washing machine is leaking onto the kitchen floor',
  'I need someone to service my boiler',
  'I need to get my car MOT sorted',
  'I need a plumber to replace a dripping outside tap',
  'Help me choose a quiet wireless mechanical keyboard, UK layout, under £100',
  'I need to arrange a birthday cake for Saturday',
  'I need to find a reliable window cleaner',
  'I need to renew my UK passport and work out what I need',
  'I need to get a broken garden fence repaired',
];

const voiceMp3Base64 = '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VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=...';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Expected JSON from ${response.url}, got ${text.slice(0, 240)}`);
  }
}

async function getCase(caseId, owner) {
  const response = await fetch(`${base}/api/cases/${encodeURIComponent(caseId)}`, {
    headers: { 'x-carry-owner': owner },
    signal: AbortSignal.timeout(30_000),
  });
  const item = await readJson(response);
  assert(response.ok, `Case load failed (${response.status}): ${JSON.stringify(item)}`);
  return item;
}

function validateUnderstoodCase(item, label) {
  assert(item && typeof item === 'object', `${label} returned no case`);
  assert(typeof item.title === 'string' && item.title.length >= 2, `${label} has no useful title`);
  assert(typeof item.summary === 'string' && item.summary.length >= 4, `${label} has no useful summary`);
  assert(item.summary !== 'Carry saved this, but could not analyse it yet.', `${label} fell back instead of understanding`);
  assert(typeof item.domain === 'string' && item.domain !== 'other', `${label} returned domain=${item.domain}`);
  assert(Array.isArray(item.plan) && item.plan.length >= 2, `${label} has no useful plan`);
  assert(Array.isArray(item.activity) && item.activity.length >= 2, `${label} has no useful activity trail`);
}

async function captureText(prompt, index) {
  const owner = `${ownerPrefix}-text-${index + 1}`;
  const response = await fetch(`${base}/api/capture`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-carry-owner': owner },
    body: JSON.stringify({ text: prompt }),
    signal: AbortSignal.timeout(75_000),
  });
  const result = await readJson(response);
  assert(response.ok, `Text capture ${index + 1} failed (${response.status}): ${JSON.stringify(result)}`);
  assert(typeof result.caseId === 'string' && result.caseId, `Text capture ${index + 1} returned no caseId`);
  assert(result.degraded !== true, `Text capture ${index + 1} entered degraded understanding`);
  assert(result.runFailed !== true, `Text capture ${index + 1} understood but its initial bounded run failed`);

  const item = await getCase(result.caseId, owner);
  validateUnderstoodCase(item, `Text capture ${index + 1}`);
  return { caseId: result.caseId, title: item.title, domain: item.domain, state: item.state };
}

async function captureVoice() {
  const owner = `${ownerPrefix}-voice`;
  const bytes = Buffer.from(voiceMp3Base64, 'base64');
  const form = new FormData();
  form.append('audio', new Blob([bytes], { type: 'audio/mpeg' }), 'carry-gutter-test.mp3');

  const response = await fetch(`${base}/api/capture`, {
    method: 'POST',
    headers: { 'x-carry-owner': owner },
    body: form,
    signal: AbortSignal.timeout(90_000),
  });
  const result = await readJson(response);
  assert(response.ok, `Voice capture failed (${response.status}): ${JSON.stringify(result)}`);
  assert(typeof result.caseId === 'string' && result.caseId, 'Voice capture returned no caseId');
  assert(result.degraded !== true, 'Voice capture transcribed but entered degraded understanding');
  assert(result.runFailed !== true, 'Voice capture understood but its initial bounded run failed');

  const item = await getCase(result.caseId, owner);
  validateUnderstoodCase(item, 'Voice capture');
  assert(
    item.activity.some((event) => String(event.label || '').toLowerCase().includes('by voice')),
    'Voice capture did not record the voice capture path in activity',
  );
  return { caseId: result.caseId, title: item.title, domain: item.domain, state: item.state };
}

async function main() {
  console.log('Carry working-alpha release gate');
  console.log(`API: ${base}`);

  const textResults = [];
  for (let index = 0; index < textPrompts.length; index += 1) {
    const prompt = textPrompts[index];
    console.log(`\n[${index + 1}/10] ${prompt}`);
    const result = await captureText(prompt, index);
    textResults.push(result);
    console.log(`PASS — ${result.title} · ${result.domain} · ${result.state}`);
  }

  console.log('\n[voice] synthetic spoken fixture: “My gutter is blocked”');
  const voiceResult = await captureVoice();
  console.log(`PASS — ${voiceResult.title} · ${voiceResult.domain} · ${voiceResult.state}`);

  console.log('\nWORKING ALPHA RELEASE GATE PASS');
  console.log(JSON.stringify({ textCaptures: textResults.length, voice: voiceResult }, null, 2));
}

main().catch((error) => {
  console.error('\nWORKING ALPHA RELEASE GATE FAIL');
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
