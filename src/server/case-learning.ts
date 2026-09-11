import { getSql } from './db.js';

export type CarryFeedbackRating = 'good' | 'mostly' | 'missed';

export interface CarryLearningSignal {
  domain: string;
  title: string;
  rating: CarryFeedbackRating;
  note: string | null;
}

export async function getOwnerLearningSignals(ownerKey: string, excludeCaseId?: string, limit = 8): Promise<CarryLearningSignal[]> {
  const sql = getSql();
  const rows = excludeCaseId
    ? await sql`
        SELECT c.domain, c.title, e.payload
        FROM carry_case_events e
        JOIN carry_cases c ON c.id = e.case_id
        WHERE c.owner_key = ${ownerKey}
          AND e.type = 'case_feedback'
          AND c.id <> ${excludeCaseId}::uuid
        ORDER BY e.created_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT c.domain, c.title, e.payload
        FROM carry_case_events e
        JOIN carry_cases c ON c.id = e.case_id
        WHERE c.owner_key = ${ownerKey}
          AND e.type = 'case_feedback'
        ORDER BY e.created_at DESC
        LIMIT ${limit}
      `;

  return rows.flatMap((row) => {
    const payload = row.payload && typeof row.payload === 'object' ? row.payload as Record<string, unknown> : {};
    const rating = payload.rating;
    if (rating !== 'good' && rating !== 'mostly' && rating !== 'missed') return [];
    const note = typeof payload.note === 'string' && payload.note.trim() ? payload.note.trim().slice(0, 600) : null;
    return [{
      domain: String(row.domain ?? 'other'),
      title: String(row.title ?? 'Case'),
      rating,
      note,
    }];
  });
}

export function formatLearningSignals(signals: CarryLearningSignal[]) {
  return signals
    .filter((signal) => signal.note || signal.rating !== 'good')
    .slice(0, 8)
    .map((signal) => {
      const detail = signal.note ? ` — ${signal.note}` : '';
      return `[${signal.domain}] ${signal.rating}: ${signal.title}${detail}`;
    });
}
