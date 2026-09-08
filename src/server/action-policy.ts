export type ActionType = 'research_web' | 'draft_message' | 'send_message' | 'book_service' | 'spend_money' | 'publish' | 'delete_data';
export type PolicyDecision = { mode: 'auto' | 'ask' | 'never'; consequence: 'internal' | 'external' | 'financial' | 'destructive'; reason: string };

const defaults: Record<ActionType, PolicyDecision> = {
  research_web: { mode: 'auto', consequence: 'internal', reason: 'Research changes nothing outside Carry.' },
  draft_message: { mode: 'auto', consequence: 'internal', reason: 'Drafting does not contact anyone.' },
  send_message: { mode: 'ask', consequence: 'external', reason: 'Sending communicates externally.' },
  book_service: { mode: 'ask', consequence: 'external', reason: 'Booking creates an external commitment.' },
  spend_money: { mode: 'ask', consequence: 'financial', reason: 'Spending requires explicit approval.' },
  publish: { mode: 'ask', consequence: 'external', reason: 'Publishing makes information public.' },
  delete_data: { mode: 'never', consequence: 'destructive', reason: 'Destructive actions are disabled in Alpha 2.' },
};

export function defaultPolicy(actionType: ActionType): PolicyDecision {
  return defaults[actionType];
}
