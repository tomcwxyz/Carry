# Carry — product design

## One sentence

Carry is a mobile-first agent that helps people get real things sorted, rather than merely remembering that they need doing.

## The core object: a case

A task records an obligation. A **case** records an outcome Carry is trying to reach.

A case contains:

- what good looks like (`outcome`)
- what Carry currently believes is happening
- the current and next safe actions
- a plan that can change as evidence arrives
- people, places, things, sources and artefacts
- decisions and approvals that genuinely need the user
- waiting conditions
- a durable activity/event history

Examples range from “my gutter is blocked” and “book the MOT” to “finish this proposal” and “get the next release ready”.

## Human-facing states

Carry exposes only four top-level states:

1. **Needs you** — Carry has reached a judgement, approval or physical action it cannot sensibly replace.
2. **Carrying** — Carry can progress the case independently.
3. **Waiting** — an external person, appointment or condition has to happen before progress resumes.
4. **Done** — the outcome has been reached and, where appropriate, verified.

The internal state machine may be richer. The user should not have to manage it.

## Primary loop

`Capture → Understand → Act → Hand back → Wait → Resume → Complete → Learn`

The defining behaviour is **Keep going until you need me**. Carry should take every safe, useful step it can before interrupting.

## Mobile interaction

Voice is the standard interaction, not a transcription accessory. The user can say:

- “My gutter is blocked.”
- “Sort out the MOT.”
- “Not Wednesday.”
- “Take the cheapest sensible one.”
- “Chase them.”
- “What still needs me?”
- “I've got twenty minutes — what can we finish?”

Camera, sharing and text are peer inputs. Chat is a control mechanism inside a case, not a separate destination.

## Navigation

### Now

The default screen. It prioritises `Needs you`, then shows concise `Carrying` and `Waiting` sections. It answers: **what actually needs me?**

### Cases

The durable record of everything Carry is sorting or has sorted.

### You

Spaces, connections, permissions, operational context and inspectable working preferences.

A persistent **Tell Carry** voice control sits above navigation.

## Permission principle

Permission is based on consequence rather than tool call frequency.

Carry should normally be free to read connected context, research, analyse, compare, prepare drafts and create its own artefacts. Standing policies can permit low-risk routine actions. Spending money, signing contracts, publishing externally, destructive actions and sensitive communications require explicit policy/approval.

## Notification principle

**Interrupt only when Carry cannot reasonably continue.**

Do not notify users that research started, three options were found, or a plan changed. Notify them when one concise action unlocks progress.

## Alpha success test

Give Carry ten messy things in the morning. By lunch, some should be finished, several materially moved forward, some waiting on others, and the user should see only the decisions or actions that genuinely require them.
