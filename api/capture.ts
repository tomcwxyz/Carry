import { fallbackCase, understandCase } from '../src/server/case-understanding';
import { getSql } from '../src/server/db';

type CaptureKind = 'text' | 'voice';

async function transcribe(audio: File) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not configured');

  const body = new FormData();
  body.append('file', audio, audio.name || 'capture.m4a');
  body.append('model', process.env.CARRY_TRANSCRIPTION_MODEL ?? 'gpt-4o-mini-transcribe');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body,
  });

  if (!response.ok) throw new Error(`Transcription failed with ${response.status}`);
  const data = await response.json() as { text?: string };
  if (!data.text?.trim()) throw new Error('Transcription returned no text');
  return data.text.trim();
}

function withStepIds(plan: Array<{ label: string; state: 'done' | 'active' | 'todo' }>) {
  return plan.map((step, index) => ({ ...step, id: `step-${index + 1}` }));
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const sql = getSql();
  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  let kind: CaptureKind;
  let sourceText = '';
  let mediaType: string | null = null;

  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('multipart/form-data')) {
      kind = 'voice';
      const form = await request.formData();
      const audio = form.get('audio');
      if (!(audio instanceof File)) return Response.json({ error: 'Audio file is required' }, { status: 400 });
      mediaType = audio.type || 'audio/mp4';
      sourceText = await transcribe(audio);
    } else {
      kind = 'text';
      const body = await request.json() as { text?: string };
      sourceText = body.text?.trim() ?? '';
      if (!sourceText) return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    const [capture] = await sql`
      INSERT INTO carry_captures (owner_key, kind, status, raw_text, transcript, media_type)
      VALUES (${ownerKey}, ${kind}, ${kind === 'voice' ? 'transcribed' : 'received'}, ${kind === 'text' ? sourceText : null}, ${kind === 'voice' ? sourceText : null}, ${mediaType})
      RETURNING id
    `;

    let understood;
    try {
      understood = await understandCase(sourceText);
    } catch (error) {
      console.error('case_understanding_failed', error);
      understood = fallbackCase(sourceText);
    }

    const plan = withStepIds(understood.plan);
    const decision = understood.decisionLabel ? { label: understood.decisionLabel } : null;
    const [created] = await sql`
      INSERT INTO carry_cases (owner_key, title, outcome, summary, state, domain, source_text, next_action, decision, plan)
      VALUES (
        ${ownerKey}, ${understood.title}, ${understood.outcome}, ${understood.summary}, ${understood.state},
        ${understood.domain}, ${sourceText}, ${understood.nextAction},
        ${decision ? JSON.stringify(decision) : null}::jsonb, ${JSON.stringify(plan)}::jsonb
      )
      RETURNING id
    `;

    await sql`
      INSERT INTO carry_case_events (case_id, type, actor, label, payload)
      VALUES
        (${created.id}, 'captured', 'you', ${kind === 'voice' ? 'Told Carry about this by voice' : 'Told Carry about this'}, ${JSON.stringify({ kind })}::jsonb),
        (${created.id}, 'understood', 'carry', 'Turned the capture into an outcome and working plan', '{}'::jsonb)
    `;

    await sql`
      UPDATE carry_captures
      SET status = 'understood', case_id = ${created.id}, updated_at = now()
      WHERE id = ${capture.id}
    `;

    return Response.json({ caseId: created.id });
  } catch (error) {
    console.error('capture_failed', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Carry could not process this capture' }, { status: 500 });
  }
}
