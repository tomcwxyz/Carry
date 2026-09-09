# Carry — roadmap

## Current focus — Android Alpha #4: prove that Carry carries

The working-alpha backend gate has passed: 10/10 consecutive production text captures, the real multipart voice path, grounded household/purchase/admin recipes and CI are green. Android Alpha #4 packages the first version intended to materially advance a case rather than simply capture and persist it.

The immediate priority is now **on-device usability and outcome testing**, not adding more connectors. We need to prove that a user can hand Carry something real, have Carry do useful bounded work, and only be interrupted when a fact, decision or consequential approval is genuinely required.

Roadmap alpha numbers describe capability stages; GitHub/Android build numbers are build artefacts.

## Alpha 0 — mobile foundation

- [x] product principles and case model documented
- [x] mobile-first Expo shell
- [x] Now / Cases / You information architecture
- [x] native microphone recording path
- [x] case detail with outcome, plan, activity and decision surface
- [x] capture-service adapter boundary
- [x] CI/typecheck green

**Status:** complete.

## Alpha 1 — capture → case

- [x] voice upload + transcription path
- [x] text and voice produce the same structured capture envelope
- [x] Neon case/event schema
- [x] reliable bounded outcome/domain/entity extraction in production
- [x] ambiguity policy: infer when safe, ask only when materially blocked
- [x] case created immediately after capture
- [x] first bounded orchestration run
- [x] visible fallback/failure state rather than pretending understanding succeeded
- [ ] local optimistic UI while server work continues

**Golden path:** “My gutter is blocked” → useful household case with sensible next actions.

**Status:** backend/capture contract complete enough for working alpha; optimistic mobile polish remains.

## Alpha 2 — Carry actually carries

### Implemented in the working-alpha slice

- [x] bounded `runCase` / `advanceCase` orchestration loop
- [x] grounded web research worker with captured source evidence
- [x] action lifecycle events (`action_started`, `action_completed`, `action_failed`)
- [x] `needs_user` decision/fact hand-backs
- [x] decision API and automatic resume
- [x] structured foreground location hand-backs with device, pin and text fallbacks
- [x] optional search radius only where distance matters
- [x] researched household-service, purchase and general web/admin recipes
- [x] failures surfaced as failures with retry paths
- [x] no knowingly fake booking/send/action buttons in the working-alpha flow
- [x] production reliability gate across text + voice

### Alpha 2 usability/reliability pass — current

- [ ] test Android Alpha #4 end-to-end on a real device
- [ ] gutter case: location → grounded shortlist → useful booking/enquiry hand-back
- [ ] gutter case with location permission denied → pin/postcode fallback still works
- [ ] purchase case → comparison → recommendation → clear remaining decision
- [ ] general admin/web case → evidence → next useful action
- [ ] repeat at least one complete flow through voice
- [ ] deliberately exercise failure + retry on-device
- [ ] tighten Working / Waiting / Needs you / Done language and visual hierarchy
- [ ] reduce unnecessary human touches and generic progress copy
- [ ] make evidence/results quickly scannable on mobile
- [ ] add optimistic UI where it materially improves perceived responsiveness

### Still required before Alpha 2 is genuinely complete

- [ ] consequence-based approval policy for consequential external actions
- [ ] robust `waiting` behaviour for real external dependencies
- [ ] notifications only for genuine hand-backs
- [ ] stronger outcome verification/completion semantics
- [ ] evaluation for interruption rate, human touches and time-to-first-useful-action

Golden paths:

- gutter problem → research local options → concise booking/enquiry decision
- MOT → determine due state → shortlist/book with approval
- purchase → requirements → shortlist → recommendation

**Exit:** several different real-life cases can be handed to Carry and materially advanced with low user effort, clear evidence, safe hand-backs and no fake agency.

## Alpha 3 — connected work

Do **not** rush here before the Alpha 2 on-device loop feels good. The connectors should increase what Carry can carry, not hide weaknesses in the core interaction model.

- [ ] Gmail
- [ ] Google Calendar
- [ ] files
- [ ] GitHub
- [ ] spaces (Personal / Work etc.)
- [ ] communication and coding case recipes

Golden paths:

- “Respond to Dan” → context → draft → approval/send
- “Get this release ready” → repository → checks → PR/release hand-back

## Alpha 4 — context, camera and sharing

- [ ] camera capture
- [ ] share sheet
- [ ] household/vehicle/appliance operational entities
- [ ] people and places
- [ ] lightweight recurring responsibilities
- [ ] “prevent this next time” suggestions

## Alpha 5 — learning and evaluation

- [ ] inspectable working preferences
- [ ] preference proposals from repeated behaviour
- [ ] per-case outcome evaluation
- [ ] interruption-rate metric
- [ ] human-touches-per-completed-case metric
- [ ] action success/failure and rollback metrics
- [ ] cost/token/model-efficiency harnesses

## North-star metrics

Carry should optimise for outcomes rather than engagement:

- cases completed
- cases materially advanced
- median human touches per completed case
- unnecessary interruption rate
- time from capture to first useful action
- safe autonomous actions per case
- reopened/incorrectly-completed cases

Time-in-app and number-of-created-tasks are explicitly not north-star metrics.
