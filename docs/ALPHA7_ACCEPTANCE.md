# Android Alpha 7 — acceptance gate

Alpha 7 is the first Android build containing the complete current Alpha 2 interaction model: explicit hand-backs, consequence-based approval, evidence-backed execution and Waiting, outcome verification, case ownership and the Gmail executor.

This is a **calibration gate**. Do not add more connectors simply to make a scenario pass. Record where Carry needs too much help, asks the wrong thing, overstates what happened or leaves the user unsure what to do.

## What success feels like

For each case, ask:

- Did Carry correctly understand the outcome?
- Did it take every safe and useful step before interrupting?
- Was each hand-back necessary, specific and easy to answer?
- Did Carry clearly distinguish preparing, approving, doing, waiting and completing?
- Could the user tell what had actually happened from evidence rather than model prose?
- Was the case materially further forward than when it was handed over?
- Did using Carry require less attention than doing the work directly?

## Device scenarios

### 1. Household / local service

Capture by voice: **My gutter is blocked.**

Pass if Carry creates the case, asks for location only when useful, returns geographically sensible grounded options, foregrounds no more than three strong choices, prepares a clear next step, and keeps evidence legible.

Repeat with location permission denied. The pin/postcode/text fallback must still let the case progress.

### 2. Real email execution

Use a case where research finds a genuine verified email route.

Pass if Carry prepares a sensible message before permission; approval shows the exact recipient, subject and body; decline sends nothing; approval records attempted and completed separately; a successful send has real Gmail evidence; the case moves to Waiting; a real reply wakes the case; and Carry uses the reply as new evidence.

**This is the critical Alpha 7 end-to-end gate.**

### 3. Completion semantics

Exercise both branches of a model-proposed completion.

Pass if **Yes, it’s done** closes the case, **Not yet** keeps it active and resumes sensibly, model text alone never closes a case, and completed cases leave Now but remain in Cases.

### 4. Edit / re-plan

Take an active case and materially change the brief.

Pass if Carry re-understands the new intent, keeps prior evidence historical, starts a new bounded run and produces a plan consistent with the edit.

### 5. Purchase / research

Example: **Find me a quiet mechanical keyboard for a Windows PC, UK layout, wireless, under £100. I care more about quiet typing and build quality than gaming.**

Pass if Carry produces a grounded, concise recommendation without inventing an approval or execution capability it does not have.

### 6. Failure and retry

Deliberately exercise at least one recoverable failure.

Pass if failure is visibly a failure, retry is obvious, retry cannot duplicate a completed external action, and Carry resumes from durable state rather than starting again.

### 7. CRUD and learning

Exercise rename/edit, manual complete, Yes / Mostly / No feedback with a correction, delete, and a later similar case.

Pass if lifecycle behaviour is predictable and recent explicit feedback is used as soft context rather than an uninspectable hard rule.

## Effort observations

| Measure | Record |
| --- | --- |
| Time to first useful action | seconds/minutes |
| Human hand-backs | count |
| Human answers actually necessary | count |
| Avoidable interruptions | count |
| External actions attempted | count |
| External actions succeeded | count |
| Case materially advanced? | yes / partly / no |
| Case completed? | yes / no |
| Reopened / incorrectly completed? | yes / no |
| Notes | short free text |

The main product signal is not time in the app. It is whether Carry reduces the human attention needed to get outcomes.

## Stop conditions

Do not call Alpha 2 complete if Carry regularly asks questions it could safely answer itself; approval is confused with execution; Waiting appears without a real dependency; Done appears without confirmation or trusted evidence; an external action can occur without the user understanding what they approved; voice is materially worse than text; or a common failure leaves a case stuck.

## After the gate

Fix calibration and reliability issues first. When several different real-life cases pass with low user effort, move to hand-back-only notifications, automatic outcome/effort evaluation, then Alpha 3 connected work.
