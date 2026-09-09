# Carry — working alpha plan

## Why this exists

The installed Android alpha is now good enough to test the mobile shell: capture, persistence, case lists and case detail all work. The next APK should not be another packaging checkpoint. It should be the first build in which Carry can materially advance a case.

Until the working-alpha gate below passes, iterate on the backend through Vercel and do **not** change `.eas/android-alpha-trigger` or publish another APK.

## What failed in the current alpha

The 9 September test successfully persisted the capture and case, but case understanding failed because the server sent `openai/gpt-5.6-luna` through Vercel AI Gateway and the Gateway account did not permit that model. The API deliberately fell back to a saved-but-unanalysed case, so the app returned HTTP 200 and showed `Carry saved this, but could not analyse it yet.`

The immediate fix is to use the existing server-side `OPENAI_API_KEY` directly for case understanding and keep Gateway as an optional future worker route.

## Release rule

There are two independent loops:

1. **Backend loop** — merge server changes, let Vercel deploy them, run smoke/golden-path tests, inspect runtime logs. No Android build required.
2. **Mobile release loop** — build an APK only after the backend contract and the required mobile controls are proven.

GitHub pre-release numbers are build artefacts, not product roadmap stages. Roadmap Alpha 1/2/etc. describe capability, not how many APKs we have produced.

## Working-alpha scope

The first genuinely useful alpha does not need every connector. It does need one complete, honest loop:

`capture → understand → do bounded work → record evidence → hand back only when needed → resume → verify`

For this gate, Carry should support three small recipes:

### 1. Household service

Example: `My gutter is blocked` or `I need an outside tap installed`.

Carry should:

- infer the likely service type and safe scope;
- identify the minimum missing fact only when genuinely required (usually location/postcode);
- research suitable providers when location is available;
- create a concise shortlist with evidence, not invented ratings or availability;
- prepare the useful next step, such as an enquiry/booking brief;
- stop at an explicit decision before any consequential external action.

### 2. Purchase research

Carry should research options against stated requirements, compare evidence, make a recommendation and explain the remaining decision.

### 3. General web/admin research

Carry should be able to answer a bounded factual/admin task with current web evidence and turn the result into the next useful action rather than just summarising it.

## Backend slices before the next APK

### A. Stabilise capture and understanding

- direct OpenAI case understanding;
- structured output validation;
- degraded/fallback cases clearly recorded as failures rather than silently treated as understood;
- production smoke harness;
- clean runtime logs across repeated captures.

### B. Add a bounded case runner

Create a `runCase(caseId)` boundary that accepts the current case snapshot and returns one of:

- `progress` — useful work completed, continue;
- `needs_user` — one concrete decision/fact is required;
- `waiting` — Carry is waiting on an external condition;
- `done` — outcome verified.

Every run writes `action_started`, `action_completed` or `action_failed` events. No action exists only as prose in the model context.

### C. Add a real research worker

Use a web-search-capable model/tool for current research. Store useful evidence in case events/results. The model may propose work, but provider claims, prices, availability and contact details must come from tool evidence.

### D. Add decision/resume API

Add an endpoint that records a user's decision or missing fact and resumes the case runner. Test this through the API before adding mobile controls.

### E. Only then update the mobile surface

The next APK needs only the controls the proven backend contract requires:

- show evidence/results rather than generic `Carry is working it out` copy;
- show one decision/approval card when `needs_user`;
- submit the decision and refresh/resume;
- never render a button unless it is wired to a real API action.

## Working-alpha gate

Do not build the next Android alpha until all of these pass:

- [ ] 10 consecutive text captures are understood without fallback or runtime errors;
- [ ] voice capture transcribes and follows the same path;
- [ ] the production smoke command passes against Vercel;
- [ ] household-service case with a supplied location reaches a researched shortlist or a precise hand-back;
- [ ] purchase case produces a researched comparison and recommendation;
- [ ] decision API records a choice/fact and resumes the case;
- [ ] action events make it clear what Carry actually did;
- [ ] failures are visible, retryable and never presented as successful work;
- [ ] no fake booking/send/action buttons remain;
- [ ] CI/typecheck is green;
- [ ] runtime logs are clean for the golden-path run set.

When this gate passes, make one Android build and test the whole flow on-device. That build is the next meaningful alpha.

## Production smoke

Run:

```bash
npm run smoke:alpha
```

or against another deployment/prompt:

```bash
CARRY_API_URL=https://example.vercel.app npm run smoke:alpha -- "My gutter is blocked"
```

The smoke owner is isolated from the normal `alpha-local` case list so repeated backend tests do not pollute the installed app.
