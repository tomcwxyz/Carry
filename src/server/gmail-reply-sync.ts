import { advanceCase } from './case-advance.js';
import { getSql } from './db.js';
import { recordExecutionLifecycleEvent } from './execution-lifecycle.js';
import { getGmailThread, gmailHeader, gmailMessageText, type GmailMessage } from './gmail-client.js';

type GmailWaiting = {
  reason?: string;
  executor?: string;
  action?: string;
  externalRef?: string;
  since?: string;
};

type WaitingCase = {
  id: string;
  owner_key: string;
  waiting: GmailWaiting;
};

function parseExternalRef(value: unknown) {
  if (typeof value !== 'string') return null;
  const match = /^gmail:([^:]+):([^:]+)$/.exec(value.trim());
  if (!match) return null;
  return { threadId: match[1], sentMessageId: match[2] };
}

function incomingAfterSent(messages: GmailMessage[], sentMessageId: string, since?: string) {
  const sentIndex = messages.findIndex((message) => message.id === sentMessageId);
  const candidates = sentIndex >= 0
    ? messages.slice(sentIndex + 1)
    : messages.filter((message) => {
        if (!since || !message.internalDate) return true;
        const waitingSince = Date.parse(since);
        const messageAt = Number(message.internalDate);
        return Number.isFinite(waitingSince) && Number.isFinite(messageAt) ? messageAt > waitingSince : true;
      });

  return candidates.find((message) => !message.labelIds?.includes('SENT')) ?? null;
}

async function replyFor(waiting: GmailWaiting) {
  const ref = parseExternalRef(waiting.externalRef);
  if (!ref) return null;
  const thread = await getGmailThread(ref.threadId);
  const reply = incomingAfterSent(thread.messages ?? [], ref.sentMessageId, waiting.since);
  if (!reply?.id) return null;

  return {
    messageId: reply.id,
    threadId: ref.threadId,
    from: gmailHeader(reply, 'From'),
    subject: gmailHeader(reply, 'Subject'),
    text: gmailMessageText(reply),
  };
}

export async function syncGmailReplies(limit = 20) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, owner_key, waiting
    FROM carry_cases
    WHERE state = 'waiting'
      AND waiting->>'executor' = 'gmail'
      AND waiting->>'externalRef' LIKE 'gmail:%'
    ORDER BY updated_at ASC
    LIMIT ${Math.max(1, Math.min(limit, 50))}
  ` as WaitingCase[];

  const checked: Array<{ caseId: string; status: 'no_reply' | 'resumed' | 'error'; detail?: string }> = [];

  for (const item of rows) {
    try {
      const reply = await replyFor(item.waiting);
      if (!reply) {
        checked.push({ caseId: item.id, status: 'no_reply' });
        continue;
      }

      const summary = reply.from
        ? `${reply.from} replied to the email Carry sent.`
        : 'A reply arrived to the email Carry sent.';
      const lifecycle = await recordExecutionLifecycleEvent(item.id, item.owner_key, {
        status: 'external_update',
        executor: 'gmail',
        action: 'email reply received',
        summary,
        externalRef: item.waiting.externalRef,
        metadata: {
          gmailMessageId: reply.messageId,
          gmailThreadId: reply.threadId,
          from: reply.from,
          subject: reply.subject,
          text: reply.text,
        },
      });
      if (lifecycle.shouldAdvance) await advanceCase(item.id, item.owner_key);
      checked.push({ caseId: item.id, status: 'resumed' });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown Gmail reply sync error';
      console.error('gmail_reply_sync_failed', { caseId: item.id, detail, error });
      checked.push({ caseId: item.id, status: 'error', detail });
    }
  }

  return {
    checked: checked.length,
    resumed: checked.filter((item) => item.status === 'resumed').length,
    errors: checked.filter((item) => item.status === 'error').length,
    cases: checked,
  };
}
