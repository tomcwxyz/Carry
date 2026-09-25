import { getOwnerLearningSignals } from '../src/server/case-learning.js';
import { getSql } from '../src/server/db.js';
import { gmailEmailConfigured } from '../src/server/email-executor.js';

export async function GET(request: Request) {
  const ownerKey = request.headers.get('x-carry-owner') ?? 'alpha-local';
  const sql = getSql();
  const learning = await getOwnerLearningSignals(ownerKey, undefined, 6);
  let registeredDevices = 0;
  try {
    const [deviceCount] = await sql`
      SELECT count(*)::int AS count
      FROM carry_push_devices
      WHERE owner_key = ${ownerKey} AND enabled = true
    `;
    registeredDevices = Number(deviceCount?.count ?? 0);
  } catch (error) {
    // Keep the trust centre usable during the additive migration rollout.
    console.warn('carry_push_devices_unavailable', { error });
  }

  return Response.json({
    spaces: [
      { id: 'personal', label: 'Personal' },
      { id: 'work', label: 'Good Ship' },
    ],
    connections: [
      { id: 'gmail', label: 'Gmail', connected: gmailEmailConfigured(), detail: gmailEmailConfigured() ? 'Can send approved messages and notice replies.' : 'Not connected.' },
      { id: 'notifications', label: 'Hand-back notifications', connected: registeredDevices > 0, detail: registeredDevices > 0 ? 'Carry can notify this device when something genuinely needs you.' : 'Open Carry on a physical device and allow notifications.' },
      { id: 'calendar', label: 'Calendar', connected: false, detail: 'Next connected-work capability.' },
    ],
    permissions: [
      { id: 'research', label: 'Research, compare and prepare', policy: 'Carry can do this without asking.' },
      { id: 'send', label: 'Send messages', policy: 'Ask immediately before each exact send.' },
      { id: 'book', label: 'Make or change bookings', policy: 'Ask before the external action.' },
      { id: 'spend', label: 'Spend money', policy: 'Always ask.' },
      { id: 'publish', label: 'Publish or change access', policy: 'Always ask.' },
      { id: 'destructive', label: 'Delete or destructive external changes', policy: 'Always ask.' },
    ],
    learning,
  });
}
