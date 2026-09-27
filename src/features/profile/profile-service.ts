import { getApiBase } from '../cases/case-service';

export interface CarryProfile {
  spaces: Array<{ id: string; label: string }>;
  connections: Array<{ id: string; label: string; connected: boolean; detail: string }>;
  permissions: Array<{ id: string; label: string; policy: string }>;
  learning: Array<{ domain: string; title: string; rating: 'good' | 'mostly' | 'missed'; note: string | null }>;
}

export async function fetchCarryProfile(): Promise<CarryProfile> {
  const response = await fetch(`${getApiBase()}/api/you`, { headers: { 'x-carry-owner': 'alpha-local' } });
  if (!response.ok) throw new Error(`Carry profile failed with ${response.status}`);
  return response.json() as Promise<CarryProfile>;
}
