# Carry delegation experience — acceptance notes

This slice makes the existing Alpha 2 engine feel like delegation rather than case management. It does not loosen the consequence policy or add broad new executors.

## What changed

- **Now is a hand-back surface.** Needs-you cases expose the actual decision instead of forcing the user to open and inspect each case.
- **Approvals are exact actions.** Executable email approval shows recipient, subject and body and uses the same server-side approval boundary as case detail.
- **Case detail is quieter.** Outcome/current state/hand-back stay primary; Plan, History and Manage are collapsible.
- **Waiting has a follow-up horizon.** Gmail waits get a two-working-day check point. A missed reply check wakes the case; it does not silently send a chase.
- **Tell Carry routes commands.** New outcomes create cases; clear references can update an active case; global status questions do not create junk cases.
- **Notifications are hand-back-only.** Devices register for Expo push and Carry emits a notification only when a case genuinely enters Needs you.
- **You is a trust centre.** It exposes current connections, enforced permission boundaries and explicit learning signals.
- **Effort is visible.** Case detail derives hand-backs, responses, autonomous actions and external actions from the event log.

## Migration / build requirements

Apply:

`db/migrations/0002_push_devices.sql`

The mobile build now uses `expo-notifications`, so make a fresh native/EAS build before testing remote notifications.

## Device acceptance

1. Create several cases. Confirm **Now** lets you clear approval and completion hand-backs without opening each case.
2. Exercise an executable Gmail hand-back. Confirm the exact recipient, subject and body are visible before **Send this**.
3. Decline that send. Confirm nothing is sent and Carry finds another route.
4. Use **Tell Carry** for:
   - a new case;
   - “not Wednesday” or another clear update to an active case;
   - “what needs me?”.
   Confirm only the first creates a new case.
5. Send a real email. Confirm Waiting says what it is waiting for and exposes the planned follow-up check.
6. Let a reply arrive. Confirm the case resumes.
7. Exercise the follow-up check with no reply. Confirm the case wakes without sending a chase by itself.
8. Allow notifications on a physical device, then cause a case to newly enter Needs you. Confirm one useful notification deep-links to that case.
9. Confirm research/progress events do **not** create notifications.
10. Open **You** and verify connection state, permission boundaries and recent explicit learning are legible.
11. Complete a case and inspect the effort summary. Check the event-derived counts make sense.

## Safety invariants

- Notification delivery failure must never fail case progress.
- Inline approval uses the normal `/respond` endpoint; there is no client-only shortcut.
- Approval is still permission, not proof of execution.
- Waiting still requires execution evidence.
- A follow-up deadline is a reason to resume reasoning, not permission to contact someone.
- Standing permission boundaries remain read-only until there is a complete persisted enforcement path.
