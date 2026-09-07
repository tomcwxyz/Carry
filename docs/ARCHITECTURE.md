# Carry — architecture

## Shape

Carry separates the mobile capture/control surface from persistent case state and bounded agent runs.

```text
voice / text / camera / share
            │
            ▼
       Capture layer
            │
            ▼
        Case engine
      ┌─────┼─────┐
      ▼     ▼     ▼
   policy memory context
      └─────┼─────┘
            ▼
      next safe action
            │
            ▼
    specialist worker
            │
  ┌─────────┼─────────┐
  ▼         ▼         ▼
 web     comms     services
 files   calendar   GitHub
            │
            ▼
 result / wait / ask / done
            │
            ▼
       case event log
```

## Mobile

- Expo / React Native / TypeScript
- Expo Router
- `expo-audio` for native microphone capture
- development builds rather than treating Expo Go as the production development environment
- camera, share sheet and push notifications added as native capabilities rather than web fallbacks

## Backend direction

- TypeScript services deployed independently from the mobile bundle
- Neon Postgres
- Drizzle ORM
- append-oriented `case_events` plus materialised current case state
- server-side tool credentials only
- bounded orchestration runs rather than a single immortal chat thread

## Agent boundary

Every run receives a compact case snapshot and emits a structured result:

```ts
type RunResult =
  | { kind: 'progress'; events: CaseEvent[]; nextAction: Action }
  | { kind: 'needs_user'; decision: Decision; events: CaseEvent[] }
  | { kind: 'waiting'; condition: WaitingCondition; events: CaseEvent[] }
  | { kind: 'done'; verification: Verification; events: CaseEvent[] };
```

The model proposes. The policy layer decides whether a proposed action may execute. Tool output becomes evidence/events; it is never silently discarded into chat history.

## Event model

Important events include:

- captured
- understood
- plan_created / plan_changed
- action_started / action_completed / action_failed
- message_prepared / message_sent / response_received
- decision_requested / decision_made
- waiting_started / waiting_resolved
- case_completed / case_reopened
- preference_proposed / preference_confirmed

This supports reliability, auditability, evaluation and later learning without relying on model memory.

## Tool architecture

Specialist adapters hide provider details from the case engine:

- research
- email/comms
- calendar/scheduling
- files/documents
- purchasing/bookings
- coding/GitHub

A case plan names capabilities, not vendors. For example, `find_local_service` can later be backed by web/business search, a marketplace API or a specific provider without changing case state.

## Voice capture

The mobile shell records audio natively and passes only the resulting URI into the capture service adapter. The next backend slice will:

1. upload the recording securely
2. transcribe it
3. extract an initial outcome, domain, entities and ambiguity level
4. create the case + capture event atomically
5. enqueue/trigger the first bounded Carry run
6. return the new case id immediately

Raw audio retention should be short by default and separately configurable from the durable transcript/case event.
