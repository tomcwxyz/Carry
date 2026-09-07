export type CaptureInput =
  | { kind: 'text'; text: string }
  | { kind: 'voice'; uri: string };

export interface CaptureResult {
  caseId: string;
}

export class CaptureBackendUnavailableError extends Error {
  constructor() {
    super('Voice capture is recorded locally, but the Carry capture service is not configured yet.');
    this.name = 'CaptureBackendUnavailableError';
  }
}

/**
 * Boundary between the native capture UI and the server-side Carry engine.
 *
 * Text remains local in the shell for now. Voice deliberately does not pretend
 * to have been transcribed: once EXPO_PUBLIC_CARRY_CAPTURE_ENDPOINT exists this
 * adapter will upload the recording and return the created case id.
 */
export async function submitCapture(input: CaptureInput): Promise<CaptureResult> {
  if (input.kind === 'text') {
    const lower = input.text.toLowerCase();
    return { caseId: lower.includes('gutter') ? 'gutter' : 'ship-check' };
  }

  const endpoint = process.env.EXPO_PUBLIC_CARRY_CAPTURE_ENDPOINT;
  if (!endpoint) throw new CaptureBackendUnavailableError();

  const form = new FormData();
  form.append('audio', {
    uri: input.uri,
    type: 'audio/mp4',
    name: 'capture.m4a',
  } as unknown as Blob);

  const response = await fetch(endpoint, { method: 'POST', body: form });
  if (!response.ok) throw new Error(`Carry capture failed with ${response.status}`);

  return response.json() as Promise<CaptureResult>;
}
