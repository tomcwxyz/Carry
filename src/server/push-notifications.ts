import { getSql } from './db.js';

export async function notifyCaseNeedsUser(caseId: string, ownerKey: string) {
  try {
    const sql = getSql();
    const [item] = await sql`
      SELECT id, title, state, next_action, decision
      FROM carry_cases
      WHERE id = ${caseId}::uuid AND owner_key = ${ownerKey}
      LIMIT 1
    `;
    if (!item || item.state !== 'needs_user') return;

    const devices = await sql`
      SELECT expo_push_token
      FROM carry_push_devices
      WHERE owner_key = ${ownerKey} AND enabled = true
      ORDER BY last_seen_at DESC
      LIMIT 10
    `;
    if (devices.length === 0) return;

    const decision = item.decision && typeof item.decision === 'object'
      ? item.decision as Record<string, unknown>
      : null;
    const label = typeof decision?.label === 'string' && decision.label.trim()
      ? decision.label.trim()
      : String(item.next_action ?? 'Carry needs one thing from you.');

    const messages = devices.map((device) => ({
      to: String(device.expo_push_token),
      title: `${item.title} needs you`,
      body: label,
      sound: 'default',
      data: { url: `/cases/${item.id}`, caseId: String(item.id) },
      priority: 'high',
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.warn('carry_push_failed', { caseId, status: response.status, body: (await response.text()).slice(0, 500) });
    }
  } catch (error) {
    // Notifications are a convenience layer. Never fail or roll back case progress because push is unavailable.
    console.warn('carry_push_error', { caseId, error });
  }
}
