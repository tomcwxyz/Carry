-- Carry Alpha 1 case engine
CREATE TYPE carry_case_state AS ENUM ('needs_user', 'carrying', 'waiting', 'done');
CREATE TYPE carry_case_domain AS ENUM ('personal', 'household', 'family', 'admin', 'purchase', 'travel', 'work', 'code', 'other');
CREATE TYPE carry_capture_kind AS ENUM ('text', 'voice', 'photo', 'share');
CREATE TYPE carry_capture_status AS ENUM ('received', 'transcribed', 'understood', 'failed');

CREATE TABLE carry_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_key text NOT NULL DEFAULT 'alpha-local', space_key text NOT NULL DEFAULT 'personal',
  title text NOT NULL, outcome text NOT NULL, summary text NOT NULL, state carry_case_state NOT NULL DEFAULT 'carrying', domain carry_case_domain NOT NULL DEFAULT 'other',
  source_text text, next_action text, decision jsonb, waiting jsonb, plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE INDEX carry_cases_owner_state_updated_idx ON carry_cases (owner_key, state, updated_at DESC);
CREATE INDEX carry_cases_space_updated_idx ON carry_cases (space_key, updated_at DESC);

CREATE TABLE carry_case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid NOT NULL REFERENCES carry_cases(id) ON DELETE CASCADE,
  type text NOT NULL, actor text NOT NULL CHECK (actor IN ('you', 'carry', 'external')), label text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX carry_case_events_case_created_idx ON carry_case_events (case_id, created_at ASC);

CREATE TABLE carry_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_key text NOT NULL DEFAULT 'alpha-local', kind carry_capture_kind NOT NULL,
  status carry_capture_status NOT NULL DEFAULT 'received', raw_text text, transcript text, media_type text,
  case_id uuid REFERENCES carry_cases(id) ON DELETE SET NULL, error_code text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX carry_captures_owner_created_idx ON carry_captures (owner_key, created_at DESC);
