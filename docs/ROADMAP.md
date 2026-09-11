# Carry — roadmap

## Current focus — Android Alpha #6: manage, finish and teach Carry

The working-alpha backend gate has passed and real on-device service/repair tests have proved the core loop: Carry can understand a problem, use location, research relevant options and turn that research into an actionable recommendation with verified contact routes and a prepared next step.

The next gap is basic case ownership. A user must be able to correct a case, finish it and remove it without fighting the agent. Those actions are also valuable learning signals: Carry should know when its interpretation was edited, when the user says the outcome is complete, and whether it handled the case well.

The immediate priority is therefore **case management + the first explicit learning loop**. Deeper preference learning remains a later evaluation/learning phase; this slice records explicit feedback and makes it available as soft context for future cases without pretending the model has permanently retrained itself.

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

### Implemented

- [x] bounded `runCase` / `advanceCase` orchestration loop
- [x] grounded web research worker with captured source evidence
- [x] action lifecycle events (`action_started`, `action_completed`, `action_failed`)
- [x] `needs_user` decision/fact hand-backs
- [x] decision API and automatic resume
- [x] structured foreground location hand-backs with device, pin and text fallbacks
- [x] optional search radius only where distance matters
- [x] researched household-service, purchase and general web/admin recipes
- [x] failures surfaced as failures with retry paths
- [x] production reliability gate across text + voice
- [x] no more than three strong local-service options
- [x] evidence-backed phone/email/contact-form/website routes
- [x] visually prioritised recommendation
- [x] prepared enquiry / quote request / call brief
- [x] raw sources collapsed behind evidence disclosure
- [x] production actionable-results gate across gutter/purchase/admin recipes

### Case ownership — current

- [x] edit/rename a case
- [x] changing the underlying brief re-understands the case and automatically resumes Carry
- [x] prior evidence becomes historical after a substantive edit rather than being shown as current
- [x] mark a case complete manually
- [x] completed cases leave Now but remain visible in Cases
- [x] permanently delete a case and its case history
- [x] ask for lightweight completion feedback: yes / mostly / no + optional correction note
- [x] feed recent explicit feedback back into future case understanding and bounded runs as soft context
- [ ] test edit → re-plan → continue on-device
- [ ] test complete → feedback → later similar case on-device
- [ ] test delete and completed-case behaviour on-device

### Usability/reliability still to test

- [ ] gutter case with location permission denied → pin/postcode fallback still works
- [ ] repeat at least one complete flow through voice
- [ ] deliberately exercise failure + retry on-device
- [ ] tighten Working / Waiting / Needs you / Done language and visual hierarchy
- [ ] reduce unnecessary human touches and generic progress copy
- [ ] add optimistic UI where it materially improves perceived responsiveness

### Still required before Alpha 2 is genuinely complete

- [ ] consequence-based approval policy for consequential external actions
- [ ] robust `waiting` behaviour for real external dependencies
- [ ] notifications only for genuine hand-backs
- [ ] stronger outcome verification/completion semantics
- [ ] evaluation for interruption rate, human touches and time-to-first-useful-action

Golden paths:

- gutter problem → research local options → concise recommendation → verified contact route → booking/enquiry boundary
- MOT → determine due state → shortlist/book with approval
- purchase → requirements → shortlist → recommendation
- correction → edit brief → Carry re-plans from the corrected intent
- completion → user marks done → gives feedback → future similar case can use that explicit signal

**Exit:** several different real-life cases can be handed to Carry and materially advanced with low user effort, clear evidence, safe hand-backs and no fake agency; users remain in control of the case lifecycle.

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

The explicit per-case feedback added during Alpha 2 is the first input to this phase, not the finished learning system.

- [x] capture explicit per-case quality feedback
- [x] make recent explicit feedback available to future case reasoning
- [ ] inspectable working preferences
- [ ] preference proposals from repeated behaviour
- [ ] distinguish stable preferences from one-off corrections
- [ ] per-case outcome evaluation
- [ ] interruption-rate metric
- [ ] human-touches-per-completed-case metric
- [ ] action success/failure and rollback metrics
- [ ] cost/token/model-efficiency harnesses
- [ ] user-visible explanation of what Carry has learned and the ability to correct it

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
