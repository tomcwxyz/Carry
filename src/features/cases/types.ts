export type CaseState = 'needs_user' | 'carrying' | 'waiting' | 'done';

export type CaseDomain =
  | 'personal'
  | 'household'
  | 'family'
  | 'admin'
  | 'purchase'
  | 'travel'
  | 'work'
  | 'code'
  | 'other';

export type PlanStepState = 'done' | 'active' | 'todo';

export interface PlanStep {
  id: string;
  label: string;
  state: PlanStepState;
}

export interface CaseEvent {
  id: string;
  at: string;
  actor: 'you' | 'carry' | 'external';
  label: string;
}

export interface EvidenceSource {
  url: string;
  title?: string;
}

export type ContactKind = 'phone' | 'email' | 'website' | 'contact_form';

export interface ResultContact {
  kind: ContactKind;
  label: string;
  value: string;
  sourceUrl: string;
}

export interface ResultOption {
  name: string;
  summary: string;
  reason?: string | null;
  recommended: boolean;
  location?: string | null;
  contacts: ResultContact[];
}

export interface PreparedAction {
  label: string;
  subject?: string | null;
  body: string;
}

export interface CaseEvidence {
  id: string;
  kind: 'summary' | 'shortlist' | 'comparison' | 'answer';
  title: string;
  body: string;
  options: ResultOption[];
  preparedAction?: PreparedAction | null;
  sources: EvidenceSource[];
}

export interface CaseDecisionInput {
  kind: 'text' | 'location';
  askRadius: boolean;
}

export interface CarryLocationResponse {
  source: 'device' | 'pin';
  latitude: number;
  longitude: number;
  accuracyMetres?: number;
  label?: string;
  radiusMiles?: number;
}

export type CarryCaseResponse =
  | { text: string }
  | { text?: string; location: CarryLocationResponse };

export type CaseFeedbackRating = 'good' | 'mostly' | 'missed';

export interface CaseFeedback {
  rating: CaseFeedbackRating;
  note?: string;
}

export interface CarryCase {
  id: string;
  title: string;
  outcome: string;
  summary: string;
  state: CaseState;
  domain: CaseDomain;
  space: string;
  sourceText?: string;
  nextAction?: string;
  decisionLabel?: string;
  decisionInput?: CaseDecisionInput;
  plan: PlanStep[];
  activity: CaseEvent[];
  evidence: CaseEvidence[];
  feedback?: CaseFeedback;
}
