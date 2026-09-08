import type { CarryCase } from './types';

const apiBase = process.env.EXPO_PUBLIC_CARRY_API_URL?.replace(/\/$/, '');

export function getApiBase() {
  if (!apiBase) throw new Error('EXPO_PUBLIC_CARRY_API_URL is not configured');
  return apiBase;
}

export async function fetchCases(): Promise<CarryCase[]> {
  const response = await fetch(`${getApiBase()}/api/cases`, {
    headers: { 'x-carry-owner': 'alpha-local' },
  });
  if (!response.ok) throw new Error(`Carry cases load failed with ${response.status}`);
  const data = await response.json() as { cases?: CarryCase[] } | CarryCase[];
  return Array.isArray(data) ? data : data.cases ?? [];
}

export async function fetchCase(id: string): Promise<CarryCase> {
  const response = await fetch(`${getApiBase()}/api/cases/${encodeURIComponent(id)}`, {
    headers: { 'x-carry-owner': 'alpha-local' },
  });
  if (!response.ok) throw new Error(`Carry case load failed with ${response.status}`);
  return response.json() as Promise<CarryCase>;
}
