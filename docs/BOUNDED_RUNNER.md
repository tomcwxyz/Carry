# Bounded Carry runner

The working-alpha backend now advances a case through small, inspectable runs rather than stopping after case understanding.

## Flow

`capture -> understand -> advanceCase -> runCase -> research/decision/progress -> event log`

`advanceCase` performs at most three useful runs in one request. It stops earlier when Carry needs the user, is genuinely waiting, or has verified completion.

When a case needs a fact or decision, `POST /api/cases/:id/respond` records the user's response as a `decision_made` event, clears the hand-back and resumes the bounded advance loop.

When current evidence is required, `research-worker.ts` uses the OpenAI Responses API hosted `web_search` tool and stores both the research result and returned source URLs in case events. The case detail API exposes synthesised evidence to the mobile surface.

## Safety contract

- research is evidence-backed;
- external bookings, purchases, messages and calls are never claimed without tool evidence;
- every bounded run records `action_started` and either `action_completed` or `action_failed`;
- failures leave the case retryable;
- consequential external actions still require an explicit approval boundary once those adapters exist.
