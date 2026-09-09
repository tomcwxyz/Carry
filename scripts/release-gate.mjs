import { readFile } from 'node:fs/promises';

const base = (process.env.CARRY_API_URL || 'https://carry-gilt.vercel.app').replace(/\/$/, '');
const ownerPrefix = process.env.CARRY_GATE_OWNER || `alpha-release-gate-${Date.now()}`;
const voiceFixture = process.env.CARRY_VOICE_FIXTURE || new URL('./fixtures/carry-gutter-test.webm', import.meta.url);

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Expected JSON from ${response.url}, got ${text.slice(0, 240)}`);
  }
}

async function fetchIdempotentJson(url, options, label, attempts = 4) {
  let lastError = new Error(`${label} failed`);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30_000),
      });
      const body = await readJson(response);

      if (response.ok) return body;

      const error = new Error(`${label} failed (${response.status}): ${JSON.stringify(body)}`);
      if (response.status < 500 && response.status !== 429) throw error;
      lastError = error;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    if (attempt < attempts) {
      const delay = 500 * (2 ** (attempt - 1));
      console.warn(`${label} attempt ${attempt}/${attempts} failed (${lastError.message}); retrying in ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}

async function getCase(caseId, owner) {
  return fetchIdempotentJson(
    `${base}/api/cases/${encodeURIComponent(caseId)}`,
    { headers: { 'x-carry-owner': owner } },
    'Case load',
  );
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
  const bytes = await readFile(voiceFixture);
  const form = new FormData();
  form.append('audio', new Blob([bytes], { type: 'audio/webm' }), 'carry-gutter-test.webm');

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
    if (index < textPrompts.length - 1) await sleep(750);
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
