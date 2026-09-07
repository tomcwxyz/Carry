import { getApiBase } from '../cases/case-service';

export type CaptureInput =
  | { kind: 'text'; text: string }
  | { kind: 'voice'; uri: string };

export interface CaptureResult {
  caseId: string;
}

export async function submitCapture(input: CaptureInput): Promise<CaptureResult> {
  const endpoint = `${getApiBase()}/api/capture`;

  if (input.kind === 'text') {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-carry-owner': 'alpha-local',
      },
      body: JSON.stringify({ text: input.text }),
    });
    if (!response.ok) throw new Error(`Carry capture failed with ${response.status}`);
    return response.json() as Promise<CaptureResult>;
  }

  const form = new FormData();
  form.append('audio', {
    uri: input.uri,
    type: 'audio/mp4',
    name: 'capture.m4a',
  } as unknown as Blob);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'x-carry-owner': 'alpha-local' },
    body: form,
  });
  if (!response.ok) throw new Error(`Carry capture failed with ${response.status}`);
  return response.json() as Promise<CaptureResult>;
}
