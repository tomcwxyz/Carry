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

## Alpha

Alpha 0 established the native mobile shell. Alpha 1 added the real voice/text → persisted case loop. Alpha 2 adds bounded execution:

`capture → understand → bounded Carry run → persisted action/evidence → continue or precise hand-back`

The Alpha 2 golden path remains:

> “My gutter is blocked.”

Carry should now research the situation automatically, record what it found, update the case and stop only when it needs a fact or approval from the user.

### Required environment

```bash
EXPO_PUBLIC_CARRY_API_URL=
DATABASE_URL=
OPENAI_API_KEY=
AI_GATEWAY_API_KEY=
```

Optional overrides include `CARRY_CASE_MODEL`, `CARRY_TRANSCRIPTION_MODEL` and `CARRY_RESEARCH_MODEL`.

Initial case archetypes:

- household problem — “My gutter is blocked”
- life admin — “I need an MOT”
- communication — “I need to respond to Dan”
- research/purchase — “Find us a new dishwasher”
- work — “Get this proposal finished”
- coding — “Get Ship Check alpha ready”

See [`docs/PRODUCT.md`](docs/PRODUCT.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/ROADMAP.md`](docs/ROADMAP.md) and [`docs/ALPHA2.md`](docs/ALPHA2.md).
