CREATE TYPE carry_run_status AS ENUM ('running', 'completed', 'needs_user', 'waiting', 'failed');
CREATE TYPE carry_action_status AS ENUM ('proposed', 'running', 'completed', 'blocked', 'failed');
CREATE TYPE carry_policy_mode AS ENUM ('auto', 'ask', 'never');

CREATE TABLE carry_case_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES carry_cases(id) ON DELETE CASCADE,
  owner_key text NOT NULL DEFAULT 'alpha-local',
  trigger text NOT NULL DEFAULT 'user',
  status carry_run_status NOT NULL DEFAULT 'running',
  max_steps integer NOT NULL DEFAULT 3 CHECK (max_steps BETWEEN 1 AND 6),
  steps_taken integer NOT NULL DEFAULT 0 CHECK (steps_taken >= 0),
  stop_reason text,
  model text,
  usage jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX carry_case_runs_case_started_idx ON carry_case_runs (case_id, started_at DESC);
CREATE INDEX carry_case_runs_owner_status_idx ON carry_case_runs (owner_key, status, started_at DESC);

CREATE TABLE carry_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES carry_cases(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES carry_case_runs(id) ON DELETE CASCADE,
  sequence integer NOT NULL CHECK (sequence > 0),
  type text NOT NULL,
  status carry_action_status NOT NULL DEFAULT 'proposed',
  consequence text NOT NULL DEFAULT 'internal',
  requires_approval boolean NOT NULL DEFAULT false,
  summary text NOT NULL,
  rationale text,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  UNIQUE (run_id, sequence)
);
CREATE INDEX carry_actions_case_created_idx ON carry_actions (case_id, created_at DESC);
CREATE INDEX carry_actions_run_sequence_idx ON carry_actions (run_id, sequence ASC);

CREATE TABLE carry_policy_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key text NOT NULL DEFAULT 'alpha-local',
  action_type text NOT NULL,
  mode carry_policy_mode NOT NULL,
  constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_key, action_type)
);
CREATE INDEX carry_policy_rules_owner_idx ON carry_policy_rules (owner_key);
