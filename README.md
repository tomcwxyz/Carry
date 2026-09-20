# Carry

**Things need doing. Carry helps do them.**

Carry is a mobile-first, voice-first agent for moving real work and life administration towards completion. It is not a to-do list with chat attached: users tell Carry what needs sorting, Carry creates a case, works out the outcome, takes the next safe actions, and comes back only when human judgement or approval is genuinely needed.

## Product principles

- **Cases, not tasks.** A case has an outcome, context, actions, evidence and a history.
- **Voice by default.** Speaking is the primary capture and control surface; text, camera and sharing are peers.
- **Do, don't just organise.** Carry should research, prepare, act, wait, resume and verify.
- **Interrupt sparingly.** Ask the user only when Carry cannot safely or sensibly continue.
- **Personal and work together.** Spaces provide context, but `Needs you` cuts across life.
- **Legible autonomy.** Every meaningful agent action is visible in the case activity trail.
- **Persistent state, bounded runs.** Models operate on structured case state rather than one endless chat.
- **Consequences govern permission.** Reading and preparation are cheap; sending, spending, publishing and destructive actions require explicit policy.

## Current alpha

Alpha 2 is about proving that Carry can genuinely **carry** a case rather than merely understand or organise it.

The current loop is:

`Capture → Understand → Act → Hand back → Execute → Wait → Resume → Verify → Learn`

The four user-facing states are **Needs you / Carrying / Waiting / Done**.

Implemented today:

- voice and text capture into durable Neon-backed cases;
- bounded orchestration with grounded web research and evidence;
- concise actionable recommendations and prepared next steps;
- edit, complete, delete and explicit completion-feedback flows;
- consequence-based approval for external actions;
- explicit execution evidence: attempted / completed / failed / external update;
- evidence-backed Waiting and automatic resume;
- completion confirmation and trusted external outcome verification;
- Gmail as the first real executor: approve exact message → send → wait for reply → resume.

The current Android test target is **Alpha 7**. It exists to prove the complete Alpha 2 interaction loop on-device before Carry expands further into connected work.

### Golden paths

- household — “My gutter is blocked” → location → research → recommendation → prepared enquiry → approval → send → wait → reply → resume
- life admin — “I need an MOT” → determine what is needed → materially advance the case with the fewest sensible hand-backs
- research/purchase — “Find us a new dishwasher” → requirements → grounded shortlist → recommendation
- correction — edit a misunderstood brief → Carry re-plans and continues
- completion — Carry proposes done → user confirms or a trusted verifier proves it → feedback
- communication — a prepared, verified email can be sent only after approval of the exact recipient, subject and body

### Required environment

```text
EXPO_PUBLIC_CARRY_API_URL=
DATABASE_URL=
OPENAI_API_KEY=
AI_GATEWAY_API_KEY=

CARRY_GMAIL_CLIENT_ID=
CARRY_GMAIL_CLIENT_SECRET=
CARRY_GMAIL_REFRESH_TOKEN=
CARRY_GMAIL_FROM=          # optional
CARRY_EXECUTOR_SECRET=
CRON_SECRET=
```

On Vercel, AI Gateway authentication is automatic; `AI_GATEWAY_API_KEY` is mainly for local server development.
See [`docs/PRODUCT.md`](docs/PRODUCT.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/ACTION_POLICY.md`](docs/ACTION_POLICY.md), [`docs/GMAIL_EXECUTOR.md`](docs/GMAIL_EXECUTOR.md), [`docs/ALPHA7_ACCEPTANCE.md`](docs/ALPHA7_ACCEPTANCE.md) and [`docs/ROADMAP.md`](docs/ROADMAP.md) for the working design and current gate.
