export type GmailSendInput = {
  to: string;
  subject: string;
  body: string;
};

export type GmailSendResult = {
  id: string;
  threadId: string;
};

export type GmailMessage = {
  id?: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
};

type GmailHeader = { name?: string; value?: string };

type GmailMessagePart = {
  mimeType?: string;
  headers?: GmailHeader[];
  body?: { data?: string };
  parts?: GmailMessagePart[];
};

export type GmailThread = {
  id?: string;
  messages?: GmailMessage[];
};

export function gmailConfigured() {
  return Boolean(
    process.env.CARRY_GMAIL_CLIENT_ID?.trim()
    && process.env.CARRY_GMAIL_CLIENT_SECRET?.trim()
    && process.env.CARRY_GMAIL_REFRESH_TOKEN?.trim(),
  );
}

function utf8ToBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToUtf8(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function base64Url(value: string) {
  return utf8ToBase64(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(value: string) {
  const normalised = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalised.length % 4)) % 4);
  return base64ToUtf8(`${normalised}${padding}`);
}

function encodeHeader(value: string) {
  return /[^\x20-\x7E]/.test(value)
    ? `=?UTF-8?B?${utf8ToBase64(value)}?=`
    : value;
}

function rawMessage(input: GmailSendInput) {
  const from = process.env.CARRY_GMAIL_FROM?.trim();
  const headers = [
    ...(from ? [`From: ${from}`] : []),
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
  ];
  return base64Url(`${headers.join('\r\n')}\r\n\r\n${input.body}\r\n`);
}

async function accessToken() {
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

export async function sendGmailMessage(input: GmailSendInput): Promise<GmailSendResult> {
  const token = await accessToken();
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ raw: rawMessage(input) }),
  });
  const payload = await response.json() as { id?: string; threadId?: string; error?: { message?: string } };
  if (!response.ok || !payload.id || !payload.threadId) {
    throw new Error(`Gmail send failed: ${payload.error?.message || response.status}`);
  }
  return { id: payload.id, threadId: payload.threadId };
}

export async function getGmailThread(threadId: string): Promise<GmailThread> {
  const token = await accessToken();
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=full`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const payload = await response.json() as GmailThread & { error?: { message?: string } };
  if (!response.ok) throw new Error(`Gmail thread fetch failed: ${payload.error?.message || response.status}`);
  return payload;
}

export function gmailHeader(message: GmailMessage, name: string) {
  return message.payload?.headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value?.trim() || undefined;
}

function textFromPart(part: GmailMessagePart | undefined): string {
  if (!part) return '';
  if (part.mimeType === 'text/plain' && part.body?.data) return decodeBase64Url(part.body.data);
  for (const child of part.parts ?? []) {
    const text = textFromPart(child);
    if (text) return text;
  }
  if (part.body?.data) return decodeBase64Url(part.body.data);
  return '';
}

export function gmailMessageText(message: GmailMessage) {
  return (textFromPart(message.payload) || message.snippet || '').trim().slice(0, 5000);
}
