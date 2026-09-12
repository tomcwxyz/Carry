# Carry Gmail executor — alpha setup

Carry's first real external executor is email through Gmail. The implementation is intentionally provider-bounded: the case engine asks for `email.send`; Gmail is the first adapter, not a permanent product assumption.

## What it does

For a case that already has:

- a verified email contact in grounded research;
- a prepared subject/body;
- a genuine user hand-back;
- configured Gmail credentials;

Carry upgrades the hand-back to an explicit **Approve send / Don't send** decision.

On approval Carry:

1. freezes the exact recipient, subject and body into the approval event;
2. records `execution_attempted`;
3. sends through the Gmail API;
4. records `execution_completed` with Gmail message/thread IDs;
5. moves the case to **Waiting** for a reply;
6. checks waiting Gmail threads every 15 minutes;
7. records an `external_update` when a reply arrives and resumes the bounded case runner with the reply text in context.

Approval is still scoped to one exact message. No approval means no send.

## Google OAuth configuration

Create or use a Google Cloud OAuth client with the Gmail API enabled. Generate a refresh token for the mailbox Carry should use in the alpha with these scopes:

- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/gmail.readonly`

The refresh token should belong to the mailbox that will actually send the messages. If `CARRY_GMAIL_FROM` is set to an alias, that alias must already be valid for the connected Gmail account.

Set these Vercel environment variables for Production:

```text
CARRY_GMAIL_CLIENT_ID=
CARRY_GMAIL_CLIENT_SECRET=
CARRY_GMAIL_REFRESH_TOKEN=
CARRY_GMAIL_FROM=          # optional
CARRY_EXECUTOR_SECRET=
CRON_SECRET=
```

Use strong random values for `CARRY_EXECUTOR_SECRET` and `CRON_SECRET`. They may be the same random secret during the private alpha, though keeping them separate is cleaner.

After changing environment variables, redeploy Production so the functions receive them.

## Reply polling

`vercel.json` schedules `/api/email/gmail/sync` every 15 minutes. Vercel sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is configured.

The sync only checks cases already in `waiting` where the recorded executor is Gmail. It does not crawl the entire inbox.

The alpha uses polling rather than Gmail push notifications because it is simpler to operate and preserves the same Carry lifecycle. A later Gmail adapter can replace polling with Google Pub/Sub/watch without changing case state semantics.

## Deliberate limitations

- Alpha configuration is one server-side Gmail mailbox, not yet per-user OAuth.
- Carry currently derives executable email from grounded case evidence with a prepared message and verified email contact. General address-book/composer flows come with the connected-work phase.
- Reply checks are near-real-time rather than instant (up to roughly 15 minutes between polls).
- Carry does not automatically send attachments in this slice.
- A Gmail send failure is recorded as an execution failure and surfaced as retryable; it is never treated as sent.

## Safety rule

`prepared → approved → attempted → sent → waiting → reply → resume`

Every transition is recorded separately. Carry must never infer a send, a reply or a completed outcome from model text alone.
