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

export interface CarrySource { title?: string; url: string }

export interface CarryWork {
  status: 'running' | 'completed' | 'needs_user' | 'waiting' | 'failed';
  stepsTaken: number;
  maxSteps: number;
  stopReason?: string;
  latestAction?: {
    type: string;
    status: string;
    summary: string;
    sources: CarrySource[];
  };
}

export interface CarryCase {
  id: string;
  title: string;
  outcome: string;
  summary: string;
  state: CaseState;
  domain: CaseDomain;
  space: string;
  nextAction?: string;
  decisionLabel?: string;
  plan: PlanStep[];
  work?: CarryWork;
  activity: CaseEvent[];
}
