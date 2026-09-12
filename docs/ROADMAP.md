# Carry — roadmap

## Current focus — Android Alpha #6: finish the Alpha 2 hand-back loop

The working-alpha backend gate has passed and real on-device service/repair tests have proved the core loop: Carry can understand a problem, use location, research relevant options and turn that research into an actionable recommendation with verified contact routes and a prepared next step.

CRUD, explicit completion feedback, consequence-based approvals, evidence-backed Waiting and outcome verification are now implemented. Carry distinguishes what the model believes from what actually happened: approval is permission, execution evidence proves an external side effect, Waiting requires a real dependency, and Done requires confirmation or trusted verification.

The first real executor is now implemented behind that contract: when Carry has a verified email contact and prepared message, a configured Gmail mailbox can send the exact approved message, record Gmail message/thread evidence, enter Waiting and resume when a reply is detected.

The remaining Alpha 2 work is therefore mostly proving the loop on-device, reducing interruptions, adding hand-back-only notifications and measuring whether Carry actually reduces human effort.

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
- [ ] local optimistic UI while server work continues outside case hand-backs

**Golden path:** “My gutter is blocked” → useful household case with sensible next actions.

**Status:** backend/capture contract complete enough for working alpha; capture optimistic polish remains.

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

### Case ownership and learning

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

### Hand-backs and action safety — current

- [x] four explicit user-facing states: Needs you / Carrying / Waiting / Done
- [x] calm state surface instead of generic working copy
- [x] optimistic UI when a hand-back is answered, a failed run is retried or a case is manually completed
- [x] explicit approval decision input for consequential external actions
- [x] distinct `approval_granted` and `approval_declined` events
- [x] consequence policy documented: approval is scoped authorisation, never proof of execution
- [x] runner told not to request approval when no execution capability exists
- [x] server-side executor evidence contract for attempted/completed/failed actions
- [x] authenticated executor callback boundary separate from the mobile client
- [x] structured Waiting metadata with executor, action, external reference and optional re-check time
- [x] reject model-generated Waiting when no structured external dependency exists
- [x] external update clears Waiting and resumes the bounded runner
- [x] explicit completion confirmation hand-back: Yes, it’s done / Not yet
- [x] model-generated Done is treated as a proposal and cannot close a case itself
- [x] manual completion goes through one trusted completion boundary
- [x] authenticated external `outcome_verified` boundary can close a case with evidence
- [x] first real executor: approved Gmail send with message/thread evidence
- [x] executable email approvals only appear with a verified email contact + prepared message + configured Gmail mailbox
- [x] Gmail sends move into evidence-backed Waiting rather than Done
- [x] 15-minute Gmail reply polling wakes waiting cases and resumes Carry with reply content
- [x] execution/waiting and outcome-verification smoke harnesses ready for a deployed executor secret
- [ ] configure production Gmail OAuth, executor and cron secrets
- [ ] test approval → Gmail send → Waiting → reply → resume end-to-end in production
- [ ] test decline → alternate route on-device/API
- [ ] test model-proposed completion → confirm / not yet on-device
- [ ] run execution/waiting and verification smokes against production after executor secret is configured

### Usability/reliability still to test

- [ ] gutter case with location permission denied → pin/postcode fallback still works
- [ ] repeat at least one complete flow through voice
- [ ] deliberately exercise failure + retry on-device
- [ ] reduce unnecessary human touches beyond the current hand-back improvements

### Still required before Alpha 2 is genuinely complete

- [x] robust `waiting` behaviour for real external dependencies
- [x] stronger outcome verification/completion semantics
- [x] first real consequential executor behind the evidence contract
- [ ] notifications only for genuine hand-backs
- [ ] evaluation for interruption rate, human touches and time-to-first-useful-action

Golden paths:

- gutter problem → research local options → concise recommendation → verified email route → prepared enquiry → one approval → Gmail send → Waiting → reply resumes case
- MOT → determine due state → shortlist/book with approval when an executor exists
- purchase → requirements → shortlist → recommendation
- correction → edit brief → Carry re-plans from the corrected intent
- completion → Carry proposes done → user confirms or external verifier proves it → feedback → future similar case can use that signal
- consequential action → Carry prepares → asks once → approve/decline event → executor attempted/completed evidence → Waiting where needed → external update → verify

**Exit:** several different real-life cases can be handed to Carry and materially advanced with low user effort, clear evidence, safe hand-backs and no fake agency; users remain in control of the case lifecycle.

## Alpha 3 — connected work

Do **not** rush here before the Alpha 2 on-device loop feels good. The connectors should increase what Carry can carry, not hide weaknesses in the core interaction model.

### Gmail

- [x] provider boundary for outbound Gmail send
- [x] reply detection for Carry-sent threads
- [ ] per-user OAuth connection rather than one alpha mailbox
- [ ] read/search existing inbox context
- [ ] resolve people/conversations from natural-language references
- [ ] draft replies inside existing Gmail threads
- [ ] attachments
- [ ] push/watch delivery instead of polling where worthwhile

### Other connected work

- [ ] Google Calendar
- [ ] files
- [ ] GitHub
- [ ] spaces (Personal / Work etc.)
- [ ] communication and coding case recipes

Golden paths:

- “Respond to Dan” → find the conversation → understand context → draft → approval → send → wait for reply
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
