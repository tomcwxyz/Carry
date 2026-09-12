import { z } from 'zod';

import { getSql } from './db.js';
import { recordExecutionLifecycleEvent } from './execution-lifecycle.js';

const emailExecutionSchema = z.object({
  capability: z.literal('email.send'),
  provider: z.literal('gmail'),
  to: z.string().trim().email().max(320),
  subject: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(12000),
});

export type EmailExecutionIntent = z.infer<typeof emailExecutionSchema>;

type GmailSendResult = {
  id: string;
  threadId: string;
};

export function gmailEmailConfigured() {
  return Boolean(
    process.env.CARRY_GMAIL_CLIENT_ID?.trim()
    && process.env.CARRY_GMAIL_CLIENT_SECRET?.trim()
    && process.env.CARRY_GMAIL_REFRESH_TOKEN?.trim(),
  );
}

export function configuredExecutionCapabilities() {
  return gmailEmailConfigured() ? ['email.send'] : [];
}

function emailIntentFromActionPayload(value: unknown): EmailExecutionIntent | null {
  if (!gmailEmailConfigured() || !value || typeof value !== 'object') return null;
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

export async function getCaseEmailExecutionIntent(caseId: string, ownerKey: string) {
  if (!gmailEmailConfigured()) return null;
  const sql = getSql();
  const events = await sql`
    SELECT payload
    FROM carry_case_events
    WHERE case_id = ${caseId}::uuid
      AND type = 'action_completed'
      AND created_at > COALESCE((
        SELECT MAX(created_at)
        FROM carry_case_events
        WHERE case_id = ${caseId}::uuid
          AND type = 'case_edited'
          AND payload->>'resetsWork' = 'true'
      ), to_timestamp(0))
    ORDER BY created_at DESC
    LIMIT 8
  `;

  for (const event of events) {
    const intent = emailIntentFromActionPayload(event.payload);
    if (intent) return intent;
  }
  return null;
}

function base64Url(value: string) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function encodeHeader(value: string) {
  return /[^\x20-\x7E]/.test(value)
    ? `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
    : value;
}

function gmailRawMessage(intent: EmailExecutionIntent) {
  const from = process.env.CARRY_GMAIL_FROM?.trim();
  const headers = [
    ...(from ? [`From: ${from}`] : []),
    `To: ${intent.to}`,
    `Subject: ${encodeHeader(intent.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
  ];
  return base64Url(`${headers.join('\r\n')}\r\n\r\n${intent.body}\r\n`);
}

async function gmailAccessToken() {
  const clientId = process.env.CARRY_GMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.CARRY_GMAIL_CLIENT_SECRET?.trim();
  const refreshToken = process.env.CARRY_GMAIL_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) throw new Error('Gmail executor is not configured');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const payload = await response.json() as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(`Gmail token refresh failed: ${payload.error_description || payload.error || response.status}`);
  }
  return payload.access_token;
}

async function sendWithGmail(intent: EmailExecutionIntent): Promise<GmailSendResult> {
  const accessToken = await gmailAccessToken();
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ raw: gmailRawMessage(intent) }),
  });
  const payload = await response.json() as { id?: string; threadId?: string; error?: { message?: string } };
  if (!response.ok || !payload.id || !payload.threadId) {
    throw new Error(`Gmail send failed: ${payload.error?.message || response.status}`);
  }
  return { id: payload.id, threadId: payload.threadId };
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
    const sent = await sendWithGmail(intent);
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
