# Carry — action and approval policy

Carry should do safe work without asking, interrupt only at a genuine consequence boundary, and never confuse approval with execution.

## 1. Autonomous work

Carry can perform these without approval when the required capability is available:

- understand and structure a case;
- research current information and options;
- compare and shortlist;
- draft messages, enquiries, call briefs and forms;
- organise case evidence and plans;
- retry failed internal work that has no external side effect.

These actions can create `action_started`, `research_completed`, `action_completed` and `action_failed` events.

## 2. Consequential external actions

Carry must ask for an explicit approval immediately before one specific external action when that action would:

- send or publish something;
- make, change or cancel a booking;
- commit money or place an order;
- create, edit or delete an external record;
- change permissions or access;
- submit a form or request that has a real-world consequence;
- perform another externally visible or hard-to-reverse side effect.

The hand-back uses `decisionInput.kind = approval`. The user can approve or decline. Carry records `approval_granted` or `approval_declined` as a distinct event.

Approval is narrowly scoped to the action described in that event. It is not standing permission for similar future actions.

## 3. Approval is not execution

An `approval_granted` event means only that Carry is authorised to attempt that action. It must not move a case to Waiting or Done until an executor/tool records evidence that the action actually happened.

If Carry has no execution capability for the proposed action, it must not ask for an approval that it cannot use. Instead it should prepare as much as possible and make the remaining human step precise.

This distinction is central to Carry's event model:

`prepared → approved → attempted → externally completed → waiting → external update → outcome verified`

Those are separate facts.

## 4. Executor evidence

Every external executor reports its lifecycle through the server-side execution boundary. Executor callbacks are authenticated separately from the mobile client and can record:

- `execution_attempted` — Carry has begun the external side effect;
- `execution_completed` — the external system confirms the side effect occurred;
- `execution_failed` — the attempt did not complete;
- `external_update` — something outside Carry changed after a completed action, such as a reply or status change.

Executor events should include the executor name, the concrete action, a concise summary and any available external reference. An external reference is evidence and a correlation handle; it is not required to be user-facing.

## 5. Waiting is evidence-backed

Waiting is not a synonym for “Carry has nothing else to do”. A case can enter Waiting only when there is structured evidence that a real external dependency is in motion.

A valid Waiting record stores at least:

- what Carry is waiting for;
- which executor/action created the dependency;
- when waiting began;
- an external reference where one exists;
- an optional `checkAfter` time for future polling or scheduled re-checks.

A model-generated Waiting state without this structured evidence is rejected and Carry continues instead. A later `external_update` clears Waiting and resumes the bounded runner.

## 6. Human-only actions

Some steps remain genuinely human, for example a physical repair, attending an appointment, making a phone conversation where no calling agent exists, identity verification or a judgement that the user must personally make.

Carry should not frame these as approvals. It should use a normal fact/decision hand-back, minimise the work required from the user, and resume as soon as the result is supplied.

## 7. Declines

A decline is useful context, not a failure. Carry should record it and look for a materially different route rather than immediately asking the same question again.

## 8. Notification implication

Notifications should eventually be generated from hand-back transitions, not from every case event. A notification is justified when a case newly enters `needs_user`, particularly for an approval or genuinely blocking fact. Waiting should normally stay quiet until an external update changes the case or Carry genuinely needs the user again.
