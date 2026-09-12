import { z } from 'zod';

import { getSql } from './db.js';
import { recordExecutionLifecycleEvent } from './execution-lifecycle.js';
import { gmailConfigured, sendGmailMessage } from './gmail-client.js';

const emailExecutionSchema = z.object({
  capability: z.literal('email.send'),
  provider: z.literal('gmail'),
  to: z.string().trim().email().max(320),
  subject: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(12000),
});

export type EmailExecutionIntent = z.infer<typeof emailExecutionSchema>;

export function gmailEmailConfigured() {
  return gmailConfigured();
}

export function configuredExecutionCapabilities() {
  return gmailConfigured() ? ['email.send'] : [];
}

function emailIntentFromActionPayload(value: unknown): EmailExecutionIntent | null {
  if (!gmailConfigured() || !value || typeof value !== 'object') return null;
  const payload = value as Record<string, unknown>;
  const prepared = payload.preparedAction && typeof payload.preparedAction === 'object'
    ? payload.preparedAction as Record<string, unknown>
    : null;
  const body = typeof prepared?.body === 'string' ? prepared.body.trim() : '';
  const label = typeof prepared?.label === 'string' ? prepared.label.trim() : '';
  const subject = typeof prepared?.subject === 'string' && prepared.subject.trim()
    ? prepared.subject.trim()
    : label;
  if (!body || !subject) return null;

  const options = Array.isArray(payload.options) ? payload.options : [];
  const ranked = [
    ...options.filter((option) => option && typeof option === 'object' && (option as Record<string, unknown>).recommended === true),
    ...options.filter((option) => !option || typeof option !== 'object' || (option as Record<string, unknown>).recommended !== true),
  ];

  for (const option of ranked) {
    if (!option || typeof option !== 'object') continue;
    const contacts = Array.isArray((option as Record<string, unknown>).contacts)
      ? (option as Record<string, unknown>).contacts as unknown[]
      : [];
    for (const contact of contacts) {
      if (!contact || typeof contact !== 'object') continue;
      const item = contact as Record<string, unknown>;
      if (item.kind !== 'email' || typeof item.value !== 'string') continue;
      const parsed = emailExecutionSchema.safeParse({
        capability: 'email.send',
        provider: 'gmail',
        to: item.value.trim(),
        subject,
        body,
      });
      if (parsed.success) return parsed.data;
    }
  }
  return null;
}

function declinedEmailExecution(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  const execution = payload.execution && typeof payload.execution === 'object'
    ? payload.execution as Record<string, unknown>
    : null;
  return execution?.capability === 'email.send';
}

export async function getCaseEmailExecutionIntent(caseId: string, ownerKey: string) {
  if (!gmailConfigured()) return null;
  const sql = getSql();
  const events = await sql`
    SELECT type, payload
    FROM carry_case_events
    WHERE case_id = ${caseId}::uuid
      AND type IN ('action_completed', 'approval_declined')
      AND created_at > COALESCE((
        SELECT MAX(created_at)
        FROM carry_case_events
        WHERE case_id = ${caseId}::uuid
          AND type = 'case_edited'
          AND payload->>'resetsWork' = 'true'
      ), to_timestamp(0))
    ORDER BY created_at DESC
    LIMIT 12
  `;

  for (const event of events) {
    if (event.type === 'approval_declined' && declinedEmailExecution(event.payload)) return null;
    if (event.type !== 'action_completed') continue;
    const intent = emailIntentFromActionPayload(event.payload);
    if (intent) return intent;
  }
  return null;
}

export function parseEmailExecutionIntent(value: unknown) {
  const parsed = emailExecutionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function executeApprovedEmail(caseId: string, ownerKey: string, rawIntent: unknown) {
  const intent = emailExecutionSchema.parse(rawIntent);
  await recordExecutionLifecycleEvent(caseId, ownerKey, {
    status: 'attempted',
    executor: 'gmail',
    action: `send email to ${intent.to}`,
    summary: `Started sending email to ${intent.to}`,
    metadata: { to: intent.to, subject: intent.subject },
  });

  try {
    const sent = await sendGmailMessage(intent);
    const externalRef = `gmail:${sent.threadId}:${sent.id}`;
    const lifecycle = await recordExecutionLifecycleEvent(caseId, ownerKey, {
      status: 'completed',
      executor: 'gmail',
      action: `send email to ${intent.to}`,
      summary: `Email sent to ${intent.to}`,
      externalRef,
      waitingFor: `Waiting for a reply to “${intent.subject}”.`,
      metadata: {
        to: intent.to,
        subject: intent.subject,
        gmailMessageId: sent.id,
        gmailThreadId: sent.threadId,
      },
    });
    return { ok: true as const, sent, lifecycle };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Gmail send failure';
    const lifecycle = await recordExecutionLifecycleEvent(caseId, ownerKey, {
      status: 'failed',
      executor: 'gmail',
      action: `send email to ${intent.to}`,
      summary: message,
      metadata: { to: intent.to, subject: intent.subject },
    });
    return { ok: false as const, error: message, lifecycle };
  }
}
