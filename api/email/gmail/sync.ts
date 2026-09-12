import { gmailConfigured } from '../../../src/server/gmail-client.js';
import { syncGmailReplies } from '../../../src/server/gmail-reply-sync.js';

export const maxDuration = 60;

function authorised(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const executorSecret = process.env.CARRY_EXECUTOR_SECRET?.trim();
  const auth = request.headers.get('authorization')?.trim();
  const executor = request.headers.get('x-carry-executor-secret')?.trim();

  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  if (executorSecret && executor === executorSecret) return true;
  return false;
}

async function run(request: Request) {
  if (!gmailConfigured()) {
    return Response.json({ configured: false, checked: 0, resumed: 0, errors: 0 });
  }
  if (!process.env.CRON_SECRET?.trim() && !process.env.CARRY_EXECUTOR_SECRET?.trim()) {
    return Response.json({ error: 'Gmail reply sync authentication is not configured' }, { status: 503 });
  }
  if (!authorised(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await syncGmailReplies();
    return Response.json({ configured: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Carry could not sync Gmail replies';
    console.error('gmail_reply_sync_route_failed', { message, error });
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
