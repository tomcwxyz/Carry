import type { CarryCase, CarryCaseResponse, CaseFeedbackRating } from './types';

const apiBase = process.env.EXPO_PUBLIC_CARRY_API_URL?.replace(/\/$/, '');
const ownerHeaders = { 'x-carry-owner': 'alpha-local' } as const;

export function getApiBase() {
  if (!apiBase) throw new Error('EXPO_PUBLIC_CARRY_API_URL is not configured');
  return apiBase;
}

async function expectJson<T>(response: Response, label: string): Promise<T> {
  const text = await response.text();
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${label} returned an unreadable response`);
  }
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body ? String((body as { error?: unknown }).error ?? '') : '';
    throw new Error(message || `${label} failed with ${response.status}`);
  }
  return body as T;
}

export async function fetchCases(): Promise<CarryCase[]> {
  const response = await fetch(`${getApiBase()}/api/cases`, { headers: ownerHeaders });
  const data = await expectJson<{ cases?: CarryCase[] } | CarryCase[]>(response, 'Carry cases load');
  return Array.isArray(data) ? data : data.cases ?? [];
}

export async function fetchCase(id: string): Promise<CarryCase> {
  const response = await fetch(`${getApiBase()}/api/cases/${encodeURIComponent(id)}`, { headers: ownerHeaders });
  return expectJson<CarryCase>(response, 'Carry case load');
}

export async function updateCase(id: string, update: { title: string; sourceText: string }) {
  const response = await fetch(`${getApiBase()}/api/cases/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...ownerHeaders, 'content-type': 'application/json' },
    body: JSON.stringify(update),
  });
  return expectJson<{ caseId: string; changed: boolean; reran?: boolean }>(response, 'Carry case update');
}

export async function deleteCase(id: string) {
  const response = await fetch(`${getApiBase()}/api/cases/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: ownerHeaders,
  });
  return expectJson<{ deleted: true; caseId: string }>(response, 'Carry case delete');
}

export async function completeCase(id: string) {
  const response = await fetch(`${getApiBase()}/api/cases/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
    headers: ownerHeaders,
  });
  return expectJson<{ caseId: string; state: 'done' }>(response, 'Carry case completion');
}

export async function submitCaseFeedback(id: string, rating: CaseFeedbackRating, note?: string) {
  const response = await fetch(`${getApiBase()}/api/cases/${encodeURIComponent(id)}/feedback`, {
    method: 'POST',
    headers: { ...ownerHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({ rating, note }),
  });
  return expectJson<{ caseId: string; feedback: { rating: CaseFeedbackRating; note?: string | null } }>(response, 'Carry feedback');
}

export async function respondToCase(id: string, responseValue: string | CarryCaseResponse) {
  const body: CarryCaseResponse = typeof responseValue === 'string' ? { text: responseValue } : responseValue;
  const response = await fetch(`${getApiBase()}/api/cases/${encodeURIComponent(id)}/respond`, {
    method: 'POST',
    headers: { ...ownerHeaders, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return expectJson<{ caseId: string; result?: { kind?: string; nextAction?: string } }>(response, 'Carry response');
}

export async function continueCase(id: string) {
  const response = await fetch(`${getApiBase()}/api/cases/${encodeURIComponent(id)}/run`, {
    method: 'POST',
    headers: ownerHeaders,
  });
  return expectJson<{ caseId: string; result?: { kind?: string; nextAction?: string } }>(response, 'Carry run');
}
