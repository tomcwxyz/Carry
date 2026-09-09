import { readFile } from 'node:fs/promises';

const base = (process.env.CARRY_API_URL || 'https://carry-gilt.vercel.app').replace(/\/$/, '');
const fixture = process.env.CARRY_VOICE_FIXTURE;

if (!fixture) throw new Error('CARRY_VOICE_FIXTURE is required');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Expected JSON from ${response.url}, got ${text.slice(0, 300)}`);
  }
}

const bytes = await readFile(fixture);
const owner = `voice-smoke-${Date.now()}`;
const form = new FormData();
form.append('audio', new Blob([bytes], { type: 'audio/wav' }), 'carry-gutter-test.wav');

console.log(`Voice smoke: ${bytes.length} bytes -> ${base}/api/capture`);
const response = await fetch(`${base}/api/capture`, {
  method: 'POST',
  headers: { 'x-carry-owner': owner },
  body: form,
  signal: AbortSignal.timeout(90_000),
});
const result = await readJson(response);

assert(response.ok, `Voice capture failed (${response.status}): ${JSON.stringify(result)}`);
assert(typeof result.caseId === 'string' && result.caseId, 'Voice capture returned no caseId');
assert(result.degraded !== true, 'Voice capture entered degraded understanding');
assert(result.runFailed !== true, 'Voice capture initial bounded run failed');

const caseResponse = await fetch(`${base}/api/cases/${encodeURIComponent(result.caseId)}`, {
  headers: { 'x-carry-owner': owner },
  signal: AbortSignal.timeout(30_000),
});
const item = await readJson(caseResponse);
assert(caseResponse.ok, `Case load failed (${caseResponse.status}): ${JSON.stringify(item)}`);
assert(item.activity?.some((event) => String(event.label || '').toLowerCase().includes('by voice')), 'Voice event missing');

console.log(`VOICE SMOKE PASS — ${item.title} · ${item.domain} · ${item.state}`);
