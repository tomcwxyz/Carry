# Carry — roadmap

## Current focus — working alpha gate

The installed Android build has proved the shell, persistence and case-loading path. We will now iterate on the Vercel backend without publishing another APK until Carry can materially advance a case.

The release/test contract is in [`WORKING_ALPHA_PLAN.md`](./WORKING_ALPHA_PLAN.md). In particular, do not touch `.eas/android-alpha-trigger` simply to package a backend fix. The next Android build happens only after the working-alpha gate passes.

Roadmap alpha numbers describe capability stages; GitHub/Android build numbers are only build artefacts.

## Alpha 0 — mobile foundation

- [x] product principles and case model documented
- [x] mobile-first Expo shell
- [x] Now / Cases / You information architecture
- [x] native microphone recording path
- [x] case detail with outcome, plan, activity and decision surface
- [x] capture-service adapter boundary
- [ ] CI green on the initial scaffold

Exit: the app can be installed and the intended interaction model is tangible without pretending the agent backend exists.

## Alpha 1 — capture → case

- [x] voice upload + transcription path
- [x] text and voice produce the same structured capture envelope
- [x] Neon case/event schema
- [ ] reliable outcome/domain/entity extraction in production
- [x] ambiguity policy: infer when safe, ask only when materially blocked
- [x] case created immediately after capture
- [ ] first bounded orchestration run
- [ ] local optimistic UI while server work continues

**Golden path:** “My gutter is blocked” → useful household case with sensible next actions.

## Alpha 2 — Carry actually carries

- web research worker
- waiting/needs-user state transitions
- approvals with consequence-based policy
- notifications only for genuine hand-backs
- resume after user decision
- verification/completion

Golden paths:

- gutter problem → research local options → concise booking decision
- MOT → determine due state → shortlist/book with approval
- purchase → requirements → shortlist → recommendation

## Alpha 3 — connected work

- Gmail
- Google Calendar
- files
- GitHub
- spaces (Personal / Work etc.)
- communication and coding case recipes

Golden paths:

- “Respond to Dan” → context → draft → approval/send
- “Get this release ready” → repository → checks → PR/release hand-back

## Alpha 4 — context, camera and sharing

- camera capture
- share sheet
- household/vehicle/appliance operational entities
- people and places
- lightweight recurring responsibilities
- “prevent this next time” suggestions

## Alpha 5 — learning and evaluation

- inspectable working preferences
- preference proposals from repeated behaviour
- per-case outcome evaluation
- interruption-rate metric
- human-touches-per-completed-case metric
- action success/failure and rollback metrics
- cost/token/model-efficiency harnesses

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
